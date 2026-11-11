"""
usb.py — USB connection status and pairing/trust checks for Apple devices.

Reports what usbmuxd actually sees. On Windows, usbmuxd is provided by the
Apple Mobile Device Service (installed with iTunes / the Apple Devices app).
"""

from __future__ import annotations

from typing import Optional

from . import core
from .core import Result
from .logging_setup import get_logger

log = get_logger("usb")


def status() -> Result:
    """Return USB-connected Apple devices and the usbmux service state."""
    try:
        devices = core.list_devices()
    except core.BackendError as exc:
        return core.describe_exception(exc)
    except Exception as exc:
        return core.describe_exception(exc)

    usb_devices = [d for d in devices if d.is_usb]
    data = {
        "usbmux_reachable": True,
        "usb_count": len(usb_devices),
        "devices": [
            {"serial": d.serial, "connection": d.connection_type, "devid": d.devid}
            for d in usb_devices
        ],
    }
    return Result.success(data, usb_count=len(usb_devices))


def pairing_status(serial: Optional[str] = None) -> Result:
    """Check whether the host is paired/trusted with the device."""

    async def _op() -> Result:
        try:
            client = await core.aopen_lockdown(serial=serial, autopair=False)
        except core.NoDeviceError as exc:
            return core.describe_exception(exc)
        except Exception as exc:
            res = core.describe_exception(exc)
            res.data = {"paired": False}
            return res
        try:
            name = await client.get_value(None, "DeviceName")
            return Result.success({"paired": True, "DeviceName": name})
        except Exception as exc:
            res = core.describe_exception(exc)
            res.data = {"paired": False}
            return res
        finally:
            try:
                await client.close()
            except Exception:
                pass

    try:
        return core.run_sync(_op())
    except core.BackendUnavailable as exc:
        return core.describe_exception(exc)
