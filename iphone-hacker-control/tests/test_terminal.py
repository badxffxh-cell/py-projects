"""
Tests for the terminal command engine and core backend behavior.

These run headless and WITHOUT a connected device. They verify that:
  * every documented command is routed and produces output;
  * the "no device" state is reported honestly (never fabricated data);
  * the control actions (clear/exit/mirror) are returned correctly;
  * input validation rejects unknown commands without crashing.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules.terminal import TerminalEngine, EngineResponse  # noqa: E402
from modules import core  # noqa: E402


def make_engine() -> TerminalEngine:
    return TerminalEngine()


def test_empty_line_is_noop():
    r = make_engine().execute("")
    assert isinstance(r, EngineResponse)
    assert r.text == ""
    assert r.ok


def test_help_lists_commands():
    r = make_engine().execute("help")
    assert "referência de comandos" in r.text
    # Command tokens stay in English (the defined terminal API).
    for cmd in ("device info", "usb status", "wifi status",
                "mirror start", "system diagnostics"):
        assert cmd in r.text


def test_clear_returns_action():
    r = make_engine().execute("clear")
    assert r.action == "clear"


def test_exit_returns_action():
    r = make_engine().execute("exit")
    assert r.action == "exit"


def test_unknown_command_is_handled():
    r = make_engine().execute("frobnicate")
    assert not r.ok
    assert "comando desconhecido" in r.text.lower()


def test_unknown_subcommand_is_handled():
    r = make_engine().execute("device wibble")
    assert not r.ok
    assert "subcomando 'device' desconhecido" in r.text.lower()


def test_device_list_without_device_is_honest():
    # No device connected in CI: must say so, never invent one.
    r = make_engine().execute("device")
    text = r.text.lower()
    assert ("nenhum dispositivo" in text) or ("erro" in text) \
        or ("não foi possível consultar" in text)
    # Crucially, it must not print a fake iPhone model/serial.
    assert "iphone 17" not in text


def test_mirror_actions():
    assert make_engine().execute("mirror start").action == "mirror_start"
    assert make_engine().execute("mirror stop").action == "mirror_stop"
    assert not make_engine().execute("mirror").ok


def test_reboot_requires_confirmation():
    r = make_engine().execute("device reboot")
    assert "reiniciar o dispositivo" in r.text.lower()
    assert "--yes" in r.text


def test_system_diagnostics_runs_headless():
    r = make_engine().execute("system diagnostics")
    # Host section is always present; mode reflects no-device state.
    assert "Host:" in r.text
    assert "diagnóstico" in r.text.lower()


def test_logs_command():
    r = make_engine().execute("logs")
    assert "Arquivo de log" in r.text


def test_result_helpers():
    ok = core.Result.success({"a": 1}, count=1)
    assert ok.ok and ok.meta["count"] == 1
    bad = core.Result.failure("boom", "X", hint="do this")
    assert not bad.ok and bad.error == "boom" and bad.hint == "do this"


def test_pymobiledevice3_status_never_raises():
    available, version, err = core.pymobiledevice3_status()
    assert isinstance(available, bool)
