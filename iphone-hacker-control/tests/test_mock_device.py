"""
Device-PRESENT path tests using injected async mock backends.

Without a real iPhone, these mocks stand in for a device's RESPONSES at the
pymobiledevice3 boundary so the real formatting, snapshot, screenshot and
mirror logic actually executes. `monkeypatch` restores the patched attributes
after each test, so these do not affect the device-free tests.

They also simulate an iOS 27 / unmapped iPhone-class identifier to prove the
app reports the device's actual version and never fabricates a marketing name.
These validate OUR handling of device responses; they are not a claim that a
specific iOS version was exercised on real hardware.
"""

from __future__ import annotations

import os
import sys
import time

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 1x1 PNG used as a stand-in screen frame.
_PNG_1x1 = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108020000009077"
    "53de0000000c49444154789c6360000002000154a24f630000000049454e44ae426082"
)

_SIM_VALUES = {
    (None, "ProductType"): "iPhone18,2",   # intentionally unmapped (future device)
    (None, "ProductVersion"): "27.0",       # simulated newer iOS
    (None, "BuildVersion"): "25A5000x",
    (None, "DeviceName"): "Owner iPhone",
    (None, "ModelNumber"): "MXZZ3",
    (None, "HardwareModel"): "D94AP",
    (None, "SerialNumber"): "FAKESERIAL123",
    (None, "UniqueDeviceID"): "00008140-FAKEUDIDFORTESTONLY",
    (None, "CPUArchitecture"): "arm64e",
    (None, "WiFiAddress"): "aa:bb:cc:dd:ee:ff",
    (None, "BluetoothAddress"): "aa:bb:cc:dd:ee:00",
    (None, "EthernetAddress"): None,
}
_SIM_DISK = {
    "TotalDiskCapacity": 512_000_000_000,
    "TotalDataCapacity": 500_000_000_000,
    "TotalDataAvailable": 300_000_000_000,
}


class _FakeMux:
    serial = "FAKEUDID"
    connection_type = "USB"
    devid = 1


class _FakeLockdown:
    identifier = "00008140-FAKEUDIDFORTESTONLY"

    async def get_value(self, domain=None, key=None):
        if domain == "com.apple.disk_usage":
            return dict(_SIM_DISK)
        return _SIM_VALUES.get((domain, key))

    async def set_enable_wifi_connections(self, enable):
        return True

    async def close(self):
        return None


class _FakeDiagnostics:
    restarted = False

    def __init__(self, lockdown, *a, **k):
        self._lk = lockdown

    async def connect(self):
        return None

    async def get_battery(self):
        return {"CurrentCapacity": 82, "IsCharging": True,
                "ExternalConnected": True, "FullyCharged": False,
                "CycleCount": 137, "DesignCapacity": 4685}

    async def get_wifi(self):
        return {"enabled": True}

    async def restart(self):
        _FakeDiagnostics.restarted = True
        return None

    async def close(self):
        return None


class _FakeScreenshot:
    def __init__(self, lockdown, *a, **k):
        self._lk = lockdown

    async def connect(self):
        return None

    async def take_screenshot(self):
        return _PNG_1x1

    async def close(self):
        return None


@pytest.fixture
def mocked_device(monkeypatch):
    """Patch the pymobiledevice3 boundary with async fakes (auto-restored)."""
    import pymobiledevice3.lockdown as lockdown_mod
    import pymobiledevice3.services.diagnostics as diag_pmd
    import pymobiledevice3.services.screenshot as ss_pmd
    import pymobiledevice3.usbmux as usbmux_mod

    async def fake_list_devices(*a, **k):
        return [_FakeMux()]

    async def fake_create(*a, **k):
        return _FakeLockdown()

    monkeypatch.setattr(usbmux_mod, "list_devices", fake_list_devices)
    monkeypatch.setattr(lockdown_mod, "create_using_usbmux", fake_create)
    monkeypatch.setattr(diag_pmd, "DiagnosticsService", _FakeDiagnostics)
    monkeypatch.setattr(ss_pmd, "ScreenshotService", _FakeScreenshot)
    _FakeDiagnostics.restarted = False
    yield


