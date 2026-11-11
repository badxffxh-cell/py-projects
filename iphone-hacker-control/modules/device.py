"""
device.py — DeviceManager: the high-level interface to a connected iPhone.

All public methods are synchronous and return a `core.Result`; internally each
opens an async lockdown connection, performs the real queries, and closes it
(pymobiledevice3 v11 connections are event-loop bound, so they are not cached
across calls — only the selected serial is remembered).

Nothing is fabricated: unavailable values are reported as such.
"""

from __future__ import annotations

import threading
import time
from typing import Any, Awaitable, Callable, Optional

from . import core
from .core import Result
from .logging_setup import get_logger

log = get_logger("device")

# Best-effort marketing-name map. Only well-known identifiers are included; an
# unknown ProductType falls back to the raw identifier + the device's own name,
# so we never show a wrong/fabricated marketing name.
_MARKETING_NAMES = {
    "iPhone14,2": "iPhone 13 Pro",
    "iPhone14,3": "iPhone 13 Pro Max",
    "iPhone15,2": "iPhone 14 Pro",
    "iPhone15,3": "iPhone 14 Pro Max",
    "iPhone16,1": "iPhone 15 Pro",
    "iPhone16,2": "iPhone 15 Pro Max",
    "iPhone17,1": "iPhone 16 Pro",
    "iPhone17,2": "iPhone 16 Pro Max",
    # iPhone 17 family identifiers are intentionally NOT hard-coded: the mapping
    # for a device we cannot test against must not be guessed. The raw
    # ProductType and the device's self-reported name are shown instead.
}


def _fmt_bytes(n: Optional[int]) -> str:
    if n is None:
        return "n/a"
    try:
        n = float(n)
    except (TypeError, ValueError):
        return "n/a"
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if abs(n) < 1024.0:
            return f"{n:3.1f} {unit}"
        n /= 1024.0
    return f"{n:.1f} PB"


async def _safe_get(client, domain: Optional[str] = None, key: Optional[str] = None):
    """Await client.get_value(domain, key), returning None on absence/error."""
    try:
        return await client.get_value(domain, key)
    except Exception as exc:  # value may not exist on this iOS version
        log.debug("get_value(%s,%s) failed: %s", domain, key, exc)
        return None


