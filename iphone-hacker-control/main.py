#!/usr/bin/env python3
"""
IPHONE HACKER CONTROL — application entry point.

Startup sequence:
  1. Matrix boot animation (splash).
  2. Real dependency verification (pymobiledevice3 / PySide6).
  3. Real device detection (usbmux).
  4. Dashboard + interactive terminal.

If no iPhone is connected the app continues in DIAGNOSTIC MODE — it never
invents a device.

Usage:
  python main.py                 launch the GUI
  python main.py --no-splash     skip the boot animation
  python main.py --selftest      run a headless backend self-test and exit
"""

from __future__ import annotations

import sys

from modules.logging_setup import get_logger, setup_logging

log = get_logger("main")


# --------------------------------------------------------------------------
# Headless self-test (no GUI) — useful for CI and quick checks
# --------------------------------------------------------------------------
def selftest() -> int:
    setup_logging(echo=True)
    from modules import core
    from modules.terminal import TerminalEngine

    available, version, err = core.pymobiledevice3_status()
    print(f"pymobiledevice3: {'OK ' + str(version) if available else 'AUSENTE ' + str(err)}")
    engine = TerminalEngine()
    for cmd in ("help", "device", "usb status", "system diagnostics"):
        resp = engine.execute(cmd)
        first = (resp.text.splitlines() or [""])[0]
        print(f"[{cmd}] ok={resp.ok} -> {first[:80]}")
    print("Autoteste concluído.")
    return 0


# --------------------------------------------------------------------------
# Boot splash
# --------------------------------------------------------------------------
def _run_gui(show_splash: bool = True) -> int:
    try:
        from PySide6.QtCore import Qt, QTimer
        from PySide6.QtWidgets import QApplication, QProgressBar, QVBoxLayout, QWidget, QLabel, QPlainTextEdit
    except Exception as exc:  # PySide6 ausente
        print("[FATAL] O PySide6 é necessário para a interface, mas não pôde ser importado.")
        print(f"        {type(exc).__name__}: {exc}")
        print("        Instale com: pip install -r requirements.txt")
        return 2

    from interface import styles
    from interface.main_window import MainWindow
    from interface.matrix_rain import MatrixRainWidget
    from modules import core

    app = QApplication.instance() or QApplication(sys.argv)
    app.setApplicationName("IPHONE HACKER CONTROL")
    app.setStyleSheet(styles.app_stylesheet())

    window_holder: dict = {}

    def launch_main() -> None:
        win = MainWindow()
        window_holder["win"] = win
        win.show()

    if not show_splash:
        launch_main()
        return app.exec()

    class BootSplash(QWidget):
        def __init__(self) -> None:
            super().__init__()
            self.setWindowFlag(Qt.FramelessWindowHint, True)
            self.setFixedSize(720, 460)
            self.rain = MatrixRainWidget(self, fps=24, dense=True)
            self.rain.setGeometry(0, 0, 720, 460)

            overlay = QWidget(self)
            overlay.setGeometry(0, 0, 720, 460)
            overlay.setStyleSheet("background: transparent;")
            v = QVBoxLayout(overlay)
            v.setContentsMargins(40, 40, 40, 40)
            title = QLabel("IPHONE HACKER CONTROL")
            title.setObjectName("TitleLabel")
            title.setAlignment(Qt.AlignCenter)
            title.setStyleSheet(
                f"color:{styles.GREEN_BRIGHT}; font-size:26px; font-weight:bold;"
                "letter-spacing:4px; background:transparent;")
            v.addWidget(title)
            v.addStretch(1)
            self.boot_log = QPlainTextEdit()
            self.boot_log.setReadOnly(True)
            self.boot_log.setFixedHeight(160)
            self.boot_log.setStyleSheet(
                f"background: rgba(0,0,0,160); border:1px solid {styles.PANEL_BORDER};"
                f"color:{styles.GREEN};")
            v.addWidget(self.boot_log)
            self.progress = QProgressBar()
            self.progress.setRange(0, 100)
            self.progress.setValue(0)
            v.addWidget(self.progress)

            self._steps = self._build_steps()
            self._i = 0
            self._timer = QTimer(self)
            self._timer.timeout.connect(self._step)
            self._timer.start(320)

        def _build_steps(self):
            def check_deps():
                available, version, err = core.pymobiledevice3_status()
                if available:
                    return f"[ OK ] pymobiledevice3 {version} detectado"
                return f"[AVISO] pymobiledevice3 ausente ({err}) — modo diagnóstico"

            def detect_device():
                try:
                    devs = core.list_devices()
                    if devs:
                        return f"[ OK ] {len(devs)} dispositivo(s) Apple detectado(s)"
                    return "[INFO] nenhum dispositivo conectado — modo diagnóstico"
                except Exception as exc:
                    return f"[INFO] usbmux: {type(exc).__name__} — modo diagnóstico"

            return [
                ("> inicializando console de diagnóstico seguro...", None),
                ("> carregando módulos da interface...", None),
                ("> verificando dependências...", check_deps),
                ("> sondando subsistema usb / usbmux...", detect_device),
                ("> calibrando terminal...", None),
                ("> pronto.", None),
            ]

        def _step(self) -> None:
            if self._i >= len(self._steps):
                self._timer.stop()
                self.rain.stop()
                self.close()
                launch_main()
                return
            msg, action = self._steps[self._i]
            self.boot_log.appendPlainText(msg)
            if action is not None:
                try:
                    self.boot_log.appendPlainText("  " + action())
                except Exception as exc:
                    self.boot_log.appendPlainText(f"  [AVISO] {exc}")
            self._i += 1
            self.progress.setValue(int(self._i / len(self._steps) * 100))

    splash = BootSplash()
    splash.show()
    return app.exec()


def main(argv: list[str]) -> int:
    setup_logging()
    if "--selftest" in argv:
        return selftest()
    show_splash = "--no-splash" not in argv
    log.info("starting IPHONE HACKER CONTROL (splash=%s)", show_splash)
    return _run_gui(show_splash=show_splash)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
