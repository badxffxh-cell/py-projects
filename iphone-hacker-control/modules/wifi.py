"""
wifi.py — Wi-Fi (network) connectivity for Apple devices.

How wireless works with pymobiledevice3 / usbmuxd:
  1. Pair the device once over USB (trust the computer).
  2. Enable "Wi-Fi sync" so usbmuxd advertises the device over the network
     (Bonjour). Controlled by lockdown EnableWifiConnections.
  3. After that, list_devices() includes a Network entry and the same
     lockdown/diagnostics calls work wirelessly.

We expose:
  * status()            -> network devices currently visible to usbmuxd
  * enable_wifi_sync()  -> turn on wireless connectivity (requires USB + trust)
  * connection_quality()-> measured lockdown round-trip latency (real metric)

"Quality" is a measured round-trip time, which is an honest proxy for link
responsiveness — not an invented signal-bar reading.
"""

from __future__ import annotations

import statistics
import time
from typing import Optional

from . import core
from .core import Result
from .logging_setup import get_logger

log = get_logger("wifi")


def status() -> Result:
    """List devices usbmuxd currently sees over the network."""
    try:
        devices = core.list_devices()
    except core.BackendError as exc:
        return core.describe_exception(exc)
    except Exception as exc:
        return core.describe_exception(exc)

    net = [d for d in devices if d.is_network]
    data = {
        "network_count": len(net),
        "devices": [
            {"serial": d.serial, "connection": d.connection_type} for d in net
        ],
        "note": (
            "Um dispositivo aparece aqui apenas após o pareamento USB e a "
            "ativação do sync por Wi-Fi."
        ),
    }
    return Result.success(data, network_count=len(net))


def enable_wifi_sync(serial: Optional[str] = None, enable: bool = True) -> Result:
    """Enable/disable wireless connections for a USB-paired device."""

    async def _op() -> Result:
        try:
            client = await core.aopen_lockdown(serial=serial)
        except core.BackendError as exc:
            return core.describe_exception(exc)
        try:
            if hasattr(client, "set_enable_wifi_connections"):
                await client.set_enable_wifi_connections(enable)
            else:  # pragma: no cover - depends on library version
                await client.set_value(
                    enable,
                    "com.apple.mobile.wireless_lockdown",
                    "EnableWifiConnections",
                )
        except Exception as exc:
            log.exception("enable_wifi_sync failed")
            return core.describe_exception(exc)
        finally:
            try:
                await client.close()
            except Exception:
                pass
        state = "ativado" if enable else "desativado"
        return Result.success(
            f"Sync por Wi-Fi {state}. O dispositivo pode levar um momento para "
            "anunciar-se na rede local."
        )

    try:
        return core.run_sync(_op())
    except core.BackendUnavailable as exc:
        return core.describe_exception(exc)


def connection_quality(serial: Optional[str] = None, samples: int = 5) -> Result:
    """Measure lockdown round-trip latency as an honest link-quality metric."""

    async def _op() -> Result:
        try:
            client = await core.aopen_lockdown(serial=serial)
        except core.BackendError as exc:
            return core.describe_exception(exc)
        timings: list[float] = []
        try:
            for _ in range(max(1, samples)):
                t0 = time.perf_counter()
                try:
                    await client.get_value(None, "DeviceName")
                except Exception as exc:
                    return core.describe_exception(exc)
                timings.append((time.perf_counter() - t0) * 1000.0)
        finally:
            try:
                await client.close()
            except Exception:
                pass

        avg = statistics.mean(timings)
        if avg < 15:
            label = "excelente"
        elif avg < 40:
            label = "boa"
        elif avg < 120:
            label = "razoável"
        else:
            label = "ruim"
        return Result.success(
            {
                "samples": timings,
                "avg_ms": round(avg, 1),
                "min_ms": round(min(timings), 1),
                "max_ms": round(max(timings), 1),
                "quality": label,
            }
        )

    try:
        return core.run_sync(_op())
    except core.BackendUnavailable as exc:
        return core.describe_exception(exc)
