"""
main_window.py — Assembles the application: title bar, dashboard, terminal and
the screen-mirror window.

The DeviceManager is created once and SHARED between the terminal engine and
the dashboard, so both reflect the same connection state.
"""

from __future__ import annotations

from typing import Optional

from PySide6.QtCore import QObject, Qt, Signal
from PySide6.QtGui import QPixmap
from PySide6.QtWidgets import (
    QDialog,
    QHBoxLayout,
    QLabel,
    QMainWindow,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from . import styles
from .dashboard import Dashboard
from .terminal_widget import TerminalWidget
from modules.device import DeviceManager
from modules.mirror import MirrorController
from modules.terminal import TerminalEngine


class _FrameBridge(QObject):
    """Marshals mirror frames/errors from the worker thread to the GUI thread."""

    frame = Signal(bytes)
    error = Signal(str)


class MirrorPanel(QDialog):
    """Live, read-only screen-mirror window (polled screenshots)."""

    def __init__(self, device: DeviceManager, parent: Optional[QWidget] = None) -> None:
        super().__init__(parent)
        self.setWindowTitle("IPHONE HACKER CONTROL — Screen Mirror")
        self.resize(360, 720)
        self.device = device
        self.controller = MirrorController()
        self.bridge = _FrameBridge()
        self.bridge.frame.connect(self._on_frame)
        self.bridge.error.connect(self._on_error)

        layout = QVBoxLayout(self)
        self.screen = QLabel("Starting mirror…")
        self.screen.setAlignment(Qt.AlignCenter)
        self.screen.setMinimumSize(320, 600)
        self.screen.setStyleSheet(
            f"border:1px solid {styles.PANEL_BORDER}; background:{styles.BLACK};")
        self.screen.mousePressEvent = self._on_screen_click  # honest input probe
        layout.addWidget(self.screen, 1)

        self.status = QLabel("")
        self.status.setObjectName("DataLabel")
        self.status.setWordWrap(True)
        layout.addWidget(self.status)

        row = QHBoxLayout()
        self.btn_start = QPushButton("Start")
        self.btn_stop = QPushButton("Stop")
        self.btn_start.clicked.connect(self.start)
        self.btn_stop.clicked.connect(self.stop)
        row.addWidget(self.btn_start)
        row.addWidget(self.btn_stop)
        layout.addLayout(row)

    def start(self) -> None:
        self.status.setText("Connecting to device screenshot service…")
        res = self.controller.start(
            on_frame=lambda b: self.bridge.frame.emit(b),
            on_error=lambda r: self.bridge.error.emit(
                (r.error or "error") + (f"\nHint: {r.hint}" if r.hint else "")),
            serial=self.device.serial,
            fps=2.0,
        )
        if not res.ok:
            self._on_error((res.error or "could not start") +
                           (f"\nHint: {res.hint}" if res.hint else ""))
        else:
            self.status.setText("Mirror running (polled, read-only).")

    def stop(self) -> None:
        self.controller.stop()
        self.status.setText("Mirror stopped.")

    def _on_frame(self, data: bytes) -> None:
        pix = QPixmap()
        if pix.loadFromData(data):
            self.screen.setPixmap(
                pix.scaled(self.screen.size(), Qt.KeepAspectRatio,
                           Qt.SmoothTransformation))

    def _on_error(self, message: str) -> None:
        self.screen.setText("Mirror unavailable")
        self.status.setText(f"[ERROR] {message}")

    def _on_screen_click(self, event) -> None:
        # Honest: report that remote input needs WebDriverAgent, not silently do
        # nothing or fake a tap.
        res = self.controller.send_input()
        self.status.setText(f"[input] {res.error}  ({res.hint})")

    def closeEvent(self, event) -> None:  # noqa: N802
        self.controller.stop()
        super().closeEvent(event)


class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("IPHONE HACKER CONTROL")
        self.resize(1180, 760)

        # Shared device manager + engine.
        self.device = DeviceManager()
        self.engine = TerminalEngine(self.device)
        self._mirror: Optional[MirrorPanel] = None

        central = QWidget()
        self.setCentralWidget(central)
        root = QVBoxLayout(central)
        root.setContentsMargins(10, 10, 10, 10)
        root.setSpacing(8)

        # Title bar
        title_row = QHBoxLayout()
        title = QLabel("IPHONE HACKER CONTROL")
        title.setObjectName("TitleLabel")
        subtitle = QLabel("secure device diagnostics • owner-authorized")
        subtitle.setObjectName("SubtitleLabel")
        tbox = QVBoxLayout()
        tbox.addWidget(title)
        tbox.addWidget(subtitle)
        title_row.addLayout(tbox)
        title_row.addStretch(1)
        self.header_status = QLabel("● DISCONNECTED")
        self.header_status.setObjectName("StatusDisconnected")
        title_row.addWidget(self.header_status, 0, Qt.AlignTop)
        root.addLayout(title_row)

        # Body: dashboard | terminal
        body = QHBoxLayout()
        self.dashboard = Dashboard(self.device)
        self.dashboard.setFixedWidth(360)
        self.terminal = TerminalWidget(self.engine)

        self.dashboard.run_command.connect(self.terminal.run_command)
        self.dashboard.status_changed.connect(self._on_status_changed)
        self.terminal.request_exit.connect(self.close)
        self.terminal.request_mirror_start.connect(self.open_mirror)
        self.terminal.request_mirror_stop.connect(self.close_mirror)

        body.addWidget(self.dashboard)
        body.addWidget(self.terminal, 1)
        root.addLayout(body, 1)

        # Kick off an initial detection/refresh.
        self.dashboard.refresh()

    def _on_status_changed(self, connected: bool) -> None:
        if connected:
            self.header_status.setText("● CONNECTED")
            self.header_status.setStyleSheet(
                f"color:{styles.GREEN_BRIGHT};font-weight:bold;")
        else:
            self.header_status.setText("● DISCONNECTED")
            self.header_status.setStyleSheet(
                f"color:{styles.AMBER};font-weight:bold;")

    def open_mirror(self) -> None:
        if self._mirror is None:
            self._mirror = MirrorPanel(self.device, self)
        self._mirror.show()
        self._mirror.raise_()
        self._mirror.start()

    def close_mirror(self) -> None:
        if self._mirror is not None:
            self._mirror.stop()
            self._mirror.hide()
