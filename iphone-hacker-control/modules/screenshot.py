"""
screenshot.py — Capture a real screenshot from the device.

Uses pymobiledevice3's ScreenshotService (com.apple.mobile.screenshotr).

Compatibility note (honest): on iOS 17+ many developer-facing services moved
behind a RemoteServiceDiscovery "tunnel" that needs elevated privileges and a
running tunnel daemon. If the screenshot service is not reachable over plain
lockdown, we report exactly that instead of pretending. We never fabricate an
image.
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Optional

from . import core
from .core import Result
from .logging_setup import get_logger, logs_dir

log = get_logger("screenshot")


def _screenshot_dir() -> Path:
    d = logs_dir().parent / "screenshots"
    d.mkdir(parents=True, exist_ok=True)
    return d


async def _acapture(serial: Optional[str]) -> Result:
    try:
        client = await core.aopen_lockdown(serial=serial)
    except core.BackendError as exc:
        return core.describe_exception(exc)
    try:
        from pymobiledevice3.services.screenshot import ScreenshotService

        svc = ScreenshotService(client)
        if hasattr(svc, "connect"):
            await svc.connect()
        try:
            png = await svc.take_screenshot()
        finally:
            try:
                await svc.close()
            except Exception:
                pass
        if not png:
            return Result.failure(
                "Screenshot service returned no data.",
                error_type="EmptyScreenshot",
            )
        return Result.success(png, size=len(png))
    except Exception as exc:
        log.exception("screenshot failed")
        res = core.describe_exception(exc)
        if res.hint is None:
            res.hint = (
                "On iOS 17+ the screenshot service may require Developer Mode "
                "and a RemoteServiceDiscovery tunnel (run as administrator). "
                "Protected screens (passcode, some apps) cannot be captured."
            )
        return res
    finally:
        try:
            await client.close()
        except Exception:
            pass


def capture_bytes(serial: Optional[str] = None) -> Result:
    """Return PNG bytes from the device, or a precise failure."""
    try:
        return core.run_sync(_acapture(serial))
    except core.BackendUnavailable as exc:
        return core.describe_exception(exc)


def capture_to_file(serial: Optional[str] = None, path: Optional[str] = None) -> Result:
    """Capture and save a PNG; returns the saved path on success."""
    res = capture_bytes(serial=serial)
    if not res.ok:
        return res
    if path is None:
        fname = time.strftime("screenshot-%Y%m%d-%H%M%S.png")
        out = _screenshot_dir() / fname
    else:
        out = Path(path)
        out.parent.mkdir(parents=True, exist_ok=True)
    try:
        out.write_bytes(res.data)
    except Exception as exc:
        log.exception("saving screenshot failed")
        return core.describe_exception(exc)
    log.info("screenshot saved: %s (%d bytes)", out, len(res.data))
    return Result.success(str(out), size=len(res.data))
