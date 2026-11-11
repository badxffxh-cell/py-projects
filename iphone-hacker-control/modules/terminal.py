"""
terminal.py — Motor de comandos do terminal integrado.

`TerminalEngine.execute(line)` interpreta um comando, executa a ação REAL
através dos módulos device/usb/wifi/diagnostics e retorna um `EngineResponse`
com o texto formatado e uma ação opcional de UI (clear/exit/mirror).

Esta classe é propositalmente livre de GUI, para poder ser testada sem tela. O
widget de terminal da interface a executa em uma thread de trabalho e exibe o
texto.

A entrada é validada: comandos desconhecidos geram uma mensagem útil, nunca uma
falha, e nunca um resultado inventado.

Observação: as PALAVRAS de comando (help, device, usb status, ...) permanecem em
inglês por serem a API definida do terminal; todo o texto exibido está em
português.
"""

from __future__ import annotations

import shlex
from dataclasses import dataclass
from typing import Optional

from . import diagnostics as diag_mod
from . import screenshot as screenshot_mod
from . import usb as usb_mod
from . import wifi as wifi_mod
from .core import Result
from .device import DeviceManager
from .logging_setup import get_logger, logs_dir

log = get_logger("terminal")

BANNER_NAME = "IPHONE HACKER CONTROL"


@dataclass
class EngineResponse:
    text: str
    ok: bool = True
    action: Optional[str] = None  # "clear" | "exit" | "mirror_start" | "mirror_stop"


def _kv(title: str, pairs: dict) -> str:
    """Renderiza um dict como linhas chave/valor alinhadas."""
    width = max((len(str(k)) for k in pairs), default=0)
    lines = [title] if title else []
    for k, v in pairs.items():
        shown = "n/d" if v is None else v
        lines.append(f"  {str(k).ljust(width)} : {shown}")
    return "\n".join(lines)


def _fmt_result_error(res: Result) -> str:
    out = [f"[ERRO] {res.error_type or 'Erro'}: {res.error}"]
    if res.hint:
        out.append(f"[DICA] {res.hint}")
    return "\n".join(out)


HELP_TEXT = """\
IPHONE HACKER CONTROL — referência de comandos
----------------------------------------------
  help                 Mostrar esta ajuda
  clear                Limpar a tela do terminal
  device               Listar dispositivos Apple detectados
  device info          Modelo, versão do iOS, identificadores
  device battery       Nível da bateria e estado de carga
  device storage       Capacidade de armazenamento e espaço livre
  device network       MAC Wi-Fi/Bluetooth e informações de rede
  device screenshot    Capturar um PNG do dispositivo (se permitido)
  device reboot        Reiniciar o dispositivo (autorizado pelo proprietário)
  usb status           Estado da conexão USB e do serviço usbmux
  wifi status          Dispositivos visíveis na rede (requer sync Wi-Fi)
  system diagnostics   Relatório completo de diagnóstico (host + dispositivo)
  logs                 Mostrar o caminho do log e as últimas linhas
  mirror start         Abrir o painel de espelhamento de tela
  mirror stop          Fechar o painel de espelhamento de tela
  exit                 Sair do aplicativo

Observações:
  * Os comandos atuam somente no seu dispositivo, com autorização.
  * Nenhum bypass de bloqueio/Face ID, extração de dados ou exploração é feito.
  * Recursos que exigem um dispositivo avisam quando nenhum está conectado.\
"""


