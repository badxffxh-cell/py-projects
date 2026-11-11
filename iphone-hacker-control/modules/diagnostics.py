"""
diagnostics.py — Aggregated, host + device diagnostics.

Combines:
  * host environment facts (OS, Python, dependency versions) — always available;
  * device facts (identity, battery, storage, network) — only when connected.

Produces a single structured report used by the `system diagnostics` command
and the dashboard. Missing device data is reported as "not connected", never
invented.
"""

from __future__ import annotations

import platform
import sys
from typing import Optional

from . import core
from .core import Result
from .device import DeviceManager
from .logging_setup import get_logger

log = get_logger("diagnostics")


def host_report() -> dict:
    available, version, err = core.pymobiledevice3_status()
    try:
        import PySide6  # noqa: F401

        pyside = getattr(__import__("PySide6"), "__version__", "present")
    except Exception as exc:
        pyside = f"missing ({type(exc).__name__})"
    return {
        "os": f"{platform.system()} {platform.release()}",
        "os_version": platform.version(),
        "machine": platform.machine(),
        "python": sys.version.split()[0],
        "pymobiledevice3": version if available else f"missing ({err})",
        "PySide6": pyside,
    }


def full_report(device: Optional[DeviceManager] = None) -> Result:
    """Build the full diagnostics report (host always, device if connected)."""
    report: dict = {"host": host_report(), "device": None, "device_error": None}

    dev = device or DeviceManager()
    detect = dev.detect()
    report["detection"] = {
        "ok": detect.ok,
        "count": detect.meta.get("count") if detect.ok else 0,
        "error": None if detect.ok else detect.error,
        "hint": None if detect.ok else detect.hint,
    }

    if not detect.ok or (detect.ok and detect.meta.get("count", 0) == 0):
        # Diagnostic mode: no device. This is a valid, non-error state.
        report["mode"] = "diagnostic (no device connected)"
        return Result.success(report)

    report["mode"] = "connected"
    info = dev.info()
    if info.ok:
        report["device"] = info.data
    else:
        report["device_error"] = {"error": info.error, "hint": info.hint}

    battery = dev.battery()
    report["battery"] = battery.data if battery.ok else {"error": battery.error}

    storage = dev.storage()
    report["storage"] = storage.data if storage.ok else {"error": storage.error}

    network = dev.network()
    report["network"] = network.data if network.ok else {"error": network.error}

    return Result.success(report)
