"""
matrix_rain.py — Matrix "digital rain" animation and the boot splash screen.

MatrixRainWidget paints falling green glyph columns with QPainter on a timer.
It is used as a subtle background and as the backdrop of the boot splash.

The animation is intentionally light (configurable FPS, capped columns) so it
stays smooth and does not dominate CPU.
"""

from __future__ import annotations

import random
from typing import List, Optional

from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QColor, QFont, QFontMetrics, QPainter
from PySide6.QtWidgets import QWidget

from . import styles

_GLYPHS = (
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    "｡ｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇ"
    "<>[]{}/*-+=$#@%&"
)


class _Column:
    __slots__ = ("x", "y", "speed", "length", "chars")

    def __init__(self, x: int, height: int, cell: int) -> None:
        self.x = x
        self.length = random.randint(6, 24)
        self.speed = random.uniform(0.4, 1.4)
        self.y = random.uniform(-height, 0)
        self.chars = [random.choice(_GLYPHS) for _ in range(self.length)]

    def advance(self, cell: int) -> None:
        self.y += self.speed * cell
        if random.random() < 0.08:  # occasionally mutate the head glyph
            self.chars[0] = random.choice(_GLYPHS)


class MatrixRainWidget(QWidget):
    """A widget that renders animated Matrix rain."""

    def __init__(self, parent: Optional[QWidget] = None, fps: int = 20,
                 dense: bool = False) -> None:
        super().__init__(parent)
        self._cell = 16
        self._dense = dense
        self._columns: List[_Column] = []
        self._font = QFont("Consolas")
        self._font.setStyleHint(QFont.Monospace)
        self._font.setPixelSize(self._cell)
        self.setAttribute(Qt.WA_OpaquePaintEvent, True)
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._tick)
        self._timer.start(max(16, int(1000 / max(1, fps))))

    def _rebuild_columns(self) -> None:
        fm = QFontMetrics(self._font)
        self._cell = max(12, fm.height())
        cols = max(1, self.width() // self._cell)
        if not self._dense:
            cols = max(1, cols // 2)
        self._columns = [
            _Column(i * self._cell * (1 if self._dense else 2), self.height(),
                    self._cell)
            for i in range(cols)
        ]

    def resizeEvent(self, event) -> None:  # noqa: N802 (Qt signature)
        self._rebuild_columns()
        super().resizeEvent(event)

    def _tick(self) -> None:
        for col in self._columns:
            col.advance(self._cell)
            if col.y - col.length * self._cell > self.height():
                col.y = random.uniform(-self.height() * 0.5, 0)
                col.speed = random.uniform(0.4, 1.4)
        self.update()

    def paintEvent(self, event) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.fillRect(self.rect(), QColor(styles.BLACK))
        painter.setFont(self._font)
        head = QColor(styles.GREEN_BRIGHT)
        body = QColor(styles.GREEN)
        tail = QColor(styles.GREEN_DARK)
        for col in self._columns:
            for i, ch in enumerate(col.chars):
                y = int(col.y - i * self._cell)
                if y < -self._cell or y > self.height():
                    continue
                if i == 0:
                    painter.setPen(head)
                elif i < 3:
                    painter.setPen(body)
                else:
                    c = QColor(tail)
                    c.setAlpha(max(30, 255 - i * 12))
                    painter.setPen(c)
                painter.drawText(col.x, y, ch)
        painter.end()

    def stop(self) -> None:
        self._timer.stop()
