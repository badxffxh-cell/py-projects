"""
terminal.py — Command engine for the integrated terminal.

`TerminalEngine.execute(line)` parses a command, performs the REAL action via
the device/usb/wifi/diagnostics modules, and returns an `EngineResponse` with
formatted text plus an optional UI control action (clear/exit/mirror).

This class is deliberately GUI-free so it can be unit-tested headless. The GUI
terminal widget runs it on a worker thread and renders the text.

Input is validated: unknown commands yield a helpful message, never a crash,
and never a fabricated result.
"""

from __future__ import annotations

import shlex
from dataclasses import dataclass
from typing import Optional

from . import diagnostics as diag_mod
from . import screenshot as screenshot_mod
from . import usb as usb_mod
from . import wifi as wifi_mod
from .core import Result
from .device import DeviceManager
from .logging_setup import get_logger, logs_dir

log = get_logger("terminal")

BANNER_NAME = "IPHONE HACKER CONTROL"


@dataclass
class EngineResponse:
    text: str
    ok: bool = True
    action: Optional[str] = None  # "clear" | "exit" | "mirror_start" | "mirror_stop"


def _kv(title: str, pairs: dict) -> str:
    """Render a dict as aligned key/value lines, skipping None nicely."""
    width = max((len(str(k)) for k in pairs), default=0)
    lines = [title] if title else []
    for k, v in pairs.items():
        shown = "n/a" if v is None else v
        lines.append(f"  {str(k).ljust(width)} : {shown}")
    return "\n".join(lines)


def _fmt_result_error(res: Result) -> str:
    out = [f"[ERROR] {res.error_type or 'Error'}: {res.error}"]
    if res.hint:
        out.append(f"[HINT ] {res.hint}")
    return "\n".join(out)


HELP_TEXT = """\
IPHONE HACKER CONTROL — command reference
-----------------------------------------
  help                 Show this help
  clear                Clear the terminal screen
  device               List detected Apple devices
  device info          Model, iOS version, identifiers
  device battery       Battery level and charging state
  device storage       Disk capacity and free space
  device network       Wi-Fi/Bluetooth MAC and link info
  device screenshot    Capture a PNG from the device (if permitted)
  device reboot        Restart the device (owner-authorized)
  usb status           USB connection and usbmux service state
  wifi status          Network-visible devices (needs Wi-Fi sync)
  system diagnostics   Full host + device diagnostic report
  logs                 Show the log file location and last lines
  mirror start         Open the live screen-mirror panel
  mirror stop          Close the screen-mirror panel
  exit                 Quit the application

Notes:
  * Commands act on your own, authorized device only.
  * No lock/Face ID bypass, data extraction, or exploitation is performed.
  * Features needing a device report clearly when none is connected.\
"""


