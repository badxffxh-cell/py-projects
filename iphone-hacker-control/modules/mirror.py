"""
mirror.py — Screen mirroring controller.

What this does (real): opens the device screenshot service and polls frames on
a background thread, delivering PNG bytes to a callback. This gives a live,
read-only view of the device screen in the Windows UI.

What this honestly does NOT do: inject touches/gestures/keystrokes. iOS does
not expose a general-purpose remote-input channel to a trusted host over
lockdown. Real input control requires an Apple-signed automation agent
(WebDriverAgent, as used by Appium) running on the device with Developer Mode,
which is a separate, user-driven setup. `send_input()` therefore returns a
clear "not available" result rather than silently doing nothing or faking it.

Latency note: this is a polled screenshot mirror (a few frames per second),
not a hardware H.264 screen-record stream. It respects iOS limits: protected
screens (passcode, DRM, some camera/secure views) may appear blank or fail to
capture, and that is reported, not hidden.

The `iDesktop` approach was investigated (see README "Mirroring & control"):
it is a closed, third-party stack and is not bundled; this module uses the
documented, open screenshot service instead.
"""

from __future__ import annotations

import threading
import time
from typing import Callable, Optional

from .core import Result
from .logging_setup import get_logger

log = get_logger("mirror")

FrameCallback = Callable[[bytes], None]
ErrorCallback = Callable[[Result], None]


class MirrorController:
    """Polls device screenshots on a worker thread and streams frames."""

    def __init__(self) -> None:
        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()
        self._running = False
        self._serial: Optional[str] = None
        self._fps = 2.0
        self._last_error: Optional[Result] = None

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def last_error(self) -> Optional[Result]:
        return self._last_error

    def start(
        self,
        on_frame: FrameCallback,
        on_error: Optional[ErrorCallback] = None,
        serial: Optional[str] = None,
        fps: float = 2.0,
    ) -> Result:
        """Begin streaming frames. Returns immediately after a first probe."""
        if self._running:
            return Result.failure("Mirror session already running.")

        # Probe once synchronously so the caller gets an immediate, honest
        # success/failure instead of a thread that silently dies.
        from .screenshot import capture_bytes

        probe = capture_bytes(serial=serial)
        if not probe.ok:
            self._last_error = probe
            return probe

        self._serial = serial
        self._fps = max(0.2, min(10.0, fps))
        self._stop.clear()
        self._running = True
        self._last_error = None

        # Deliver the probe frame right away.
        try:
            on_frame(probe.data)
        except Exception:
            log.exception("on_frame (probe) callback raised")

        self._thread = threading.Thread(
            target=self._loop,
            args=(on_frame, on_error),
            name="ihc-mirror",
            daemon=True,
        )
        self._thread.start()
        log.info("mirror started (fps=%.1f)", self._fps)
        return Result.success("Mirror session started.", fps=self._fps)

    def _loop(self, on_frame: FrameCallback, on_error: Optional[ErrorCallback]) -> None:
        from .screenshot import capture_bytes

        interval = 1.0 / self._fps
        consecutive_errors = 0
        while not self._stop.is_set():
            t0 = time.perf_counter()
            res = capture_bytes(serial=self._serial)
            if res.ok:
                consecutive_errors = 0
                try:
                    on_frame(res.data)
                except Exception:
                    log.exception("on_frame callback raised")
            else:
                consecutive_errors += 1
                self._last_error = res
                if on_error:
                    try:
                        on_error(res)
                    except Exception:
                        log.exception("on_error callback raised")
                # Give up after repeated hard failures to avoid a tight loop.
                if consecutive_errors >= 5:
                    log.warning("mirror stopping after repeated capture errors")
                    break
            elapsed = time.perf_counter() - t0
            self._stop.wait(max(0.0, interval - elapsed))
        self._running = False
        log.info("mirror loop ended")

    def stop(self) -> Result:
        if not self._running and self._thread is None:
            return Result.success("Mirror was not running.")
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=3.0)
        self._thread = None
        self._running = False
        log.info("mirror stopped")
        return Result.success("Mirror session stopped.")

    def send_input(self, *_args, **_kwargs) -> Result:
        """Input injection is not available without WebDriverAgent (see module
        docstring). This is reported honestly rather than faked."""
        return Result.failure(
            "Remote input (tap/drag/type) is not available in this build.",
            error_type="InputNotSupported",
            hint=(
                "iOS has no general lockdown input channel. Touch control "
                "requires an Apple-signed WebDriverAgent automation session "
                "(Developer Mode + Xcode signing), which is not bundled here."
            ),
        )
