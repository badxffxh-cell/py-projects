# IPHONE HACKER CONTROL

A Windows desktop tool to **connect, diagnose, screenshot and mirror your own
iPhone**, wrapped in a classic green-on-black "Matrix" terminal interface.

It is built on the open, documented [`pymobiledevice3`](https://github.com/doronz88/pymobiledevice3)
library and talks to the device over the same `usbmux`/`lockdown` channel that
Apple's own tools use. **No jailbreak, no exploits, no lock/Face ID bypass.**
It only does what the operating system permits for a *trusted* computer that the
device's owner has authorized.

> ⚠️ **Honest scope.** iOS is a locked-down platform. This program gives you
> real diagnostics and a read-only screen mirror, but it **cannot** provide
> universal remote touch control, extract app data, or bypass any protection.
> Where a capability is not available, the app tells you so plainly instead of
> faking a result.

---

## Table of contents
1. [Features](#features)
2. [What needs an iPhone connected](#what-needs-an-iphone-connected)
3. [Project structure](#project-structure)
4. [Requirements](#requirements)
5. [Install](#install)
6. [Run](#run)
7. [Connecting over USB](#connecting-over-usb)
8. [Configuring Wi-Fi (wireless) access](#configuring-wi-fi-wireless-access)
9. [Terminal commands](#terminal-commands)
10. [Mirroring & control](#mirroring--control)
11. [Building a standalone .exe](#building-a-standalone-exe)
12. [Compatibility & limitations](#compatibility--limitations)
13. [Security & privacy](#security--privacy)
14. [Troubleshooting](#troubleshooting)

---

## Features

**Always available (even with no device):**
- Matrix boot animation, blinking cursor, neon-green monospace UI.
- Integrated terminal with real command parsing, history and validation.
- Host + dependency diagnostics (`system diagnostics`).
- Honest error reporting with actionable hints. Errors are never hidden.
- Runs in **diagnostic mode** when no iPhone is connected — it never invents one.

**Available when an authorized iPhone is connected:**
- Automatic USB detection and model / iOS identification.
- Battery, storage, and network (MAC) information.
- Device screenshot capture (subject to iOS permissions).
- Live, read-only screen mirror (polled screenshots).
- Pairing / trust status and connection diagnostics.
- Device reboot (explicit confirmation required).
- Wi-Fi sync enablement and wireless reconnection.

---

## What needs an iPhone connected

| Feature | Works without device | Needs device |
|--------|:--------------------:|:------------:|
| Matrix UI, terminal, help | ✅ | |
| `system diagnostics` (host section) | ✅ | |
| Dependency / environment checks | ✅ | |
| Device detection (`device`, `usb status`) | ✅ (reports 0) | ✅ shows real data |
| `device info/battery/storage/network` | | ✅ |
| `device screenshot` | | ✅ |
| `mirror start` | | ✅ |
| `device reboot` | | ✅ |
| `wifi status` / Wi-Fi sync | | ✅ |

---

## Project structure

```
iphone-hacker-control/
├─ main.py                 Entry point: splash -> checks -> detect -> UI
├─ requirements.txt
├─ install.bat             Create venv + install dependencies (Windows)
├─ start.bat               Launch the app (Windows)
├─ build_exe.bat           Build a standalone .exe with PyInstaller
├─ README.md
├─ modules/                Backend (GUI-free, unit-tested)
│  ├─ core.py              Async backend: usbmux/lockdown, Result, run_sync
│  ├─ device.py            DeviceManager: info/battery/storage/network/reboot
│  ├─ usb.py               USB status + pairing/trust check
│  ├─ wifi.py              Wi-Fi discovery, sync enable, link-quality probe
│  ├─ screenshot.py        Screenshot capture (PNG)
│  ├─ mirror.py            Screen-mirror controller (polled frames)
│  ├─ diagnostics.py       Host + device diagnostic report
│  ├─ terminal.py          Command engine (pure logic, testable)
│  └─ logging_setup.py     Rotating file logging
├─ interface/              PySide6 GUI
│  ├─ main_window.py       Window, title bar, mirror window
│  ├─ dashboard.py         Live info panels + action buttons
│  ├─ terminal_widget.py   Terminal panel (threaded command execution)
│  ├─ matrix_rain.py       Matrix rain animation + boot splash backdrop
│  └─ styles.py            Theme / stylesheet
├─ logs/                   Runtime logs (git-ignored)
└─ tests/                  Headless unit tests (pytest)
```

---

## Requirements

- **Windows 10 / 11** (the GUI and `.bat` scripts target Windows; the Python
  code itself is cross-platform).
- **Python 3.10+** (3.12+ recommended). Get it from
  [python.org](https://www.python.org/downloads/) and tick
  *"Add python.exe to PATH"* during setup.
- **Apple Devices app or iTunes** installed, so the **Apple Mobile Device
  Service** (the Windows `usbmuxd`) is present and running. This is what lets
  Windows talk to the iPhone over USB.

Python dependencies (installed automatically): `PySide6`, `pymobiledevice3`.

---

## Install

1. Download / clone this folder.
2. Double-click **`install.bat`** (or run it from a terminal).
   It will:
   - find your Python,
   - create a local virtual environment in `.venv`,
   - install the dependencies,
   - verify the install.

Manual alternative:
```bat
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

---

## Run

Double-click **`start.bat`**, or:
```bat
.venv\Scripts\python main.py
```

Useful flags:
```bat
python main.py --no-splash     REM skip the boot animation
python main.py --selftest      REM headless backend self-test (no GUI), prints results
```

On launch you'll see the Matrix boot sequence, a dependency check, a device
probe, then the dashboard + terminal. If no iPhone is connected it opens in
diagnostic mode.

---

## Connecting over USB

1. Install the **Apple Devices** app (Microsoft Store) or **iTunes**, so the
   Apple Mobile Device Service is running.
2. Plug the iPhone into the PC with a **data-capable** USB cable.
3. **Unlock** the iPhone. When it shows *"Trust This Computer?"*, tap
   **Trust** and enter your passcode.
4. In the app, run `device` (or press **DETECT**). Your device should appear.
5. Run `device info`, `device battery`, `device storage` for live data.

If `usb status` reports that usbmuxd is unreachable, the Apple Mobile Device
Service is not installed/running — install the Apple Devices app or iTunes.

---

## Configuring Wi-Fi (wireless) access

Wireless access reuses the USB pairing, so you must pair over USB **first**:

1. Connect over USB and trust the computer (steps above).
2. Enable wireless sync. Either:
   - In the app terminal, this build exposes the backend helper used by the
     dashboard; or
   - In Finder/iTunes, enable *"Show this iPhone when on Wi-Fi"*.
3. Keep the iPhone and PC on the **same Wi-Fi network**.
4. You may now unplug USB. Run `wifi status` to see the device advertised over
   the network. Diagnostics and screenshots then work wirelessly.

`wifi status` lists only devices that are actually visible on the network — it
does not fabricate a wireless device.

---

## Terminal commands

```
help                 Show the command reference
clear                Clear the terminal screen
device               List detected Apple devices
device info          Model, iOS version, identifiers
device battery       Battery level and charging state
device storage       Disk capacity and free space
device network       Wi-Fi/Bluetooth MAC and link info
device screenshot    Capture a PNG from the device (saved to screenshots/)
device reboot --yes  Restart the device (confirmation required)
usb status           USB connection + usbmux service state
wifi status          Network-visible devices (needs Wi-Fi sync)
system diagnostics   Full host + device diagnostic report
logs                 Show the log file path and last lines
mirror start         Open the live screen-mirror window
mirror stop          Close the screen-mirror window
exit                 Quit the application
```

Commands that change the device (e.g. `device reboot`) require explicit
confirmation. Unknown commands produce a helpful message, never a crash.

---

## Mirroring & control

`mirror start` opens a window that shows your device screen by polling the iOS
**screenshot service** a few frames per second. It is a **live, read-only**
view — fine for watching the screen, demos, and diagnostics.

**About touch control (honest answer).** This build does **not** inject taps,
swipes or keystrokes. iOS provides no general-purpose remote-input channel to a
trusted host over lockdown. Real input automation requires an Apple-signed
**WebDriverAgent** session (as used by Appium/`pymobiledevice3`'s WDA tunnel),
which needs Developer Mode and Xcode code-signing set up by you — it is a
separate, user-driven process and is **not bundled** here. Clicking the mirror
reports this clearly rather than silently doing nothing.

> The **iDesktop** product was evaluated as a mirroring/control mechanism. It is
> a closed, third-party stack and is not integrated here; this project uses the
> open, documented screenshot service instead so its behavior is transparent
> and auditable.

Mirroring respects iOS limits: protected screens (passcode/lock screen, DRM
video, some camera and secure views, apps that block capture) may appear blank
or fail to capture. That is reported, not hidden.

---

## Building a standalone .exe

1. Install and run the app at least once (so the venv exists).
2. Double-click **`build_exe.bat`**. It installs PyInstaller and produces:
   ```
   dist\IphoneHackerControl\IphoneHackerControl.exe
   ```
   A **one-folder** build is used because it starts faster and is far more
   reliable for PySide6 than a single file. To attempt a single-file build, add
   `--onefile` to the PyInstaller command in `build_exe.bat`.

Manual alternative:
```bat
.venv\Scripts\activate
pip install pyinstaller
pyinstaller --name IphoneHackerControl --windowed --clean --noconfirm ^
    --collect-all PySide6 --collect-all pymobiledevice3 main.py
```

---

## Compatibility & limitations

- **iPhone 17 Pro Max / newer iOS:** The identity, battery, storage and network
  queries use stable lockdown/diagnostics services that have worked across many
  iOS generations and should work on current hardware. However, **this build
  has not been tested against iOS 27**, and no feature is *claimed* to work on
  an iOS version it was not tested on. The app reports the **actual**
  `ProductVersion`/`ProductType` the device returns; it does not assert support
  for an untested OS.
- **Marketing names:** only well-known model identifiers are mapped to a
  marketing name. For an unmapped identifier (e.g. a brand-new device), the app
  shows the raw `ProductType` and the device's own name rather than guessing.
- **iOS 17+ developer services:** screenshots and other developer services may
  require **Developer Mode** (Settings → Privacy & Security → Developer Mode)
  and, on recent iOS, a RemoteServiceDiscovery **tunnel** that needs
  administrator privileges. If a capability needs that, the app says so.
- **No remote input** without WebDriverAgent (see Mirroring above).

---

## Security & privacy

This tool is for use on **your own device, with your authorization**. It does
**not** and will not:
- bypass the lock screen, passcode or Face ID,
- extract passwords or credentials,
- intrude into devices you do not own,
- exploit vulnerabilities or disable iOS protections,
- access app data clandestinely.

Privacy choices in this build:
- No personal data is transmitted anywhere; everything stays local.
- Screenshots are saved locally under `screenshots/` only when you ask.
- Logs under `logs/` record operations and errors for troubleshooting and are
  git-ignored. Delete them anytime.
- `subprocess` is not used to run arbitrary or elevated commands.

---

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| "Could not query usbmuxd" | Install the Apple Devices app / iTunes; ensure *Apple Mobile Device Service* is running. |
| Device not detected | Use a data USB cable, unlock the phone, tap **Trust**. |
| "Trust"/pairing errors | Unlock the device and accept the trust prompt; re-pair over USB. |
| Screenshot fails on iOS 17+ | Enable Developer Mode; a RSD tunnel (admin) may be required. |
| GUI won't start | Re-run `install.bat`; check `logs/iphone-hacker-control.log`. |
| Want raw logs | Run `logs` in the terminal, or open `logs/iphone-hacker-control.log`. |

---

### Developer notes

- Run the headless tests: `python -m pytest tests/ -q`
- Run a backend self-test without a GUI: `python main.py --selftest`
- The backend (`modules/`) is intentionally GUI-free and async, driven through
  `core.run_sync()`, so it is unit-testable without a device or a display.
