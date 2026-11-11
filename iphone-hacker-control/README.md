# IPHONE HACKER CONTROL

Ferramenta de desktop para Windows para **conectar, diagnosticar, capturar e
espelhar o seu próprio iPhone**, com uma interface de terminal clássica estilo
"Matrix" (verde sobre preto).

É construída sobre a biblioteca aberta e documentada
[`pymobiledevice3`](https://github.com/doronz88/pymobiledevice3) e conversa com
o dispositivo pelo mesmo canal `usbmux`/`lockdown` que as próprias ferramentas
da Apple usam. **Sem jailbreak, sem exploits, sem bypass de bloqueio/Face ID.**
Ela faz apenas o que o sistema operacional permite a um computador *confiável*
autorizado pelo dono do dispositivo.

> ⚠️ **Escopo honesto.** O iOS é uma plataforma fechada. Este programa oferece
> diagnósticos reais e um espelhamento de tela somente leitura, mas **não pode**
> fornecer controle de toque remoto universal, extrair dados de apps nem burlar
> qualquer proteção. Onde um recurso não está disponível, o app diz isso
> claramente, em vez de forjar um resultado.

---

## Índice
1. [Recursos](#recursos)
2. [O que precisa do iPhone conectado](#o-que-precisa-do-iphone-conectado)
3. [Estrutura do projeto](#estrutura-do-projeto)
4. [Requisitos](#requisitos)
5. [Instalação](#instalação)
6. [Execução](#execução)
7. [Conectando por USB](#conectando-por-usb)
8. [Configurando o Wi-Fi (sem fio)](#configurando-o-wi-fi-sem-fio)
9. [Comandos do terminal](#comandos-do-terminal)
10. [Espelhamento e controle](#espelhamento-e-controle)
11. [Gerando um .exe standalone](#gerando-um-exe-standalone)
12. [Compatibilidade e limitações](#compatibilidade-e-limitações)
13. [Segurança e privacidade](#segurança-e-privacidade)
14. [Solução de problemas](#solução-de-problemas)

---

## Recursos

**Sempre disponível (mesmo sem dispositivo):**
- Animação de inicialização Matrix, cursor piscando, UI verde neon monoespaçada.
- Terminal integrado com interpretação real de comandos, histórico e validação.
- Diagnóstico de host + dependências (`system diagnostics`).
- Relato honesto de erros com dicas práticas. Erros nunca são escondidos.
- Funciona em **modo diagnóstico** quando nenhum iPhone está conectado — nunca
  inventa um dispositivo.

**Disponível quando um iPhone autorizado está conectado:**
- Detecção automática por USB e identificação de modelo / iOS.
- Informações de bateria, armazenamento e rede (MAC).
- Captura de tela do dispositivo (sujeito às permissões do iOS).
- Espelhamento de tela ao vivo, somente leitura (captura por polling).
- Status de pareamento / confiança e diagnóstico de conexão.
- Reinício do dispositivo (exige confirmação explícita).
- Ativação do sync por Wi-Fi e reconexão sem fio.

> As **palavras de comando** (help, device, usb status, ...) permanecem em
> inglês por serem a API definida do terminal; todo o texto exibido está em
> português.

---

## O que precisa do iPhone conectado

| Recurso | Funciona sem dispositivo | Precisa do dispositivo |
|--------|:-----------------------:|:----------------------:|
| UI Matrix, terminal, help | ✅ | |
| `system diagnostics` (seção host) | ✅ | |
| Checagens de dependências/ambiente | ✅ | |
| Detecção (`device`, `usb status`) | ✅ (informa 0) | ✅ mostra dados reais |
| `device info/battery/storage/network` | | ✅ |
| `device screenshot` | | ✅ |
| `mirror start` | | ✅ |
| `device reboot` | | ✅ |
| `wifi status` / sync Wi-Fi | | ✅ |

---

## Estrutura do projeto

```
iphone-hacker-control/
├─ main.py                 Ponto de entrada: splash -> checagens -> detecção -> UI
├─ requirements.txt
├─ install.bat             Cria venv + instala dependências (Windows)
├─ start.bat               Inicia o app (Windows)
├─ build_exe.bat           Gera um .exe standalone com PyInstaller
├─ README.md
├─ modules/                Backend (sem GUI, testado por unidade)
│  ├─ core.py              Backend async: usbmux/lockdown, Result, run_sync
│  ├─ device.py            DeviceManager: info/battery/storage/network/reboot
│  ├─ usb.py               Status USB + checagem de pareamento/confiança
│  ├─ wifi.py              Descoberta Wi-Fi, ativar sync, medição de qualidade
│  ├─ screenshot.py        Captura de tela (PNG)
│  ├─ mirror.py            Controlador de espelhamento (quadros por polling)
│  ├─ diagnostics.py       Relatório de diagnóstico host + dispositivo
│  ├─ terminal.py          Motor de comandos (lógica pura, testável)
│  └─ logging_setup.py     Log em arquivo com rotação
├─ interface/              GUI em PySide6
│  ├─ main_window.py       Janela, barra de título, janela de espelhamento
│  ├─ dashboard.py         Painéis de informação ao vivo + botões de ação
│  ├─ terminal_widget.py   Painel de terminal (execução em thread)
│  ├─ matrix_rain.py       Animação Matrix + fundo da tela de inicialização
│  └─ styles.py            Tema / folha de estilo
├─ logs/                   Logs de execução (ignorado pelo git)
└─ tests/                  Testes de unidade sem tela (pytest)
```

---

## Requisitos

- **Windows 10 / 11** (a GUI e os `.bat` são para Windows; o código Python em si
  é multiplataforma).
- **Python 3.10+** (3.12+ recomendado). Baixe em
  [python.org](https://www.python.org/downloads/) e marque
  *"Add python.exe to PATH"* durante a instalação.
- **App Apple Devices ou iTunes** instalado, para que o **Apple Mobile Device
  Service** (o `usbmuxd` do Windows) exista e esteja em execução. É ele que
  permite ao Windows falar com o iPhone por USB.

Dependências Python (instaladas automaticamente): `PySide6`, `pymobiledevice3`.

---

## Instalação

1. Baixe / clone esta pasta.
2. Dê dois cliques em **`install.bat`** (ou execute-o pelo terminal).
   Ele vai:
   - encontrar o seu Python,
   - criar um ambiente virtual local em `.venv`,
   - instalar as dependências,
   - verificar a instalação.

Alternativa manual:
```bat
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

---

## Execução

Dê dois cliques em **`start.bat`**, ou:
```bat
.venv\Scripts\python main.py
```

Flags úteis:
```bat
python main.py --no-splash     REM pula a animação de inicialização
python main.py --selftest      REM autoteste do backend (sem GUI), imprime resultados
```

Ao iniciar você verá a sequência Matrix, uma checagem de dependências, uma sonda
de dispositivo e então o dashboard + terminal. Sem iPhone conectado, abre em modo
diagnóstico.

---

## Conectando por USB

1. Instale o app **Apple Devices** (Microsoft Store) ou o **iTunes**, para que o
   Apple Mobile Device Service esteja em execução.
2. Conecte o iPhone ao PC com um cabo USB **de dados**.
3. **Desbloqueie** o iPhone. Quando aparecer *"Confiar neste computador?"*, toque
   em **Confiar** e digite sua senha.
4. No app, execute `device` (ou clique em **DETECTAR**). Seu dispositivo deve
   aparecer.
5. Execute `device info`, `device battery`, `device storage` para dados ao vivo.

Se `usb status` informar que o usbmuxd está inacessível, o Apple Mobile Device
Service não está instalado/rodando — instale o app Apple Devices ou o iTunes.

---

## Configurando o Wi-Fi (sem fio)

O acesso sem fio reutiliza o pareamento USB, então pareie por USB **primeiro**:

1. Conecte por USB e confie no computador (passos acima).
2. Ative o sync sem fio. Opções:
   - No terminal do app, este build expõe o helper de backend usado pelo
     dashboard; ou
   - No Finder/iTunes, ative *"Mostrar este iPhone quando no Wi-Fi"*.
3. Mantenha iPhone e PC na **mesma rede Wi-Fi**.
4. Agora você pode desconectar o USB. Execute `wifi status` para ver o
   dispositivo anunciado na rede. Diagnóstico e capturas passam a funcionar sem
   fio.

`wifi status` lista somente dispositivos realmente visíveis na rede — não inventa
um dispositivo sem fio.

---

## Comandos do terminal

```
help                 Mostrar a referência de comandos
clear                Limpar a tela do terminal
device               Listar dispositivos Apple detectados
device info          Modelo, versão do iOS, identificadores
device battery       Nível da bateria e estado de carga
device storage       Capacidade de armazenamento e espaço livre
device network       MAC Wi-Fi/Bluetooth e informações de rede
device screenshot    Capturar um PNG do dispositivo (salvo em screenshots/)
device reboot --yes  Reiniciar o dispositivo (exige confirmação)
usb status           Conexão USB + estado do serviço usbmux
wifi status          Dispositivos visíveis na rede (requer sync Wi-Fi)
system diagnostics   Relatório completo de diagnóstico (host + dispositivo)
logs                 Mostrar o caminho do log e as últimas linhas
mirror start         Abrir a janela de espelhamento de tela
mirror stop          Fechar a janela de espelhamento de tela
exit                 Sair do aplicativo
```

Comandos que alteram o dispositivo (ex.: `device reboot`) exigem confirmação
explícita. Comandos desconhecidos geram uma mensagem útil, nunca uma falha.

---

## Espelhamento e controle

`mirror start` abre uma janela que mostra a tela do dispositivo fazendo polling
do **serviço de captura** do iOS a alguns quadros por segundo. É uma visão **ao
vivo e somente leitura** — boa para acompanhar a tela, demos e diagnóstico.

**Sobre o controle por toque (resposta honesta).** Este build **não** injeta
toques, deslizes ou teclas. O iOS não oferece um canal geral de entrada remota a
um host confiável via lockdown. A automação real de entrada exige uma sessão
**WebDriverAgent** assinada pela Apple (como a usada pelo Appium / túnel WDA do
`pymobiledevice3`), que precisa do Modo de Desenvolvedor e assinatura no Xcode
configurados por você — é um processo separado e **não incluído** aqui. Clicar no
espelhamento informa isso claramente, em vez de simular um toque.

> O produto **iDesktop** foi avaliado como mecanismo de espelhamento/controle. É
> uma solução fechada de terceiros e não foi integrada aqui; este projeto usa o
> serviço de captura aberto e documentado, para que o comportamento seja
> transparente e auditável.

O espelhamento respeita os limites do iOS: telas protegidas (bloqueio/senha,
vídeo com DRM, algumas câmeras e telas seguras, apps que bloqueiam captura) podem
aparecer em branco ou falhar na captura. Isso é informado, não escondido.

---

## Gerando um .exe standalone

1. Instale e execute o app ao menos uma vez (para que o venv exista).
2. Dê dois cliques em **`build_exe.bat`**. Ele instala o PyInstaller e gera:
   ```
   dist\IphoneHackerControl\IphoneHackerControl.exe
   ```
   É usado um build **em pasta única** (one-folder) porque inicia mais rápido e é
   bem mais confiável para o PySide6 do que um arquivo único. Para tentar um
   arquivo único, acrescente `--onefile` ao comando do PyInstaller em
   `build_exe.bat`.

Alternativa manual:
```bat
.venv\Scripts\activate
pip install pyinstaller
pyinstaller --name IphoneHackerControl --windowed --clean --noconfirm ^
    --collect-all PySide6 --collect-all pymobiledevice3 main.py
```

---

## Compatibilidade e limitações

- **iPhone 17 Pro Max / iOS mais novo:** as consultas de identidade, bateria,
  armazenamento e rede usam serviços estáveis de lockdown/diagnostics que
  funcionam há muitas gerações do iOS e devem funcionar no hardware atual.
  Porém, **este build não foi testado contra o iOS 27**, e nenhum recurso é
  *declarado* funcional em uma versão do iOS que não foi testada. O app informa a
  **versão real** (`ProductVersion`/`ProductType`) que o dispositivo retorna; ele
  não afirma suporte a um SO não testado.
- **Nomes comerciais:** apenas identificadores conhecidos são mapeados para um
  nome comercial. Para um identificador não mapeado (ex.: um aparelho novíssimo),
  o app mostra o `ProductType` cru e o nome do próprio aparelho em vez de
  adivinhar.
- **Serviços de desenvolvedor no iOS 17+:** capturas e outros serviços de
  desenvolvedor podem exigir o **Modo de Desenvolvedor** (Ajustes → Privacidade e
  Segurança → Modo de Desenvolvedor) e, no iOS recente, um **túnel**
  RemoteServiceDiscovery que precisa de privilégios de administrador. Se um
  recurso precisar disso, o app avisa.
- **Sem entrada remota** sem WebDriverAgent (veja Espelhamento acima).

---

## Segurança e privacidade

Esta ferramenta é para uso no **seu próprio dispositivo, com sua autorização**.
Ela **não** faz e não fará:
- bypass de tela de bloqueio, senha ou Face ID,
- extração de senhas ou credenciais,
- invasão de dispositivos que você não possui,
- exploração de vulnerabilidades ou desativação de proteções do iOS,
- acesso clandestino a dados de aplicativos.

Decisões de privacidade neste build:
- Nenhum dado pessoal é transmitido a lugar algum; tudo fica local.
- Capturas são salvas localmente em `screenshots/` somente quando você pede.
- Logs em `logs/` registram operações e erros para diagnóstico e são ignorados
  pelo git. Apague-os quando quiser.
- `subprocess` não é usado para executar comandos arbitrários ou elevados.

---

## Solução de problemas

| Sintoma | Solução |
|--------|---------|
| "Não foi possível consultar o usbmuxd" | Instale o app Apple Devices / iTunes; garanta que o *Apple Mobile Device Service* esteja rodando. |
| Dispositivo não detectado | Use um cabo USB de dados, desbloqueie o aparelho, toque em **Confiar**. |
| Erros de pareamento/confiança | Desbloqueie o dispositivo e aceite o aviso de confiança; repareie por USB. |
| Captura falha no iOS 17+ | Ative o Modo de Desenvolvedor; pode ser necessário um túnel RSD (admin). |
| A GUI não inicia | Rode `install.bat` de novo; veja `logs/iphone-hacker-control.log`. |
| Quero os logs crus | Execute `logs` no terminal, ou abra `logs/iphone-hacker-control.log`. |

---

### Notas para desenvolvedores

- Rodar os testes sem tela: `python -m pytest tests/ -q`
- Autoteste do backend sem GUI: `python main.py --selftest`
- O backend (`modules/`) é propositalmente livre de GUI e assíncrono, acionado
  por `core.run_sync()`, de modo a ser testável por unidade sem dispositivo ou
  tela.