class DeviceManager:
    """Owns the selected serial and exposes high-level queries."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._serial: Optional[str] = None
        self._connected_at: Optional[float] = None
        self._last_name: Optional[str] = None

    # -- state ---------------------------------------------------------------

    @property
    def is_connected(self) -> bool:
        return self._serial is not None

    @property
    def serial(self) -> Optional[str]:
        return self._serial

    @property
    def device_name(self) -> Optional[str]:
        return self._last_name

    @property
    def uptime_seconds(self) -> Optional[float]:
        if self._connected_at is None:
            return None
        return time.time() - self._connected_at

    # -- async op runner -----------------------------------------------------

    def _run(self, aop: Callable[[Any], Awaitable[Result]], serial: Optional[str] = None) -> Result:
        """Open a connection, run an async op that takes the client, close."""
        target = serial if serial is not None else self._serial

        async def _driver() -> Result:
            try:
                client = await core.aopen_lockdown(serial=target)
            except core.BackendError as exc:
                return core.describe_exception(exc)
            except Exception as exc:
                log.exception("connection failed")
                return core.describe_exception(exc)
            try:
                return await aop(client)
            except Exception as exc:
                log.exception("device op failed")
                return core.describe_exception(exc)
            finally:
                try:
                    await client.close()
                except Exception:
                    pass

        with self._lock:
            return core.run_sync(_driver())

    # -- connection lifecycle ------------------------------------------------

    def detect(self) -> Result:
        try:
            devices = core.list_devices()
        except core.BackendError as exc:
            return core.describe_exception(exc)
        except Exception as exc:
            return core.describe_exception(exc)
        return Result.success([d.__dict__ for d in devices], count=len(devices))

    def connect(self, serial: Optional[str] = None) -> Result:
        async def _op(client) -> Result:
            name = await _safe_get(client, key="DeviceName")
            ident = getattr(client, "identifier", None)
            return Result.success({"serial": ident, "name": name}, name=name,
                                  serial=ident)

        res = self._run(_op, serial=serial)
        if res.ok:
            with self._lock:
                self._serial = res.meta.get("serial") or serial
                self._last_name = res.meta.get("name")
                self._connected_at = time.time()
            log.info("connected to %s (%s)", self._last_name, self._serial)
        return res

    def disconnect(self) -> Result:
        with self._lock:
            self._serial = None
            self._connected_at = None
            self._last_name = None
        return Result.success("disconnected")

    # -- queries -------------------------------------------------------------

    def info(self) -> Result:
        async def _op(client) -> Result:
            product_type = await _safe_get(client, key="ProductType")
            data = {
                "DeviceName": await _safe_get(client, key="DeviceName"),
                "ProductType": product_type,
                "MarketingName": _MARKETING_NAMES.get(product_type or ""),
                "ProductVersion": await _safe_get(client, key="ProductVersion"),
                "BuildVersion": await _safe_get(client, key="BuildVersion"),
                "ModelNumber": await _safe_get(client, key="ModelNumber"),
                "HardwareModel": await _safe_get(client, key="HardwareModel"),
                "SerialNumber": await _safe_get(client, key="SerialNumber"),
                "UniqueDeviceID": await _safe_get(client, key="UniqueDeviceID"),
                "CPUArchitecture": await _safe_get(client, key="CPUArchitecture"),
                "DeviceColor": await _safe_get(client, key="DeviceColor"),
                "TimeZone": await _safe_get(client, key="TimeZone"),
            }
            return Result.success(data)

        return self._run(_op)

    def battery(self) -> Result:
        async def _op(client) -> Result:
            from pymobiledevice3.services.diagnostics import DiagnosticsService

            svc = DiagnosticsService(client)
            if hasattr(svc, "connect"):
                await svc.connect()
            try:
                raw = await svc.get_battery() or {}
            finally:
                try:
                    await svc.close()
                except Exception:
                    pass
            data = {
                "CurrentCapacity": raw.get("CurrentCapacity"),
                "FullyCharged": raw.get("FullyCharged"),
                "IsCharging": raw.get("IsCharging"),
                "ExternalConnected": raw.get("ExternalConnected"),
                "CycleCount": raw.get("CycleCount"),
                "DesignCapacity": raw.get("DesignCapacity"),
                "Temperature": raw.get("Temperature"),
                "raw": raw,
            }
            return Result.success(data)

        return self._run(_op)

    def storage(self) -> Result:
        async def _op(client) -> Result:
            usage = await _safe_get(client, domain="com.apple.disk_usage") or {}
            if not usage:
                return Result.failure(
                    "Informações de armazenamento não expostas por este "
                    "dispositivo/versão do iOS.",
                    error_type="NoData",
                )
            total = usage.get("TotalDiskCapacity")
            data_avail = usage.get("TotalDataAvailable")
            data_total = usage.get("TotalDataCapacity")
            used = None
            if data_total is not None and data_avail is not None:
                used = data_total - data_avail
            data = {
                "TotalDiskCapacity": total,
                "TotalDataCapacity": data_total,
                "TotalDataAvailable": data_avail,
                "UsedApprox": used,
                "human": {
                    "total": _fmt_bytes(total),
                    "data_total": _fmt_bytes(data_total),
                    "available": _fmt_bytes(data_avail),
                    "used": _fmt_bytes(used),
                },
                "raw": usage,
            }
            return Result.success(data)

        return self._run(_op)

    def network(self) -> Result:
        async def _op(client) -> Result:
            wifi_mac = await _safe_get(client, key="WiFiAddress")
            bt_mac = await _safe_get(client, key="BluetoothAddress")
            eth_mac = await _safe_get(client, key="EthernetAddress")
            wifi_info = None
            try:
                from pymobiledevice3.services.diagnostics import DiagnosticsService

                svc = DiagnosticsService(client)
                if hasattr(svc, "connect"):
                    await svc.connect()
                try:
                    wifi_info = await svc.get_wifi()
                finally:
                    try:
                        await svc.close()
                    except Exception:
                        pass
            except Exception as exc:
                log.debug("get_wifi failed: %s", exc)
            data = {
                "WiFiAddress": wifi_mac,
                "BluetoothAddress": bt_mac,
                "EthernetAddress": eth_mac,
                "WiFiInfo": wifi_info,
                "IPAddressNote": (
                    "O endereço IP não é exposto pelo canal USB/lockdown; "
                    "use o painel Wi-Fi para descoberta na rede."
                ),
            }
            return Result.success(data)

        return self._run(_op)

    def reboot(self) -> Result:
        async def _op(client) -> Result:
            from pymobiledevice3.services.diagnostics import DiagnosticsService

            svc = DiagnosticsService(client)
            if hasattr(svc, "connect"):
                await svc.connect()
            await svc.restart()
            return Result.success(
                "Comando de reinício enviado. O dispositivo está reiniciando."
            )

        res = self._run(_op)
        if res.ok:
            self.disconnect()  # connection is lost after reboot
        return res

    def snapshot(self) -> Result:
        """Fetch identity + battery + storage + network in ONE connection.

        Used by the dashboard for an efficient periodic refresh.
        """
        async def _op(client) -> Result:
            out: dict = {}
            product_type = await _safe_get(client, key="ProductType")
            out["info"] = {
                "DeviceName": await _safe_get(client, key="DeviceName"),
                "ProductType": product_type,
                "MarketingName": _MARKETING_NAMES.get(product_type or ""),
                "ProductVersion": await _safe_get(client, key="ProductVersion"),
                "BuildVersion": await _safe_get(client, key="BuildVersion"),
                "UniqueDeviceID": await _safe_get(client, key="UniqueDeviceID"),
            }
            # battery
            try:
                from pymobiledevice3.services.diagnostics import DiagnosticsService

                svc = DiagnosticsService(client)
                if hasattr(svc, "connect"):
                    await svc.connect()
                try:
                    bat = await svc.get_battery() or {}
                finally:
                    try:
                        await svc.close()
                    except Exception:
                        pass
                out["battery"] = {
                    "CurrentCapacity": bat.get("CurrentCapacity"),
                    "IsCharging": bat.get("IsCharging"),
                    "ExternalConnected": bat.get("ExternalConnected"),
                }
            except Exception as exc:
                out["battery"] = {"error": str(exc)}
            # storage
            usage = await _safe_get(client, domain="com.apple.disk_usage") or {}
            if usage:
                total = usage.get("TotalDiskCapacity")
                avail = usage.get("TotalDataAvailable")
                out["storage"] = {
                    "total": _fmt_bytes(total),
                    "available": _fmt_bytes(avail),
                }
            else:
                out["storage"] = None
            out["network"] = {"WiFiAddress": await _safe_get(client, key="WiFiAddress")}
            return Result.success(out)

        res = self._run(_op)
        if res.ok:
            with self._lock:
                self._last_name = res.data.get("info", {}).get("DeviceName")
                if self._connected_at is None:
                    self._connected_at = time.time()
                if self._serial is None:
                    self._serial = res.data.get("info", {}).get("UniqueDeviceID")
        return res