# -- device info / formatting -----------------------------------------------

def test_detect_finds_mock_device(mocked_device):
    from modules.device import DeviceManager
    r = DeviceManager().detect()
    assert r.ok and r.meta.get("count") == 1


def test_info_reports_actual_ios_version(mocked_device):
    from modules.device import DeviceManager
    r = DeviceManager().info()
    assert r.ok
    assert r.data["ProductVersion"] == "27.0"
    assert r.data["ProductType"] == "iPhone18,2"


def test_unmapped_identifier_not_fabricated(mocked_device):
    """iOS 27 / future device: marketing name must be None, not invented."""
    from modules.device import DeviceManager
    r = DeviceManager().info()
    assert r.data["MarketingName"] is None


def test_battery_formatting(mocked_device):
    from modules.device import DeviceManager
    r = DeviceManager().battery()
    assert r.ok and r.data["CurrentCapacity"] == 82 and r.data["IsCharging"] is True


def test_storage_math_and_units(mocked_device):
    from modules.device import DeviceManager
    r = DeviceManager().storage()
    assert r.ok
    assert r.data["UsedApprox"] == 200_000_000_000
    assert "GB" in r.data["human"]["total"]


def test_network_wifi_mac(mocked_device):
    from modules.device import DeviceManager
    r = DeviceManager().network()
    assert r.ok and r.data["WiFiAddress"] == "aa:bb:cc:dd:ee:ff"


def test_snapshot_single_connection(mocked_device):
    from modules.device import DeviceManager
    r = DeviceManager().snapshot()
    assert r.ok
    assert r.data["info"]["ProductVersion"] == "27.0"
    assert r.data["battery"]["CurrentCapacity"] == 82
    assert r.data["storage"]["total"].endswith("GB")


# -- terminal rendering of a simulated iOS 27 device ------------------------

def test_terminal_device_info_ios27(mocked_device):
    from modules.device import DeviceManager
    from modules.terminal import TerminalEngine
    out = TerminalEngine(DeviceManager()).execute("device info").text
    assert "27.0" in out
    assert "iPhone18,2" in out
    assert "(não mapeado)" in out  # marketing not invented


def test_reboot_confirmed_calls_restart(mocked_device):
    from modules.device import DeviceManager
    from modules.terminal import TerminalEngine
    r = TerminalEngine(DeviceManager()).execute("device reboot --yes")
    assert r.ok and _FakeDiagnostics.restarted is True


# -- screenshot -------------------------------------------------------------

def test_screenshot_returns_png(mocked_device):
    from modules import screenshot as s
    r = s.capture_bytes()
    assert r.ok and r.data[:8] == _PNG_1x1[:8]


def test_screenshot_to_file(mocked_device, tmp_path):
    from modules import screenshot as s
    r = s.capture_to_file(path=str(tmp_path / "shot.png"))
    assert r.ok and r.data.endswith("shot.png")
    assert (tmp_path / "shot.png").read_bytes()[:8] == _PNG_1x1[:8]


# -- mirror + mouse control honesty -----------------------------------------

def test_mirror_streams_frames_and_stops(mocked_device):
    from modules.mirror import MirrorController
    frames = []
    mc = MirrorController()
    start = mc.start(on_frame=lambda b: frames.append(b), fps=5.0)
    assert start.ok and len(frames) >= 1  # probe frame
    time.sleep(1.0)
    stop = mc.stop()
    assert stop.ok and not mc.is_running
    assert len(frames) >= 2  # polled additional frames


def test_mirror_input_honestly_unavailable(mocked_device):
    from modules.mirror import MirrorController
    r = MirrorController().send_input(x=10, y=20)
    assert not r.ok
    assert r.error_type == "InputNotSupported"
    assert "WebDriverAgent" in (r.hint or "")
