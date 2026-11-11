"""
Tests for DeviceManager and the backend modules, headless and device-free.

Verifies that, with no device present, every operation returns a well-formed
`Result` (never raises, never fabricates) and that the async driver runs
cleanly without leaking unawaited coroutines.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules import core, diagnostics, screenshot, usb, wifi  # noqa: E402
from modules.device import DeviceManager, _fmt_bytes  # noqa: E402


def test_fmt_bytes():
    assert _fmt_bytes(None) == "n/a"
    assert _fmt_bytes(0).endswith("B")
    assert "GB" in _fmt_bytes(5 * 1024**3)


def test_detect_returns_result():
    r = DeviceManager().detect()
    # Either success with 0 devices, or a structured failure (no usbmuxd).
    assert hasattr(r, "ok")
    if r.ok:
        assert isinstance(r.data, list)
    else:
        assert r.error  # real error text, not hidden


def test_info_without_device_is_structured_failure():
    r = DeviceManager().info()
    assert not r.ok
    assert r.error  # surfaced, not swallowed


def test_battery_without_device():
    r = DeviceManager().battery()
    assert not r.ok


def test_storage_without_device():
    r = DeviceManager().storage()
    assert not r.ok


def test_snapshot_without_device():
    r = DeviceManager().snapshot()
    assert not r.ok


def test_usb_status_structured():
    r = usb.status()
    assert hasattr(r, "ok")


def test_wifi_status_structured():
    r = wifi.status()
    assert hasattr(r, "ok")


def test_screenshot_without_device():
    r = screenshot.capture_bytes()
    assert not r.ok
    assert r.error


def test_diagnostics_host_report_always_available():
    rep = diagnostics.host_report()
    assert "Python" in rep
    assert "SO" in rep


def test_full_report_has_host_and_mode():
    r = diagnostics.full_report()
    assert r.ok
    assert "host" in r.data
    assert "mode" in r.data


def test_describe_exception_adds_hint_for_known_errors():
    class NotPairedError(Exception):
        pass

    res = core.describe_exception(NotPairedError("device is not paired"))
    assert res.hint and "confiar" in res.hint.lower()


def test_run_sync_executes_coroutine():
    async def _co():
        return 42

    assert core.run_sync(_co()) == 42