class TerminalEngine:
    def __init__(self, device: Optional[DeviceManager] = None) -> None:
        self.device = device or DeviceManager()

    # -- dispatch ------------------------------------------------------------

    def execute(self, line: str) -> EngineResponse:
        raw = (line or "").strip()
        if not raw:
            return EngineResponse("", ok=True)

        try:
            parts = shlex.split(raw)
        except ValueError as exc:
            return EngineResponse(f"[ERROR] parse error: {exc}", ok=False)

        cmd = parts[0].lower()
        args = parts[1:]

        handler = {
            "help": self._help,
            "?": self._help,
            "clear": self._clear,
            "cls": self._clear,
            "device": self._device,
            "usb": self._usb,
            "wifi": self._wifi,
            "system": self._system,
            "logs": self._logs,
            "mirror": self._mirror,
            "exit": self._exit,
            "quit": self._exit,
        }.get(cmd)

        if handler is None:
            return EngineResponse(
                f"[ERROR] unknown command: {cmd!r}. Type 'help' for the list.",
                ok=False,
            )
        try:
            return handler(args)
        except Exception as exc:  # never hide errors; never crash the terminal
            log.exception("command %r failed", raw)
            return EngineResponse(
                f"[ERROR] {type(exc).__name__}: {exc}", ok=False
            )

    # -- handlers ------------------------------------------------------------

    def _help(self, args) -> EngineResponse:
        return EngineResponse(HELP_TEXT)

    def _clear(self, args) -> EngineResponse:
        return EngineResponse("", action="clear")

    def _exit(self, args) -> EngineResponse:
        return EngineResponse("Shutting down IPHONE HACKER CONTROL...", action="exit")

    def _logs(self, args) -> EngineResponse:
        log_file = logs_dir() / "iphone-hacker-control.log"
        text = [f"Log file: {log_file}"]
        try:
            if log_file.exists():
                lines = log_file.read_text(encoding="utf-8", errors="replace").splitlines()
                tail = lines[-15:]
                text.append("--- last %d lines ---" % len(tail))
                text.extend(tail)
            else:
                text.append("(no log file yet)")
        except Exception as exc:
            text.append(f"[ERROR] could not read log: {exc}")
        return EngineResponse("\n".join(text))

    def _device(self, args) -> EngineResponse:
        sub = args[0].lower() if args else "list"

        if sub in ("list", ""):
            res = self.device.detect()
            if not res.ok:
                return EngineResponse(_fmt_result_error(res), ok=False)
            devices = res.data or []
            if not devices:
                return EngineResponse(
                    "No devices detected. Connect an iPhone over USB, unlock it, "
                    "and tap 'Trust This Computer'."
                )
            lines = [f"Detected {len(devices)} device(s):"]
            for d in devices:
                lines.append(
                    f"  - serial={d.get('serial')} "
                    f"conn={d.get('connection_type')}"
                )
            return EngineResponse("\n".join(lines))

        if sub == "info":
            res = self.device.info()
            if not res.ok:
                return EngineResponse(_fmt_result_error(res), ok=False)
            d = res.data
            name = d.get("MarketingName") or d.get("ProductType") or "iPhone"
            return EngineResponse(_kv(f"Device info ({name}):", {
                "Name": d.get("DeviceName"),
                "Marketing": d.get("MarketingName") or "(not mapped)",
                "ProductType": d.get("ProductType"),
                "iOS version": d.get("ProductVersion"),
                "Build": d.get("BuildVersion"),
                "Model number": d.get("ModelNumber"),
                "Hardware": d.get("HardwareModel"),
                "CPU arch": d.get("CPUArchitecture"),
                "UDID": d.get("UniqueDeviceID"),
            }))

        if sub == "battery":
            res = self.device.battery()
            if not res.ok:
                return EngineResponse(_fmt_result_error(res), ok=False)
            d = res.data
            pct = d.get("CurrentCapacity")
            charging = d.get("IsCharging")
            ext = d.get("ExternalConnected")
            return EngineResponse(_kv("Battery:", {
                "Level": f"{pct}%" if pct is not None else "n/a",
                "Charging": charging,
                "External power": ext,
                "Fully charged": d.get("FullyCharged"),
                "Cycle count": d.get("CycleCount"),
            }))

        if sub == "storage":
            res = self.device.storage()
            if not res.ok:
                return EngineResponse(_fmt_result_error(res), ok=False)
            h = res.data.get("human", {})
            return EngineResponse(_kv("Storage:", {
                "Total": h.get("total"),
                "Data partition": h.get("data_total"),
                "Available": h.get("available"),
                "Used (approx)": h.get("used"),
            }))

        if sub == "network":
            res = self.device.network()
            if not res.ok:
                return EngineResponse(_fmt_result_error(res), ok=False)
            d = res.data
            return EngineResponse(_kv("Network:", {
                "Wi-Fi MAC": d.get("WiFiAddress"),
                "Bluetooth MAC": d.get("BluetoothAddress"),
                "Ethernet MAC": d.get("EthernetAddress"),
                "Note": d.get("IPAddressNote"),
            }))

        if sub == "screenshot":
            res = screenshot_mod.capture_to_file(serial=self.device.serial)
            if not res.ok:
                return EngineResponse(_fmt_result_error(res), ok=False)
            return EngineResponse(
                f"Screenshot saved: {res.data} ({res.meta.get('size')} bytes)"
            )

        if sub == "reboot":
            # Require explicit confirmation token to avoid accidental reboots.
            if not (len(args) > 1 and args[1].lower() in ("--yes", "-y", "confirm")):
                return EngineResponse(
                    "This will RESTART the device. Re-run as:\n"
                    "  device reboot --yes",
                    ok=True,
                )
            res = self.device.reboot()
            if not res.ok:
                return EngineResponse(_fmt_result_error(res), ok=False)
            return EngineResponse(str(res.data))

        return EngineResponse(
            f"[ERROR] unknown 'device' subcommand: {sub!r}. "
            "Try: info | battery | storage | network | screenshot | reboot",
            ok=False,
        )

    def _usb(self, args) -> EngineResponse:
        sub = args[0].lower() if args else "status"
        if sub != "status":
            return EngineResponse(f"[ERROR] try: usb status", ok=False)
        res = usb_mod.status()
        if not res.ok:
            return EngineResponse(_fmt_result_error(res), ok=False)
        d = res.data
        lines = [f"USB status: {d.get('usb_count')} device(s), "
                 f"usbmux reachable={d.get('usbmux_reachable')}"]
        for dev in d.get("devices", []):
            lines.append(f"  - serial={dev.get('serial')} conn={dev.get('connection')}")
        return EngineResponse("\n".join(lines))

    def _wifi(self, args) -> EngineResponse:
        sub = args[0].lower() if args else "status"
        if sub != "status":
            return EngineResponse("[ERROR] try: wifi status", ok=False)
        res = wifi_mod.status()
        if not res.ok:
            return EngineResponse(_fmt_result_error(res), ok=False)
        d = res.data
        lines = [f"Wi-Fi status: {d.get('network_count')} network-visible device(s)"]
        for dev in d.get("devices", []):
            lines.append(f"  - serial={dev.get('serial')} conn={dev.get('connection')}")
        lines.append(f"  note: {d.get('note')}")
        return EngineResponse("\n".join(lines))

    def _system(self, args) -> EngineResponse:
        sub = args[0].lower() if args else ""
        if sub != "diagnostics":
            return EngineResponse("[ERROR] try: system diagnostics", ok=False)
        res = diag_mod.full_report(self.device)
        if not res.ok:
            return EngineResponse(_fmt_result_error(res), ok=False)
        r = res.data
        out = [f"System diagnostics — mode: {r.get('mode')}", ""]
        out.append(_kv("Host:", r.get("host", {})))
        det = r.get("detection", {})
        out.append("")
        out.append(_kv("Detection:", {
            "ok": det.get("ok"),
            "devices": det.get("count"),
            "error": det.get("error"),
        }))
        if r.get("device"):
            d = r["device"]
            out.append("")
            out.append(_kv("Device:", {
                "Name": d.get("DeviceName"),
                "ProductType": d.get("ProductType"),
                "iOS": d.get("ProductVersion"),
                "Build": d.get("BuildVersion"),
            }))
        if r.get("battery") and "error" not in r["battery"]:
            out.append("")
            out.append(_kv("Battery:", {
                "Level": f"{r['battery'].get('CurrentCapacity')}%",
                "Charging": r["battery"].get("IsCharging"),
            }))
        if r.get("storage") and "error" not in r["storage"]:
            h = r["storage"].get("human", {})
            out.append("")
            out.append(_kv("Storage:", {"Total": h.get("total"),
                                        "Available": h.get("available")}))
        return EngineResponse("\n".join(out))

    def _mirror(self, args) -> EngineResponse:
        sub = args[0].lower() if args else ""
        if sub == "start":
            return EngineResponse(
                "Opening screen-mirror panel...", action="mirror_start"
            )
        if sub == "stop":
            return EngineResponse(
                "Closing screen-mirror panel...", action="mirror_stop"
            )
        return EngineResponse("[ERROR] try: mirror start | mirror stop", ok=False)
