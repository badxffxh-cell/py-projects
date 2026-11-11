"""
styles.py — Matrix / classic-hacker terminal theme for the whole application.

Pure-black background, neon-green monospace text, subtle borders and glows.
Everything is centralized here so the look is consistent and easy to tweak.
"""

from __future__ import annotations

# Palette -------------------------------------------------------------------
BLACK = "#000000"
PANEL = "#050805"
PANEL_BORDER = "#0d3d17"
GREEN = "#00ff41"          # primary neon green
GREEN_DIM = "#1f8a3b"      # secondary / labels
GREEN_DARK = "#0a3f18"     # faint lines
GREEN_BRIGHT = "#8dffb0"   # highlights
AMBER = "#ffcf3f"          # warnings
RED = "#ff4b4b"            # errors
GREY = "#5a6f5a"

# Preferred monospace stack (Consolas ships on Windows; fallbacks for others).
MONO_FAMILY = '"Consolas", "Cascadia Mono", "DejaVu Sans Mono", "Courier New", monospace'


def app_stylesheet() -> str:
    """Return the global Qt stylesheet for the application."""
    return f"""
    QWidget {{
        background-color: {BLACK};
        color: {GREEN};
        font-family: {MONO_FAMILY};
        font-size: 13px;
        selection-background-color: {GREEN_DIM};
        selection-color: {BLACK};
    }}

    QMainWindow, QDialog {{
        background-color: {BLACK};
    }}

    /* Panels / group boxes */
    QGroupBox {{
        border: 1px solid {PANEL_BORDER};
        border-radius: 4px;
        margin-top: 14px;
        background-color: {PANEL};
    }}
    QGroupBox::title {{
        subcontrol-origin: margin;
        subcontrol-position: top left;
        left: 10px;
        padding: 0 6px;
        color: {GREEN_BRIGHT};
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 1px;
    }}

    QLabel {{
        background: transparent;
    }}
    QLabel#TitleLabel {{
        color: {GREEN_BRIGHT};
        font-size: 20px;
        font-weight: bold;
        letter-spacing: 3px;
    }}
    QLabel#SubtitleLabel {{
        color: {GREEN_DIM};
        font-size: 11px;
        letter-spacing: 2px;
    }}
    QLabel#StatusConnected {{ color: {GREEN_BRIGHT}; font-weight: bold; }}
    QLabel#StatusDisconnected {{ color: {AMBER}; font-weight: bold; }}
    QLabel#DataValue {{ color: {GREEN_BRIGHT}; }}
    QLabel#DataLabel {{ color: {GREEN_DIM}; }}

    /* Buttons */
    QPushButton {{
        background-color: {PANEL};
        color: {GREEN};
        border: 1px solid {PANEL_BORDER};
        border-radius: 3px;
        padding: 6px 14px;
        text-transform: uppercase;
        letter-spacing: 1px;
    }}
    QPushButton:hover {{
        border: 1px solid {GREEN};
        color: {GREEN_BRIGHT};
        background-color: #071a0c;
    }}
    QPushButton:pressed {{
        background-color: {GREEN_DARK};
        color: {BLACK};
    }}
    QPushButton:disabled {{
        color: {GREY};
        border-color: #16281a;
    }}

    /* Text areas and inputs */
    QPlainTextEdit, QTextEdit {{
        background-color: {BLACK};
        color: {GREEN};
        border: 1px solid {PANEL_BORDER};
        border-radius: 4px;
        padding: 6px;
    }}
    QLineEdit {{
        background-color: {BLACK};
        color: {GREEN_BRIGHT};
        border: none;
        padding: 4px 2px;
        font-size: 14px;
    }}

    /* Scrollbars */
    QScrollBar:vertical {{
        background: {BLACK};
        width: 10px;
        margin: 0;
    }}
    QScrollBar::handle:vertical {{
        background: {PANEL_BORDER};
        min-height: 24px;
        border-radius: 5px;
    }}
    QScrollBar::handle:vertical:hover {{ background: {GREEN_DIM}; }}
    QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{ height: 0; }}

    QProgressBar {{
        border: 1px solid {PANEL_BORDER};
        border-radius: 3px;
        background: {BLACK};
        text-align: center;
        color: {GREEN_BRIGHT};
    }}
    QProgressBar::chunk {{
        background-color: {GREEN_DIM};
    }}

    QToolTip {{
        background-color: {PANEL};
        color: {GREEN};
        border: 1px solid {GREEN_DIM};
    }}
    """