class TerminalEngine:
    def __init__(self, device: Optional[DeviceManager] = None) -> None:
        self.device = device or DeviceManager()

    # -- despacho ------------------------------------------------------------

    def execute(self, line: str) -> EngineResponse:
        raw = (line or "").strip()
        if not raw:
            return EngineResponse("", ok=True)

        try:
            parts = shlex.split(raw)
        except ValueError as exc:
            return EngineResponse(f"[ERRO] erro de análise: {exc}", ok=False)

        cmd = parts[0].lower()
        args = parts[1:]

        handler = {
            "help": self._help,
            "?": self._help,
            "ajuda": self._help,
            "clear": self._clear,
            "cls": self._clear,
            "limpar": self._clear,
            "device": self._device,
            "usb": self._usb,
            "wifi": self._wifi,
            "system": self._system,
            "logs": self._logs,
            "mirror": self._mirror,
            "exit": self._exit,
            "quit": self._exit,
            "sair": self._exit,
        }.get(cmd)

        if handler is None:
            return EngineResponse(
                f"[ERRO] comando desconhecido: {cmd!r}. Digite 'help' para ver a lista.",
                ok=False,
            )
        try:
            return handler(args)
        except Exception as exc:  # nunca esconder erros; nunca derrubar o terminal
            log.exception("comando %r falhou", raw)
            return EngineResponse(
                f"[ERRO] {type(exc).__name__}: {exc}", ok=False
            )

    # -- handlers ------------------------------------------------------------

    def _help(self, args) -> EngineResponse:
        return EngineResponse(HELP_TEXT)

    def _clear(self, args) -> EngineResponse:
        return EngineResponse("", action="clear")

    def _exit(self, args) -> EngineResponse:
        return EngineResponse("Encerrando o IPHONE HACKER CONTROL...", action="exit")

    def _logs(self, args) -> EngineResponse:
        log_file = logs_dir() / "iphone-hacker-control.log"
        text = [f"Arquivo de log: {log_file}"]
        try:
            if log_file.exists():
                lines = log_file.read_text(encoding="utf-8", errors="replace").splitlines()
                tail = lines[-15:]
                text.append("--- últimas %d linhas ---" % len(tail))
                text.extend(tail)
            else:
                text.append("(ainda não há arquivo de log)")
        except Exception as exc:
            text.append(f"[ERRO] não foi possível ler o log: {exc}")
        return EngineResponse("\n".join(text))

    def _device(self, args) -> EngineResponse:
        sub = args[0].lower() if args else "list"

        if sub in ("list", ""):
            res = self.device.detect()
            if not res.ok:
                return EngineResponse(_fmt_result_error(res), ok=False)
            devices = res.data or []
            if not devices:
                return EngineResponse(
                    "Nenhum dispositivo detectado. Conecte um iPhone via USB, "
                    "desbloqueie-o e toque em 'Confiar neste computador'."
                )
            lines = [f"{len(devices)} dispositivo(s) detectado(s):"]
            for d in devices:
                lines.append(
                    f"  - serial={d.get('serial')} "
                    f"conexão={d.get('connection_type')}"
                )
            return EngineResponse("\n".join(lines))

        if sub == "info":
            res = self.device.info()
            if not res.ok:
                return EngineResponse(_fmt_result_error(res), ok=False)
            d = res.data
            name = d.get("MarketingName") or d.get("ProductType") or "iPhone"
            return EngineResponse(_kv(f"Informações do dispositivo ({name}):", {
                "Nome": d.get("DeviceName"),
                "Marketing": d.get("MarketingName") or "(não mapeado)",
                "Identificador": d.get("ProductType"),
                "Versão do iOS": d.get("ProductVersion"),
                "Build": d.get("BuildVersion"),
                "Nº do modelo": d.get("ModelNumber"),
                "Hardware": d.get("HardwareModel"),
                "Arq. CPU": d.get("CPUArchitecture"),
                "UDID": d.get("UniqueDeviceID"),
            }))

        if sub == "battery":
            res = self.device.battery()
            if not res.ok:
                return EngineResponse(_fmt_result_error(res), ok=False)
            d = res.data
            pct = d.get("CurrentCapacity")
            return EngineResponse(_kv("Bateria:", {
                "Nível": f"{pct}%" if pct is not None else "n/d",
                "Carregando": d.get("IsCharging"),
                "Energia externa": d.get("ExternalConnected"),
                "Totalmente carregada": d.get("FullyCharged"),
                "Ciclos": d.get("CycleCount"),
            }))

        if sub == "storage":
            res = self.device.storage()
            if not res.ok:
                return EngineResponse(_fmt_result_error(res), ok=False)
            h = res.data.get("human", {})
            return EngineResponse(_kv("Armazenamento:", {
                "Total": h.get("total"),
                "Partição de dados": h.get("data_total"),
                "Disponível": h.get("available"),
                "Usado (aprox.)": h.get("used"),
            }))

        if sub == "network":
            res = self.device.network()
            if not res.ok:
                return EngineResponse(_fmt_result_error(res), ok=False)
            d = res.data
            return EngineResponse(_kv("Rede:", {
                "MAC Wi-Fi": d.get("WiFiAddress"),
                "MAC Bluetooth": d.get("BluetoothAddress"),
                "MAC Ethernet": d.get("EthernetAddress"),
                "Observação": d.get("IPAddressNote"),
            }))

        if sub == "screenshot":
            res = screenshot_mod.capture_to_file(serial=self.device.serial)
            if not res.ok:
                return EngineResponse(_fmt_result_error(res), ok=False)
            return EngineResponse(
                f"Captura salva: {res.data} ({res.meta.get('size')} bytes)"
            )

        if sub == "reboot":
            # Exige confirmação explícita para evitar reinícios acidentais.
            if not (len(args) > 1 and args[1].lower() in ("--yes", "-y", "confirm", "--sim")):
                return EngineResponse(
                    "Isso vai REINICIAR o dispositivo. Execute novamente como:\n"
                    "  device reboot --yes",
                    ok=True,
                )
            res = self.device.reboot()
            if not res.ok:
                return EngineResponse(_fmt_result_error(res), ok=False)
            return EngineResponse(str(res.data))

        return EngineResponse(
            f"[ERRO] subcomando 'device' desconhecido: {sub!r}. "
            "Tente: info | battery | storage | network | screenshot | reboot",
            ok=False,
        )

    def _usb(self, args) -> EngineResponse:
        sub = args[0].lower() if args else "status"
        if sub != "status":
            return EngineResponse("[ERRO] tente: usb status", ok=False)
        res = usb_mod.status()
        if not res.ok:
            return EngineResponse(_fmt_result_error(res), ok=False)
        d = res.data
        lines = [f"Status USB: {d.get('usb_count')} dispositivo(s), "
                 f"usbmux acessível={d.get('usbmux_reachable')}"]
        for dev in d.get("devices", []):
            lines.append(f"  - serial={dev.get('serial')} conexão={dev.get('connection')}")
        return EngineResponse("\n".join(lines))

    def _wifi(self, args) -> EngineResponse:
        sub = args[0].lower() if args else "status"
        if sub != "status":
            return EngineResponse("[ERRO] tente: wifi status", ok=False)
        res = wifi_mod.status()
        if not res.ok:
            return EngineResponse(_fmt_result_error(res), ok=False)
        d = res.data
        lines = [f"Status Wi-Fi: {d.get('network_count')} dispositivo(s) visível(is) na rede"]
        for dev in d.get("devices", []):
            lines.append(f"  - serial={dev.get('serial')} conexão={dev.get('connection')}")
        lines.append(f"  obs.: {d.get('note')}")
        return EngineResponse("\n".join(lines))

    def _system(self, args) -> EngineResponse:
        sub = args[0].lower() if args else ""
        if sub != "diagnostics":
            return EngineResponse("[ERRO] tente: system diagnostics", ok=False)
        res = diag_mod.full_report(self.device)
        if not res.ok:
            return EngineResponse(_fmt_result_error(res), ok=False)
        r = res.data
        out = [f"Diagnóstico do sistema — modo: {r.get('mode')}", ""]
        out.append(_kv("Host:", r.get("host", {})))
        det = r.get("detection", {})
        out.append("")
        out.append(_kv("Detecção:", {
            "ok": det.get("ok"),
            "dispositivos": det.get("count"),
            "erro": det.get("error"),
        }))
        if r.get("device"):
            d = r["device"]
            out.append("")
            out.append(_kv("Dispositivo:", {
                "Nome": d.get("DeviceName"),
                "Identificador": d.get("ProductType"),
                "iOS": d.get("ProductVersion"),
                "Build": d.get("BuildVersion"),
            }))
        if r.get("battery") and "error" not in r["battery"]:
            out.append("")
            out.append(_kv("Bateria:", {
                "Nível": f"{r['battery'].get('CurrentCapacity')}%",
                "Carregando": r["battery"].get("IsCharging"),
            }))
        if r.get("storage") and "error" not in r["storage"]:
            h = r["storage"].get("human", {})
            out.append("")
            out.append(_kv("Armazenamento:", {"Total": h.get("total"),
                                              "Disponível": h.get("available")}))
        return EngineResponse("\n".join(out))

    def _mirror(self, args) -> EngineResponse:
        sub = args[0].lower() if args else ""
        if sub == "start":
            return EngineResponse(
                "Abrindo painel de espelhamento...", action="mirror_start"
            )
        if sub == "stop":
            return EngineResponse(
                "Fechando painel de espelhamento...", action="mirror_stop"
            )
        return EngineResponse("[ERRO] tente: mirror start | mirror stop", ok=False)
