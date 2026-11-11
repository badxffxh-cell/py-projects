"""
logging_setup.py — Centralized logging configuration.

Writes rotating logs to the project `logs/` directory and (optionally) echoes
to stderr. All modules obtain their logger via logging.getLogger("ihc.*").
"""

from __future__ import annotations

import logging
import logging.handlers
import os
from pathlib import Path

_CONFIGURED = False


def project_root() -> Path:
    """Return the project root (folder that contains this package)."""
    return Path(__file__).resolve().parent.parent


def logs_dir() -> Path:
    d = project_root() / "logs"
    d.mkdir(parents=True, exist_ok=True)
    return d


def setup_logging(level: int = logging.INFO, echo: bool = False) -> Path:
    """Configure the root 'ihc' logger once. Returns the log file path."""
    global _CONFIGURED
    log_file = logs_dir() / "iphone-hacker-control.log"
    if _CONFIGURED:
        return log_file

    logger = logging.getLogger("ihc")
    logger.setLevel(level)
    logger.propagate = False

    fmt = logging.Formatter(
        "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Rotating file handler: 1 MB x 5 files.
    try:
        fh = logging.handlers.RotatingFileHandler(
            log_file, maxBytes=1_048_576, backupCount=5, encoding="utf-8"
        )
        fh.setFormatter(fmt)
        fh.setLevel(level)
        logger.addHandler(fh)
    except Exception as exc:  # pragma: no cover - disk/permission issues
        # Never crash the app because logging failed; fall back to stderr.
        print(f"[logging] could not open log file: {exc}")
        echo = True

    if echo or os.environ.get("IHC_LOG_ECHO"):
        sh = logging.StreamHandler()
        sh.setFormatter(fmt)
        sh.setLevel(level)
        logger.addHandler(sh)

    _CONFIGURED = True
    logger.info("Logging initialized -> %s", log_file)
    return log_file


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"ihc.{name}")
