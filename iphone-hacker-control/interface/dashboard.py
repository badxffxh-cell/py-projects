"""
dashboard.py — Device information panels.

Shows connection state, identity, iOS version, battery, storage and network.
Data is pulled with the shared DeviceManager on a background worker (so the UI
never blocks) and refreshed on a timer while a device is connected.

Only real values are shown. When no device is connected, panels read
"— (no device)" rather than displaying fabricated data.
"""

from __future__ import annotations

import time
from typing import Optional

from PySide6.QtCore import QObject, QRunnable, Qt, QThreadPool, QTimer, Signal
from PySide6.QtWidgets import (
    QGridLayout,
    QGroupBox,
    QLabel,
    QProgressBar,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from . import styles
from modules.device import DeviceManager

_PLACEHOLDER = "— (sem dispositivo)"


class _SnapshotSignals(QObject):
    done = Signal(object)  # core.Result


class _SnapshotRunner(QRunnable):
    def __init__(self, device: DeviceManager) -> None:
        super().__init__()
        self.device = device
        self.signals = _SnapshotSignals()

    def run(self) -> None:
        res = self.device.snapshot()
        self.signals.done.emit(res)


def _field(label: str) -> tuple[QLabel, QLabel]:
    lab = QLabel(label)
    lab.setObjectName("DataLabel")
    val = QLabel(_PLACEHOLDER)
    val.setObjectName("DataValue")
    val.setTextInteractionFlags(Qt.TextSelectableByMouse)
    return lab, val


class Dashboard(QWidget):
    """Information dashboard bound to a shared DeviceManager."""

    # Emitted so the main window can route button presses to the terminal.
    run_command = Signal(str)
    status_changed = Signal(bool)  # connected?

    def __init__(self, device: DeviceManager,
                 parent: Optional[QWidget] = None) -> None:
        super().__init__(parent)
        self.device = device
        self.pool = QThreadPool.globalInstance()
        self._connected = False
        self._refreshing = False
        self._build_ui()

        self._timer = QTimer(self)
        self._timer.timeout.connect(self.refresh)
        self._timer.start(10_000)  # auto-refresh every 10s

    # -- UI ------------------------------------------------------------------

    def _build_ui(self) -> None:
        root = QVBoxLayout(self)
        root.setContentsMargins(6, 6, 6, 6)
        root.setSpacing(8)

        # Painel de conexão
        conn = QGroupBox("Conexão")
        cg = QGridLayout(conn)
        self.state_value = QLabel("DESCONECTADO")
        self.state_value.setObjectName("StatusDisconnected")
        l0 = QLabel("Estado"); l0.setObjectName("DataLabel")
        cg.addWidget(l0, 0, 0)
        cg.addWidget(self.state_value, 0, 1)
        self._name_l, self.name_value = _field("Dispositivo")
        cg.addWidget(self._name_l, 1, 0); cg.addWidget(self.name_value, 1, 1)
        self._serial_l, self.serial_value = _field("Serial/UDID")
        cg.addWidget(self._serial_l, 2, 0); cg.addWidget(self.serial_value, 2, 1)
        self._uptime_l, self.uptime_value = _field("Conectado há")
        cg.addWidget(self._uptime_l, 3, 0); cg.addWidget(self.uptime_value, 3, 1)
        root.addWidget(conn)

        # Painel de informações do dispositivo
        info = QGroupBox("Dispositivo")
        ig = QGridLayout(info)
        self._model_l, self.model_value = _field("Modelo")
        ig.addWidget(self._model_l, 0, 0); ig.addWidget(self.model_value, 0, 1)
        self._ptype_l, self.ptype_value = _field("Identificador")
        ig.addWidget(self._ptype_l, 1, 0); ig.addWidget(self.ptype_value, 1, 1)
        self._ios_l, self.ios_value = _field("Versão do iOS")
        ig.addWidget(self._ios_l, 2, 0); ig.addWidget(self.ios_value, 2, 1)
        self._build_l, self.build_value = _field("Build")
        ig.addWidget(self._build_l, 3, 0); ig.addWidget(self.build_value, 3, 1)
        root.addWidget(info)

        # Painel de bateria
        bat = QGroupBox("Bateria")
        bg = QVBoxLayout(bat)
        self.battery_bar = QProgressBar()
        self.battery_bar.setRange(0, 100)
        self.battery_bar.setValue(0)
        self.battery_bar.setFormat("—")
        bg.addWidget(self.battery_bar)
        self.battery_state = QLabel(_PLACEHOLDER)
        self.battery_state.setObjectName("DataValue")
        bg.addWidget(self.battery_state)
        root.addWidget(bat)

        # Painel de armazenamento
        stor = QGroupBox("Armazenamento")
        sg = QVBoxLayout(stor)
        self.storage_bar = QProgressBar()
        self.storage_bar.setRange(0, 100)
        self.storage_bar.setValue(0)
        self.storage_bar.setFormat("—")
        sg.addWidget(self.storage_bar)
        self.storage_text = QLabel(_PLACEHOLDER)
        self.storage_text.setObjectName("DataValue")
        sg.addWidget(self.storage_text)
        root.addWidget(stor)

        # Painel de rede
        net = QGroupBox("Rede")
        ng = QGridLayout(net)
        self._wmac_l, self.wmac_value = _field("MAC Wi-Fi")
        ng.addWidget(self._wmac_l, 0, 0); ng.addWidget(self.wmac_value, 0, 1)
        root.addWidget(net)

        # Ações
        actions = QGroupBox("Ações")
        ag = QGridLayout(actions)
        self.btn_detect = QPushButton("Detectar")
        self.btn_refresh = QPushButton("Atualizar")
        self.btn_screenshot = QPushButton("Captura")
        self.btn_mirror = QPushButton("Espelhar")
        self.btn_diag = QPushButton("Diagnóstico")
        self.btn_reboot = QPushButton("Reiniciar")
        self.btn_detect.clicked.connect(lambda: self.run_command.emit("device"))
        self.btn_refresh.clicked.connect(self.refresh)
        self.btn_screenshot.clicked.connect(
            lambda: self.run_command.emit("device screenshot"))
        self.btn_mirror.clicked.connect(
            lambda: self.run_command.emit("mirror start"))
        self.btn_diag.clicked.connect(
            lambda: self.run_command.emit("system diagnostics"))
        self.btn_reboot.clicked.connect(
            lambda: self.run_command.emit("device reboot"))
        for i, b in enumerate((self.btn_detect, self.btn_refresh,
                               self.btn_screenshot, self.btn_mirror,
                               self.btn_diag, self.btn_reboot)):
            ag.addWidget(b, i // 2, i % 2)
        root.addWidget(actions)
        root.addStretch(1)

    # -- refresh -------------------------------------------------------------

    def refresh(self) -> None:
        if self._refreshing:
            return
        self._refreshing = True
        self.btn_refresh.setEnabled(False)
        runner = _SnapshotRunner(self.device)
        runner.signals.done.connect(self._on_snapshot)
        self.pool.start(runner)

    def _on_snapshot(self, res) -> None:
        self._refreshing = False
        self.btn_refresh.setEnabled(True)
        if not res.ok:
            self._set_disconnected()
            return
        data = res.data or {}
        info = data.get("info", {})
        self._set_connected(info)

        bat = data.get("battery") or {}
        pct = bat.get("CurrentCapacity")
        if isinstance(pct, (int, float)):
            self.battery_bar.setValue(int(pct))
            self.battery_bar.setFormat(f"{int(pct)}%")
            charging = bat.get("IsCharging")
            ext = bat.get("ExternalConnected")
            state = "carregando" if charging else (
                "na energia externa" if ext else "na bateria")
            self.battery_state.setText(state)
        else:
            self.battery_bar.setFormat("n/d")
            self.battery_state.setText("info de bateria indisponível")

        stor = data.get("storage")
        if stor:
            self.storage_text.setText(
                f"{stor.get('available')} livres de {stor.get('total')}")
        else:
            self.storage_text.setText("info de armazenamento indisponível")

        net = data.get("network") or {}
        self.wmac_value.setText(net.get("WiFiAddress") or "n/d")

    def _set_connected(self, info: dict) -> None:
        if not self._connected:
            self._connected = True
            self.status_changed.emit(True)
        self.state_value.setText("CONECTADO")
        self.state_value.setObjectName("StatusConnected")
        self.state_value.setStyleSheet(f"color:{styles.GREEN_BRIGHT};font-weight:bold;")
        self.name_value.setText(info.get("DeviceName") or "iPhone")
        self.serial_value.setText(info.get("UniqueDeviceID") or "n/d")
        model = info.get("MarketingName") or info.get("ProductType") or "n/a"
        self.model_value.setText(model)
        self.ptype_value.setText(info.get("ProductType") or "n/d")
        self.ios_value.setText(info.get("ProductVersion") or "n/d")
        self.build_value.setText(info.get("BuildVersion") or "n/d")
        up = self.device.uptime_seconds
        if up is not None:
            self.uptime_value.setText(time.strftime("%H:%M:%S", time.gmtime(up)))

    def _set_disconnected(self) -> None:
        if self._connected:
            self._connected = False
            self.status_changed.emit(False)
        self.state_value.setText("DESCONECTADO")
        self.state_value.setStyleSheet(f"color:{styles.AMBER};font-weight:bold;")
        for v in (self.name_value, self.serial_value, self.uptime_value,
                  self.model_value, self.ptype_value, self.ios_value,
                  self.build_value, self.wmac_value):
            v.setText(_PLACEHOLDER)
        self.battery_bar.setValue(0)
        self.battery_bar.setFormat("—")
        self.battery_state.setText(_PLACEHOLDER)
        self.storage_bar.setValue(0)
        self.storage_bar.setFormat("—")
        self.storage_text.setText(_PLACEHOLDER)
