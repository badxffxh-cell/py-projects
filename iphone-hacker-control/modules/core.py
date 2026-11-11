"""
core.py — Shared backend layer for IPHONE HACKER CONTROL.

pymobiledevice3 v11 exposes a fully *asynchronous* API (usbmux, lockdown and
every service method are coroutines). Because an open connection is bound to
the event loop that created it, each high-level operation opens its connection,
does its work, and closes it inside a single event-loop run. The synchronous
GUI/terminal layers call these through `run_sync()`.

Design rules honored here:
  * Never fabricate a device or data. If nothing is connected we say so.
  * Never hide errors. Exceptions are logged and returned as structured results.
  * The import of pymobiledevice3 is lazy, so the app still launches (in
    "diagnostic mode") on a machine where the dependency is missing.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, Awaitable, Optional, TypeVar

log = logging.getLogger("ihc.core")

T = TypeVar("T")

# ---------------------------------------------------------------------------
# Lazy dependency detection
# ---------------------------------------------------------------------------

_PMD3_AVAILABLE: Optional[bool] = None
_PMD3_VERSION: Optional[str] = None
_PMD3_IMPORT_ERROR: Optional[str] = None


def pymobiledevice3_status() -> tuple[bool, Optional[str], Optional[str]]:
    """Return (available, version, import_error). Cached; never raises."""
    global _PMD3_AVAILABLE, _PMD3_VERSION, _PMD3_IMPORT_ERROR
    if _PMD3_AVAILABLE is not None:
        return _PMD3_AVAILABLE, _PMD3_VERSION, _PMD3_IMPORT_ERROR
    try:
        import importlib.metadata as md

        import pymobiledevice3  # noqa: F401

        try:
            _PMD3_VERSION = md.version("pymobiledevice3")
        except Exception:  # pragma: no cover
            _PMD3_VERSION = "unknown"
        _PMD3_AVAILABLE = True
        _PMD3_IMPORT_ERROR = None
        log.info("pymobiledevice3 available, version %s", _PMD3_VERSION)
    except Exception as exc:  # pragma: no cover - depends on environment
        _PMD3_AVAILABLE = False
        _PMD3_VERSION = None
        _PMD3_IMPORT_ERROR = f"{type(exc).__name__}: {exc}"
        log.warning("pymobiledevice3 not importable: %s", _PMD3_IMPORT_ERROR)
    return _PMD3_AVAILABLE, _PMD3_VERSION, _PMD3_IMPORT_ERROR


def require_pmd3() -> None:
    available, _version, err = pymobiledevice3_status()
    if not available:
        raise BackendUnavailable(
            "pymobiledevice3 não está instalado ou falhou ao importar. "
            "Execute install.bat (ou: pip install -r requirements.txt). "
            f"Erro de importação: {err}"
        )


# ---------------------------------------------------------------------------
# Error types and result container
# ---------------------------------------------------------------------------


class BackendError(Exception):
    """Base class for backend errors surfaced to the UI."""


class BackendUnavailable(BackendError):
    """pymobiledevice3 (or usbmuxd) is not available."""


class NoDeviceError(BackendError):
    """No Apple device is currently reachable."""


@dataclass
class DeviceRef:
    serial: str
    connection_type: str  # "USB" or "Network"
    devid: Optional[int] = None

    @property
    def is_network(self) -> bool:
        return self.connection_type.lower().startswith("net")

    @property
    def is_usb(self) -> bool:
        return self.connection_type.lower() == "usb"


@dataclass
class Result:
    ok: bool
    data: Any = None
    error: Optional[str] = None
    error_type: Optional[str] = None
    hint: Optional[str] = None
    meta: dict = field(default_factory=dict)

    @classmethod
    def success(cls, data: Any = None, **meta: Any) -> "Result":
        return cls(ok=True, data=data, meta=meta)

    @classmethod
    def failure(
        cls,
        error: str,
        error_type: Optional[str] = None,
        hint: Optional[str] = None,
    ) -> "Result":
        return cls(ok=False, error=error, error_type=error_type, hint=hint)


# ---------------------------------------------------------------------------
# Async driver
# ---------------------------------------------------------------------------


def run_sync(coro: Awaitable[T]) -> T:
    """Run a coroutine to completion on a fresh event loop and clean up.

    Used by the synchronous GUI/terminal layers. Must NOT be called from a
    thread that already has a running event loop (the mirror thread manages its
    own loop explicitly).
    """
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        try:
            pending = asyncio.all_tasks(loop)
            for task in pending:
                task.cancel()
            if pending:
                loop.run_until_complete(
                    asyncio.gather(*pending, return_exceptions=True)
                )
        except Exception:  # pragma: no cover - best effort cleanup
            pass
        try:
            loop.run_until_complete(loop.shutdown_asyncgens())
        except Exception:  # pragma: no cover
            pass
        loop.close()


# ---------------------------------------------------------------------------
# Async device discovery and lockdown connections
# ---------------------------------------------------------------------------


async def alist_devices() -> list[DeviceRef]:
    """Async: list devices known to usbmuxd (USB + network)."""
    require_pmd3()
    from pymobiledevice3 import usbmux

    try:
        raw = await usbmux.list_devices()
    except Exception as exc:
        raise BackendError(
            "Não foi possível consultar o usbmuxd. No Windows, isso geralmente "
            "significa que o Apple Mobile Device Service (instalado com o iTunes "
            "/ app Apple Devices) não está em execução. "
            f"Erro original: {type(exc).__name__}: {exc}"
        ) from exc

    refs: list[DeviceRef] = []
    for dev in raw:
        conn = (getattr(dev, "connection_type", "USB") or "USB")
        conn_norm = "Network" if conn.lower().startswith("net") else "USB"
        refs.append(
            DeviceRef(
                serial=getattr(dev, "serial", ""),
                connection_type=conn_norm,
                devid=getattr(dev, "devid", None),
            )
        )
    # De-duplicate by serial, preferring USB over network.
    best: dict[str, DeviceRef] = {}
    for r in refs:
        if r.serial not in best or (r.is_usb and best[r.serial].is_network):
            best[r.serial] = r
    return list(best.values())


async def aopen_lockdown(serial: Optional[str] = None, autopair: bool = True):
    """Async: open a lockdown client for `serial` (or the first USB device)."""
    require_pmd3()
    from pymobiledevice3.lockdown import create_using_usbmux

    if serial is None:
        devices = await alist_devices()
        if not devices:
            raise NoDeviceError(
                "Nenhum iPhone/iPad detectado. Conecte o dispositivo via USB, "
                "desbloqueie-o e toque em 'Confiar neste computador' quando "
                "solicitado."
            )
        usb_first = [d for d in devices if d.is_usb] or devices
        serial = usb_first[0].serial

    return await create_using_usbmux(serial=serial, autopair=autopair)


# -- synchronous convenience wrappers ---------------------------------------


def list_devices() -> list[DeviceRef]:
    """Sync wrapper over alist_devices()."""
    require_pmd3()
    return run_sync(alist_devices())


def describe_exception(exc: BaseException) -> Result:
    """Translate a pymobiledevice3 exception into a user-facing Result."""
    name = type(exc).__name__
    msg = str(exc) or name
    hint: Optional[str] = None

    lowered = (name + " " + msg).lower()
    if "notpaired" in lowered or "pairing" in lowered or "trust" in lowered:
        hint = (
            "Desbloqueie o iPhone e toque em 'Confiar neste computador', depois "
            "tente de novo. Pode ser necessário parear por USB primeiro."
        )
    elif "passwordrequired" in lowered or "password" in lowered:
        hint = "O dispositivo está bloqueado. Desbloqueie com a senha e tente de novo."
    elif "developermode" in lowered or "developer mode" in lowered:
        hint = (
            "Este serviço exige o Modo de Desenvolvedor. No iOS 16+ ative em "
            "Ajustes > Privacidade e Segurança > Modo de Desenvolvedor."
        )
    elif "connectionfailed" in lowered or "usbmux" in lowered:
        hint = (
            "usbmuxd/Apple Mobile Device Service inacessível. Verifique se o "
            "iTunes ou o app Apple Devices está instalado e com o serviço ativo."
        )
    elif "no device" in lowered or "nodevice" in lowered:
        hint = "Conecte e desbloqueie o dispositivo, depois tente de novo."

    return Result.failure(error=msg, error_type=name, hint=hint)
