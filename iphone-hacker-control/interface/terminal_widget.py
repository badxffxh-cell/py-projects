"""
terminal_widget.py — Interactive terminal panel.

Renders command output in a read-only area and reads commands from a prompt
line. Commands run on a background QThreadPool worker so device I/O never
freezes the UI. Control actions (clear/exit/mirror) are surfaced as Qt signals
for the main window to handle.

Blinking cursor: a QTimer toggles a block glyph after the prompt to evoke the
classic terminal caret, in addition to the line-edit's own caret.
"""

from __future__ import annotations

from typing import Optional

from PySide6.QtCore import QObject, QRunnable, Qt, QThreadPool, QTimer, Signal
from PySide6.QtGui import QFont, QKeyEvent, QTextCursor
from PySide6.QtWidgets import (
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPlainTextEdit,
    QVBoxLayout,
    QWidget,
)

from . import styles
from modules.terminal import EngineResponse, TerminalEngine


class _WorkerSignals(QObject):
    done = Signal(object)  # EngineResponse


class _CommandRunner(QRunnable):
    def __init__(self, engine: TerminalEngine, line: str) -> None:
        super().__init__()
        self.engine = engine
        self.line = line
        self.signals = _WorkerSignals()

    def run(self) -> None:  # executed on a worker thread
        try:
            resp = self.engine.execute(self.line)
        except Exception as exc:  # last-resort guard
            resp = EngineResponse(f"[ERROR] {type(exc).__name__}: {exc}", ok=False)
        self.signals.done.emit(resp)


class TerminalWidget(QWidget):
    """The integrated terminal UI."""

    # Control actions bubbled up to the main window.
    request_clear = Signal()
    request_exit = Signal()
    request_mirror_start = Signal()
    request_mirror_stop = Signal()
    command_started = Signal(str)
    command_finished = Signal()

    PROMPT = "ihc>"

    def __init__(self, engine: Optional[TerminalEngine] = None,
                 parent: Optional[QWidget] = None) -> None:
        super().__init__(parent)
        self.engine = engine or TerminalEngine()
        self.pool = QThreadPool.globalInstance()
        self._history: list[str] = []
        self._hist_index = 0
        self._busy = False
        self._build_ui()
        self._print_welcome()

    # -- UI construction -----------------------------------------------------

    def _build_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(4)

        self.output = QPlainTextEdit()
        self.output.setReadOnly(True)
        self.output.setFont(QFont("Consolas"))
        self.output.setMaximumBlockCount(5000)
        layout.addWidget(self.output, 1)

        prompt_row = QHBoxLayout()
        prompt_row.setContentsMargins(6, 0, 6, 0)
        self.prompt_label = QLabel(self.PROMPT)
        self.prompt_label.setStyleSheet(
            f"color: {styles.GREEN_BRIGHT}; font-weight: bold;"
        )
        self.input = QLineEdit()
        self.input.setPlaceholderText("type 'help' and press Enter")
        self.input.returnPressed.connect(self._on_return)
        self.input.installEventFilter(self)

        self.caret = QLabel("█")  # full block
        self.caret.setStyleSheet(f"color: {styles.GREEN};")
        self._caret_on = True
        self._caret_timer = QTimer(self)
        self._caret_timer.timeout.connect(self._blink)
        self._caret_timer.start(500)

        prompt_row.addWidget(self.prompt_label)
        prompt_row.addWidget(self.input, 1)
        prompt_row.addWidget(self.caret)
        layout.addLayout(prompt_row)

    # -- caret ---------------------------------------------------------------

    def _blink(self) -> None:
        self._caret_on = not self._caret_on
        self.caret.setVisible(self._caret_on and not self._busy)

    # -- output helpers ------------------------------------------------------

    def _append(self, text: str, color: Optional[str] = None) -> None:
        if text is None:
            return
        cursor = self.output.textCursor()
        cursor.movePosition(QTextCursor.End)
        if color:
            self.output.appendHtml(
                f'<span style="color:{color}; white-space:pre-wrap;">'
                f"{self._escape(text)}</span>"
            )
        else:
            self.output.appendPlainText(text)
        self.output.verticalScrollBar().setValue(
            self.output.verticalScrollBar().maximum()
        )

    @staticmethod
    def _escape(text: str) -> str:
        return (
            text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\n", "<br>")
        )

    def _print_welcome(self) -> None:
        banner = r"""
 ___ ____  _   _  ___  _   _ _____   _   _    _    ____ _  _______ ____
|_ _|  _ \| | | |/ _ \| \ | | ____| | | | |  / \  / ___| |/ / ____|  _ \
 | || |_) | |_| | | | |  \| |  _|   | |_| | / _ \| |   | ' /|  _| | |_) |
 | ||  __/|  _  | |_| | |\  | |___  |  _  |/ ___ \ |___| . \| |___|  _ <
|___|_|   |_| |_|\___/|_| \_|_____| |_| |_/_/   \_\____|_|\_\_____|_| \_\
                      C O N T R O L
"""
        self._append(banner, styles.GREEN_DIM)
        self._append("Integrated terminal ready. Type 'help' for commands.\n",
                     styles.GREEN)

    # -- command flow --------------------------------------------------------

    def _on_return(self) -> None:
        if self._busy:
            return
        line = self.input.text()
        self.input.clear()
        stripped = line.strip()
        self._append(f"{self.PROMPT} {line}", styles.GREEN_BRIGHT)
        if stripped:
            self._history.append(stripped)
            self._hist_index = len(self._history)
        if not stripped:
            return
        self._set_busy(True)
        self.command_started.emit(stripped)
        runner = _CommandRunner(self.engine, stripped)
        runner.signals.done.connect(self._on_done)
        self.pool.start(runner)

    def _on_done(self, resp: EngineResponse) -> None:
        if resp.text:
            color = styles.GREEN if resp.ok else styles.RED
            # Keep multi-line error hints readable.
            self._append(resp.text, color)
        self._set_busy(False)
        self.command_finished.emit()
        if resp.action == "clear":
            self.output.clear()
        elif resp.action == "exit":
            self.request_exit.emit()
        elif resp.action == "mirror_start":
            self.request_mirror_start.emit()
        elif resp.action == "mirror_stop":
            self.request_mirror_stop.emit()

    def _set_busy(self, busy: bool) -> None:
        self._busy = busy
        self.input.setEnabled(not busy)
        self.prompt_label.setText("..." if busy else self.PROMPT)
        if not busy:
            self.input.setFocus()

    def run_command(self, line: str) -> None:
        """Programmatically run a command (used by dashboard buttons)."""
        if self._busy:
            return
        self.input.setText(line)
        self._on_return()

    # -- history navigation --------------------------------------------------

    def eventFilter(self, obj, event) -> bool:  # noqa: N802
        if obj is self.input and isinstance(event, QKeyEvent) and \
                event.type() == QKeyEvent.KeyPress:
            if event.key() == Qt.Key_Up:
                self._history_prev()
                return True
            if event.key() == Qt.Key_Down:
                self._history_next()
                return True
        return super().eventFilter(obj, event)

    def _history_prev(self) -> None:
        if not self._history:
            return
        self._hist_index = max(0, self._hist_index - 1)
        self.input.setText(self._history[self._hist_index])

    def _history_next(self) -> None:
        if not self._history:
            return
        self._hist_index = min(len(self._history), self._hist_index + 1)
        if self._hist_index >= len(self._history):
            self.input.clear()
        else:
            self.input.setText(self._history[self._hist_index])
