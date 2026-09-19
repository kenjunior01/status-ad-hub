# 🛡️ StatusAds Connect v3.40.0

**App de segurança pessoal anti-rapto com SOS offline-first, camuflagem,
radar Wi-Fi/BLE e monetização 100% manual (zero API).** Feito para
Moçambique 🇲🇿 — funciona na rede de qualquer operadora, sem depender de
gateways de pagamento ou SMS.

> 📦 **Publicar o teu projecto?** Segue o guia passo-a-passo: **[PUBLICAR.md](./PUBLICAR.md)**

---

## ✨ Funcionalidades

### Emergência (o núcleo)
- **SOS multi-canal** — botão long-press, voz ("socorro"), anéis/óculos BLE, queda, Dead Man's Switch
- **Deteção de queda com auto-SOS** — acelerómetro detecta queda livre + impacto; se não responderes em 15s, o SOS parte sozinho
- **Alerta aos contactos** — SMS (edge function opcional), WhatsApp deep-link (funciona sempre, sem API) e Web Push
- **Partilha pública de emergência** — página `/track/:token` para socorristas com ficha médica
- **Offline-first** — fila IndexedDB: a emergência é guardada e enviada quando a rede volta

### Discrição & escapatória
- **11 camuflagens** — o app disfarça-se de calculadora, clima, rádio, notas…
- **Chamada Falsa** — telefonema realista (nome, operadora, toque sintetizado, vibração) agendável para saíres com elegância
- **Anti-coerção** — PIN duress abre um dashboard falso; perigo real continua monitorizado
- **Modo Pânico** — bloqueio + gravação de áudio + fotos + SOS

### Protecção activa
- **Deteção de ameaças** — sensores analisam padrões anómalos (movimento, isolamento, sinal)
- **Copiloto AEGIS · IA (v3.19.0)** — analista de segurança conversacional
  que lê os dados REAIS da app (redes, rastreadores, locais, eventos, score)
  e responde em linguagem natural: "como estou protegido?", "o que
  melhorar?", "há rastreadores perto de mim?". Duas fontes de
  inteligência, sem furo de serviço:
  · **IA na nuvem** — edge function `ai-analyst` (LLM compatível OpenAI:
  OpenAI, z.ai/GLM, DeepSeek, Groq, OpenRouter…) activa com o secret
  `AI_API_KEY` no Supabase (rate-limit 20/h por utilizador, contexto
  anonimizado no cliente — MACs truncados, sem GPS)
  · **Analista Local** — motor de regras expert OFFLINE no dispositivo:
  funciona sempre, sem chave, sem enviar nada para fora; é o fallback
  automático quando a nuvem não responde. A web tem o chat dourado na
  Central de Segurança; a APK tem a **consola tática exclusiva**
  (verde-radar, typewriter, comandos BRIEFING/AMEACAS/RASTREADORES/
  CONSELHO). O Dashboard ganhou o **Briefing AEGIS** (faixa flutuante no
  telemóvel + card no painel do desktop)
- **APK Nativa Premium (v3.19.0)** — a versão Android agora comporta-se
  como uma app verdadeiramente nativa: **dock flutuante** (pill com blur,
  SOS elevado com anel de emissão, pílula dourada no item activo),
  **háptica leve a cada mudança de ecrã**, **transições suaves entre
  páginas**, **splash animada** no arranque (logo + anéis + barra de
  progresso) e respeito pela safe-area da status bar
- **Gestos nativos (v3.20.0)** — a app agora responde como um app nativa
  de topo:
  · **Pull-to-refresh** nos radares Wi-Fi e BLE — puxa para baixo para
  re-escanear o ambiente, com anel dourado, háptica ao cruzar o limiar e
  refresh confirmado com vibração (funciona também na web mobile)
  · **Long-press na dock = ações rápidas** — manter premido qualquer item
  da barra flutuante abre uma bottom-sheet com atalhos reais: Sentinela
  ON/OFF, verificação imediata do ambiente, Central de Segurança; no SOS:
  **Ligar 112**, **sirene de emergência** (liga/desliga) e **partilhar
  localização GPS** — tudo com háptica e transição spring nativa
  · **Skeleton de radar** — enquanto o scan captura pacotes de beacon, a
  lista mostra linhas fantasma com shimmer no ritmo do radar (dourado na
  web, verde-tático na APK) em vez de texto parado
  · **Pílula da dock com física spring** — o indicador dourado desliza
  suavemente entre itens (layout animation) e os itens afundam ao toque
  (press tátil estilo Material)
- **Gestos & Preferências (v3.21.0)** — a camada final de sensação nativa:
  · **Transições direcionais** — avançar desliza da direita, recuar da
  esquerda (push/pop de app nativa), calculado pela ordem de navegação
  · **Swipe horizontal entre abas** — deslize para os lados em qualquer
  ecrã para trocar de secção da dock (com guarda: não dispara sobre
  campos, tabelas com scroll horizontal ou folhas abertas)
  · **Interacção Tátil nas Configurações** — liga/desliga a vibração
  háptica e o swipe por dispositivo
  · **Háptica de ameaça** — rastreador novo detectado ou deslocamento
  abrupto para local desconhecido vibra forte (heavy), sem repetir
  (dedupe por sessão / 10 min)
  · **Pull-to-refresh na Central de Segurança** (web + tática) — puxar
  recarrega o diário e sincroniza eventos pendentes na nuvem
- **Folha Nativa & Micro-interacções (v3.22.0)** — os detalhes que fazem
  "parecer app de verdade":
  · **Arrastar para fechar a folha** — a folha de ações rápidas (dock e
  registos) segue o dedo com amortecimento e fecha com um deslize para
  baixo (> 90px ou com velocidade), como uma bottom-sheet do Android
  · **Ink ripple estilo Material** — onda tátil no ponto exacto do toque
  nos itens da dock, nas linhas das folhas e nas linhas dos registos
  (dourado na dock, branco nos registos; desligado com "reduzir movimento")
  · **Long-press nas linhas do registo Wi-Fi** (web + tática) — abrir o
  menu de contexto de cada rede: copiar SSID, copiar BSSID, partilhar a
  ficha completa (ficha nativa na APK) e **esquecer rede** (some do
  histórico — na APK via lista de ocultos, pois o registo vive no plugin)
  · **Long-press nas linhas do registo BLE** (web) — copiar nome, copiar
  MAC, partilhar detalhes e esquecer dispositivo
  · **copyText() robusto** — clipboard assíncrono com fallback clássico
  (funciona na WebView da APK e em browsers restritos)
- **Bloqueio de App (v3.23.0)** — a app fecha-se a chave, à maneira nativa:
  · **PIN 4-6 dígitos com hash local** — SHA-256 + salt aleatório por
  dispositivo; o PIN nunca sai do telemóvel (nada vai para a nuvem)
  · **Biometria WebAuthn** — desbloqueio por impressão digital / face:
  na APK usa o sensor do próprio Android (platform authenticator); na
  web usa Touch ID / Face ID / Windows Hello quando disponível
  · **Auto-lock ao sair da app** — bloqueia ao voltar de outro aplicativo
  (imediato, 1 min ou 5 min); em «Imediato» o ecrã de bloqueio aparece já
  no seletor de apps recentes, a cobrir o conteúdo
  · **Teclado nativo** — keycaps com ink ripple, háptica em camadas,
  pontos animados com spring, shake + registo de tentativas, e pausa
  anti-força-bruta de 15s após 5 erros
  · **Duress integrado** — o PIN anti-coerção desbloqueia em silêncio e
  entra em modo fantasma (painel falso), sem levantar suspeitas
  · **Emergência sempre acessível** — botão 112 no próprio ecrã de
  bloqueio; os overlays Guardião, Chamada Falsa, Pânico e Discreto
  continuam por cima do bloqueio, nunca presos atrás dele
- **Widget Nativo & SOS por Gesto (v3.24.0)** — a app salta para fora do
  ecrã, à maneira Android:
  · **Widget "Aegis SOS" no ecrã inicial** (APK) — 2×1 escuro com contorno
  dourado e botão vermelho de pânico: um toque dispara a cadeia completa
  do Guardião (contagem → contactos + SMS + GPS), a mesma do tile e do
  atalho do ícone; o resto do widget abre a app (respeita a camuflagem).
  Estático — zero bateria, nenhum dado sai do widget
  · **SOS secreto no ecrã de bloqueio** — manter o escudo premido 3s:
  anel vermelho de progresso, escudo fica vermelho, háptica crescente
  (light → medium → heavy) e a contagem do Guardião abre POR CIMA do
  bloqueio; sem Guardião armado, avisa sem disparar
  · **Biometria auto-diagnosticada** — se a impressão digital for removida
  nas definições do sistema, as Configurações avisam e sugerem re-enrolar
- **Widget Dinâmico (v3.25.0)** — o widget deixou de ser só um botão:
  · **Estado do Guardião em tempo real** — "GUARDIÃO ACTIVO" dourado quando
  a sentinela está armada, "GUARDIÃO INACTIVO" cinza quando não está;
  actualiza via ponte nativa (PanicPlugin → updateAll) a cada armar/
  desarmar, sem actualizações periódicas nem consumo de bateria
  · **Estado sobrevive a reinícios** — lê das guardian_prefs no arranque
  (onUpdate), em sintonia com a auto-cura da sentinela
  · **Dica de descoberta no card do Guardião** (só APK) — explica como
  adicionar o widget ao ecrã inicial
- **Backup & Restauro do Perfil (v3.26.0)** — trocar de telemóvel deixou
  de significar reconfigurar tudo:
  · **Exportação num ficheiro .json** — Guardião, Bloqueio de App (PIN/
  biometria/auto-lock), Anti-Coerção, PIN de desactivação do pânico,
  Chamada Falsa, Perfil Médico, tema, háptica e mais, num só toque
  · **Cifra opcional AES-GCM 256 + PBKDF2 (150k iterações)** — ligada por
  omissão: o ficheiro contém hashes de PINs e caches de contactos SOS,
  por isso via protegida por palavra-passe
  · **Importação com pré-visualização** — o ficheiro é validado (app/
  formato), descifrado e resumido por grupos legíveis antes de restaurar;
  só substitui depois de confirmação e a app reinicia para reler tudo
  · **Nada sensível de mais sai daqui** — sessão de coerção activa, tokens
  de autenticação, logs e caches de radar ficam de fora; contactos,
  plano e sessões vivem no servidor
- **Sincronização Total Web ↔ APK + Login Google Nativo (v3.35.0)** — a APK
  deixa de ter qualquer compartimento separado da versão web: MESMA conta,
  MESMOS dados, MESMO login social:
  · **Login Google na APK** — o botão Google passa a funcionar dentro da app
  nativa: abre o browser do sistema (@capacitor/browser oficial), o Supabase
  devolve por deep link (com.statusads.connect://login-callback — o scheme
  já partilhado com o SOS) e a sessão termina dentro da WebView via PKCE
  (exchangeCodeForSession) — resultado: a MESMA conta da web, com os MESMOS
  contactos, eventos, dispositivos e planos; na web o fluxo clássico mantém-se
  · **Botão Google também no Registo** — paridade total: "Google — mesma conta
  da web" no Login e no Registo (Apple mantém o mesmo fluxo adaptativo)
  · **Sincronização explícita** — novo cartão "Sincronização Web ↔ APK" na
  Central (web) e painel "SINCRONIZACAO · WEB ↔ APK" no HUD táctico (APK):
  mostra a conta activa e o provider (Email/Google), contagens de paridade
  (contactos/dispositivos/eventos na nuvem) e um botão "Sincronizar tudo"
  que empurra eventos de segurança pendentes, locais conhecidos (impressões
  Wi-Fi) e o registo de redes vistas; o registo BLE e o histórico de
  presenças ficam NO APARELHO por desenho de privacidade
  · **Versão nativa actualizada** — versionName 3.15.0 → 3.35.0 e versionCode
  47 no build.gradle: a APK volta a acompanhar a versão da app
  · **Configuração (uma vez)** — Google Cloud Console: credencial OAuth
  "Aplicação Web" com redirect https://<projecto>.supabase.co/auth/v1/
  callback → colar no Supabase (Authentication → Providers → Google) →
  adicionar com.statusads.connect://login-callback às Redirect URLs →
  npm run cap:sync para incluir o plugin no nativo
- **Memória de Presenças + Contexto no SOS + Widget que Resolve (v3.37.0)** —
  a app agora LEMBRA-SE de tudo, CONTA tudo a quem socorre e RESOLVE o maior
  risco da sentinela com um toque no ecrã inicial:
  · **Histórico de presenças no perfil cifrado** — o backup do perfil passa a
  mostrar o Histórico de Presenças (30 dias) com a contagem humana
  ("24 dispositivos · 3 com dono") e o restauro faz MERGE consciente em vez
  de overwrite cego: entradas novas do backup são adicionadas, entradas só
  locais são mantidas (nunca se perdem) e entradas comuns são fundidas com o
  melhor de cada (dono com prioridade local, contagens máximas sem duplicar,
  primeira/última vista reais, sinal mais recente) — trocar de telemóvel
  deixa de perder a memória de quem acompanha o utilizador; entradas
  manipuladas são filtradas por validação defensiva (id/kind/timestamps)
  · **Contexto de radar no SOS (relatório + email)** — no instante do SOS a
  app congela o snapshot de radar (leitura síncrona do storage) e envia-o
  para o relatório de entrega (linha "Ambiente" no Evento da nuvem — o Painel
  Admin vê o contexto de cada disparo) e para o EMAIL dos contactos com uma
  secção nova "AMBIENTE NO INSTANTE DO ALERTA": presenças dos últimos 15 min
  com os DONOS atribuídos ("Maria — Bluetooth (Galaxy A54, sinal -64dBm)"),
  local, precisão e risco — informação que as testemunhas ao vivo não têm;
  ambos os caminhos (online e offline) alimentam o relatório
  · **Isenção de bateria num toque no widget** — o aviso laranja
  "Isente a app da bateria" do widget passou de texto para BOTÃO: tocar nele
  abre o diálogo do sistema ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS (o
  mesmo da Central do Guardião, sem abrir a app); com fallback em cascata
  (lista de optimização de bateria → abrir a app) para OEMs exóticos; noutras
  alturas tocar na sub abre a app como o resto do widget; REC a gravar
  continua a ter prioridade sobre o aviso; versão nativa: versionCode 49,
  versionName 3.37.0
  · **RECOMPILAR APK OBRIGATÓRIO** (Java alterado): npm run cap:sync +
  Android Studio — o merge do backup, o contexto no SOS/email e o chip
  "Ambiente" funcionam já na web/PWA
- **Console Guardião — Ecrã Inicial de Design Próprio da APK (v3.40.0)** —
  por cima do arranque app-first da v3.39, a APK ganha o SEU ecrã inicial
  próprio (em vez de cair no Painel web): o Console Guardião, na identidade
  Tactical verde-radar da app nativa (mono, scanline, varrimento de radar):
  · **Raiz e pós-login** — "/" com sessão abre o Console Guardião
  (/dashboard/inicio); o login por senha e por Google também aterram no
  console; sem sessão abre o login — na web tudo continua igual
  · **SENTINELA em destaque** — armar/desarmar num toque, "verificar
  ambiente agora", risco ao vivo em medidor circular, local actual
  (impressão digital Wi-Fi) e veredicto correlacionado do ambiente
  · **CAMUFLAGEM pronta desde o arranque** — um toque activa o disfarce
  (ACTIVA/INACTIVA ao vivo), atalho para escolher disfarce e gestão do
  ícone do launcher; contagem À VOLTA / NO CAMINHO / COM DONO do
  histórico de presenças em tempo real
  · **Grelha de 12 acções rápidas** — SOS, Ligar 112, Sirene, Partilhar
  GPS, Radar Wi-Fi, Radar BLE, Central de Segurança, Cofre de Evidências,
  Viagens, Chamada Falsa, Check-in e Painel completo — tudo a um toque do
  primeiro ecrã
  · **Login nativo Tactical** — ecrã de app de verdade: compacto, Google
  EM PRIMEIRO LUGAR ("MESMA CONTA DA WEB"), duress tap (5 toques no
  escudo) mantido; modal de recuperação de senha partilhado entre as
  variantes web e nativa
  · **Dock e back** — o primeiro item da dock da APK é o Guardião (ícone
  de radar); o botão back do Android trata o console como "ecrã inicial"
  (sai da app lá, volta dentro dos restantes) e o back por defeito cai no
  console; na web a dock e o Painel ficam exactamente como estavam
- **Nativo Primeiro — A APK deixa de ser uma "web em app" (v3.39.0)** — a
  queixa era directa e justa: abrir a APK e encontrar uma página inicial com
  textos de marketing é coisa de site, não de app. A partir desta versão a
  APK comporta-se como app desde o primeiro segundo:
  · **Arranque directo à acção** — na APK a rota `/` NUNCA mostra a Landing
  de marketing: com sessão activa entra logo no Painel (o ecrã funcional com
  mapa, radar e SOS); sem sessão vai directo ao Login. A Landing continua a
  existir apenas na web, onde faz sentido como apresentação do produto
  · **Camuflagem logo apta no início** — chip "Camuflar" na faixa de estado
  do Painel (o primeiro ecrã da APK): um toque disfarça a app inteira no
  disfarce escolhido, com háptica e aviso de como voltar (long-press 2 s no
  canto superior esquerdo + PIN); quando a camuflagem já está activa, o chip
  passa a "Activa" e abre a gestão; "Camuflar agora" também entrou na folha
  de acções do long-press da dock
  · **Botão voltar do Android com comportamento de app** — fecha primeiro o
  que estiver aberto (folha de acções, menu lateral), depois recua um ecrã e,
  no Painel, sai da app; nunca fica preso dentro de overlays nem interrompe
  o utilizador no meio de nada
  · **Sem conceitos web na APK** — o "tour de funcionalidades" e o banner
  "instalar a PWA" deixaram de aparecer na app nativa (não faz sentido
  instalar uma PWA dentro de uma app já instalada); o Onboarding de
  emergência mantém-se porque configura contactos reais
  · **Login de app, não de site** — na APK o ecrã de entrada fica compacto
  (sem respiros de página web, respeitando a safe-area da status bar) e leva
  directo ao formulário e ao Google
  · **Versão nativa actualizada** — versionCode 51, versionName 3.39.0 no
  build.gradle; APK release assinada recompilada com o novo arranque
- **SMS "Com quem" + Sincronização que se Faz Sozinha (v3.38.0)** — a
  sincronização web ↔ APK deixa de depender da memória do utilizador e o
  canal mais fiável da app (o SMS que sai pelo SIM) passa a levar a resposta
  humana que as testemunhas ao vivo não têm:
  · **"Quem estava à volta" no SMS de emergência** — o histórico de presenças
  com donos atribuídos entra agora no SMS do SOS ("Com quem: Maria (BT),
  Pedro (WiFi); +5 sem dono."), em ambos os caminhos (online e offline);
  composição ASCII puro para o charset GSM 7-bit (nomes sanitizados, tecto
  de 3 donos ordenados por sinal mais forte, um dono por entrada), sem
  duplicar o "Ambiente" das redes nem o "Rastro BLE" — só entra quando há
  pelo menos um dono atribuído
  · **Sincronização automática na abertura** — havendo sessão activa, a app
  empurra sozinha o que ficou pendente (eventos, locais conhecidos, registo
  Wi-Fi) uma vez por sessão, silenciosa e sem bloquear o arranque; sem
  sessão, o botão "Sincronizar tudo" continua a ser o caminho
  · **"Última sincronização" sempre visível** — a marca da última corrida
  bem-sucedida fica persistida e aparece no cartão Sincronização (web) e no
  painel táctico da APK ("há 3 min" / "há 2 h" / "há 5 dias"), actualizada a
  cada 30 s e logo após cada sincronização manual
  · **APK compilada e entregue** — esta versão sai com a APK release assinada
  (versionCode 50, versionName 3.38.0) compilada pelo Gradle com o SDK 36,
  já com o plugin @capacitor/browser no nativo (o cap:sync em falta desde a
  v3.35.0 foi executado) — o login Google da APK funciona de verdade
- **Contexto Forense do REC + Presenças Exportáveis (v3.36.0)** — a prova de
  áudio deixa de responder só "o que se ouviu" e passa a responder também
  "QUEM estava à volta quando isto foi gravado":
  · **Snapshot de radar nas evidências nativas** — no instante em que o REC
  nativo começa (Modo Pânico, SOS, widget ou cartão do Guardião), a app
  congela o CONTEXTO: dispositivos à volta nos últimos 15 min (histórico de
  presenças: Wi-Fi e BLE com sinal e dono atribuído), local actual
  (impressão digital de BSSIDs), posição aproximada (fix do motor de rádio:
  lat/lng/precisão/rumo/velocidade) e risco do ambiente — tudo lido de
  forma síncrona do localStorage (o caminho do pânico não espera por
  scans) e enviado pela ponte nativa (PanicPlugin.startEvidence aceita
  {radar}; EvidenceService valida como JSON e guarda nos metadados)
  · **"Contexto do REC" no Cofre** — cada gravação nativa mostra o resumo
  numa linha ("4 Wi-Fi · 2 BLE · Local 1 · ±14 m · risco 35") e expande
  para a lista completa: redes e dispositivos com sinal, donos entre
  parênteses, local e coordenadas com precisão — o contexto vive só nos
  metadados da gravação, no aparelho (gravações antigas ficam sem o campo)
  · **Presenças exportáveis** — novo botão "Exportar" no cartão Companhias
  de Caminho: CSV com nome, dono, tipo, sinais, locais ("Local 1×12"),
  pontos de caminho, vezes em movimento e última posição (JSON também
  disponível via exportPresenceHistory) — a lista de presenças 30 dias
  sai do aparelho quando for preciso (advogado, polícia, seguro)
  · **Aviso de isenção de bateria no widget** — com o Guardião armado e a
  app SEM isenção das optimizações de bateria, o widget "Aegis SOS" mostra
  sub laranja "Isente a app da bateria — a sentinela morre adormecida"
  (o Android/OEM mata a sentinela quando o ecrã apaga — crítico em
  Xiaomi/Samsung); prioridade da linha: REC a gravar > bateria baixa >
  isenção em falta; versão nativa: versionCode 48, versionName 3.36.0
  · **RECOMPILAR APK OBRIGATÓRIO** (Java alterado): npm run cap:sync +
  Android Studio — o contexto forense é nativo (a web/PWA mantém o botão
  Exportar e tudo o resto)
- **AEGIS Expressive — Design e Tecnologias de Nova Geração (v3.34.0)** — os
  módulos de radar/posição/companhias ganham uma linguagem visual expressiva
  (inspirada no Material You do Flutter moderno, adaptada ao nicho Guardião:
  calma por defeito, vida só onde importa):
  · **Radar de Proximidade real** — novo componente circular com sweep a
  rodar (conic-gradient puro, zero JS) e blips; no cartão "Posição por
  Rádio" cada âncora fica na DIRECÇÃO e DISTÂNCIA reais do fix actual
  (ângulo = bearing, raio = haversine, escala adaptativa até 200 m) e no
  cartão "Companhias" quem está à volta fica no anel da força do sinal
  (perto/médio/longe) com ângulo estável por identidade
  · **Auroras tonais + vidro fosco + grão de filme** — os herós do "Contexto
  Actual" derivam massas de cor suaves (lavanda/céu/sálvia) só por
  transformações GPU, sob superfícies de vidro com blur/saturação e textura
  orgânica; tudo a respeitar prefers-reduced-motion
  · **Física de mola e cascata** — botões com press de overshoot (cubic-
  bezier elástico) e listas que nascem em cascata (entrada escalonada 60 ms)
  · **"NOVO NO CAMINHO" com haptics** — quando um dispositivo entra no seu
  caminho pela primeira vez, a app vibra ([18,70,18]) e brilha uma pílula
  de mel durante 90 s — na Central web e no HUD táctico da APK
  · **Tons por dono** — cada dono/nome ganha um tom estável da paleta
  (hash da identidade): avatares e blips tornam-se reconhecíveis à vista
  · **HUD táctico actualizado** — painel de Posição com radar táctico de
  âncoras ("COLOCACAO REAL · MAIS PROXIMA A N M") e painel de Companhias
  com flash NOVO; 'MODULO TATICO v3.34'
- **Companhias de Caminho — Histórico de 30 Dias (v3.33.0)** — o histórico de
  presenças passa a responder às perguntas que importam: quem está à volta,
  há quanto tempo, de quem são os dispositivos e quem esteve NO CAMINHO:
  · **Cada ciclo da sentinela grava presenças com contexto** — Wi-Fi e BLE
  vistos, sinal, local conhecido ("Local 1"…), posição aproximada e se o
  utilizador estava em movimento — retidos durante 30 dias (purga automática)
  · **Companhias de caminho** — dispositivos vistos em ≥2 pontos distintos do
  percurso (≥40 m entre pontos) marcados como "no caminho ×N": padrão de quem
  se desloca junto, não de quem apenas estava no mesmo sítio
  · **"De quem é?"** — atribua donos ("Maria", "carro do vizinho") num toque;
  o motor sugere pela correlação de local ("visto 18× em Casa — provavelmente
  alguém de lá"); donos aparecem no HUD táctico da APK
  · **Contexto actual** — quantos dispositivos à volta agora (janela 10 min),
  quantas companhias presentes, quantos já conhecidos
  · **Paleta suave** — os cartões de Posição por Rádio e Companhias trocam os
  tons duros por lavanda, céu, sálvia e areia (gradientes suaves, sem alarme
  visual desnecessário)
  · **Tudo LOCAL** — chave aegis-presence-devices, incluída na Limpeza de
  Dados › Radares; nada sobe para a nuvem
- **Posição por Rádio — Localização sem GPS (v3.32.0)** — o Guardião passa a
  prever a localização, o rumo e a direcção do aparelho pelas redes Wi-Fi e
  Bluetooth à volta, sem emparelhar, sem ligar-se a nada e sem tocar:
  · **Motor de posição por rádio** — cada ciclo da sentinela alimenta o motor
  com os BSSID/MAC + RSSI já vistos pelos radares; routers e dispositivos BLE
  tornam-se âncoras calibradas por GPS (centróide ponderado pelo sinal) e,
  com ≥3 âncoras navegáveis, a posição calcula-se SÓ pelo rádio
  (multilateração 1/d²) — funciona no interior de edifícios, onde o GPS morre
  · **RTT 802.11mc (Wi-Fi Round-Trip-Time)** — nos aparelhos com hardware
  compatível, a distância aos routers é MEDIDA em metros (tempo de voo do
  sinal), não estimada por sinal; sem hardware, o motor usa o modelo
  log-distância de RSSI automaticamente
  · **Predição textual de caminho** — "A seguir para NE · 9 km/h · ~90 m à
  frente · A aproximar-se de Casa (≈180 m)": rumo, velocidade e o local
  conhecido mais próximo, cruzado com os locais aprendidos pelo net-intel
  · **Dados máximos das redes** — cada scan Wi-Fi guarda agora também
  802.11mc/Passpoint/nome do recinto/operador, largura de canal, frequência
  central e idade da amostra; cada anúncio BLE guarda connectable e flags
  · **Web + APK** — cartão "Posição por Rádio" na Central de Segurança (web)
  e painel HUD táctico na APK, com actualizar/repor manuais; tudo LOCAL
  (chaves aegis-radio-*, incluídas na Limpeza de Dados — grupo Radares)
- **Marca de Origem nas Evidências Nativas (v3.31.0)** — cada gravação REC
  sabe onde nasceu:
  · **PÂNICO / SOS / REC** — badge de origem no Cofre › «No aparelho»:
  gravações do Modo Pânico ficam marcadas a vermelho, as da cadeia de SOS
  a âmbar e as manuais (widget / cartão do Guardião) em cinza — contexto
  forense de um olhar
  · **Notificação contextual** — a barra mostra "REC — evidência de pânico a
  gravar" (ou de SOS) durante a gravação, útil para quem apanha o telemóvel
  · **À prova de manipulação** — a tag é fixada no lado nativo (whitelist no
  PanicPlugin) e gravações antigas, sem tag, ficam como REC manual
- **Limpeza Seletiva de Dados (v3.30.0)** — apagar vestígios módulo a módulo,
  sem tocar nas definições:
  · **Nova secção «Limpeza de Dados» nas Configurações** — grupos medidos ao
  vivo (itens + espaço): Diário de Segurança, Relatórios de SOS, Testemunhas,
  Radares de Ambiente (BLE/Wi-Fi/locais), Caches de Contactos SOS, Evidências
  Locais, Bellvion, Registos Técnicos e Onboarding — cada um com caixa própria
  · **Testemunhas limpas a fundo no Android** — a limpeza apaga o registo
  nativo 24/7 (memória da sentinela viva + armazenamento + snapshot) via
  novo PanicPlugin.clearWitnessLog → GuardianService.clearWitnessData
  · **Nada essencial sai daqui** — definições de segurança (Guardião,
  Bloqueio de App, PINs), sessão de coerção activa, fila offline de
  emergências e dados da conta ficam intocados; confirmação em duas etapas
  e reinício automático para todos os módulos relerem o storage
- **Bateria da Sentinela no Widget (v3.29.0)** — o widget «Aegis SOS» passa a
  vigiar a bateria que sustenta a protecção:
  · **Nível a quente no estado** — com o Guardião armado, o widget mostra
  «GUARDIÃO ACTIVO · 78%»; lido directamente do BatteryManager a cada
  actualização (sem armazenar nada)
  · **Aviso âmbar de bateria baixa** — a ≤20% (o mesmo limite do alerta
  interno da app), o estado fica âmbar e o sub-título passa a «Bateria
  baixa — carregue o telemóvel»: a sentinela e o SOS morrem com o
  telemóvel, o widget avisa antes
  · **Zero polling** — o nível é mantido fresco pelo novo
  AegisBatteryReceiver, que escuta o sticky broadcast protegido
  ACTION_BATTERY_CHANGED (isento da proibição de broadcasts em segundo
  plano); assinatura anti-churn evita repintar quando nada visível mudou
- **REC Nativo na Cadeia de Pânico (v3.28.0)** — a evidência do momento crítico
  deixou de depender do WebView:
  · **Modo Pânico grava pelo serviço nativo** — ao disparar (agitação, Power ×4,
  fio BT, atalho ou botão), o áudio arranca no EvidenceService foreground:
  se fecharem/despacharem a app, a gravação CONTINUA e o ficheiro .m4a fica
  no aparelho (Cofre › «No aparelho»); ao desarmar, a gravação para e fica
  registada no diário de eventos
  · **SOS simples também prefere o REC nativo** — a gravação automática de 120 s
  passa a usar o serviço nativo quando existe; se o REC já estiver activo
  (widget/cartão), a mesma gravação continua — nunca duas a disputar o
  microfone; em web/PWA (ou nativo indisponível) usa o gravador do WebView
  como sempre
  · **Zero configuração** — respeita o interruptor «Gravação automática» do
  Guardião (agora aplicado a TODA a cadeia de pânico; desligado: sem áudio
  automático, as fotos de pânico continuam) e funciona em modo silencioso;
  permissão de microfone pedida apenas quando falta
- **Evidências Nativas & REC no Widget (v3.27.0)** — a gravação deixou de
  morrer quando fecham a app:
  · **Serviço nativo de gravação (EvidenceService)** — MediaRecorder num
  serviço foreground com tipo «microfone»: o áudio CONTINUA com o ecrã
  apagado e a app despachada — exactamente o momento em que a evidência
  mais importa; auto-stop aos 15 min, notificação discreta com acção
  «Parar», mono AAC (~11 MB por 15 min)
  · **Botão REC no widget** — junto ao SOS: um toque liga a gravação, o
  botão passa a PARAR vermelho e o sub-título mostra «REC — a gravar
  evidência»; gravações futuras actualizam o widget em tempo real
  · **Botão REC no cartão do Guardião** — com timer mm:ss ao vivo e
  pulsação vermelha enquanto grava
  · **Secção «No aparelho» no Cofre de Evidências** — lista dos .m4a
  nativos (data, duração, tamanho) com partilha directa via FileProvider
  (WhatsApp, Telegram, SMS, e-mail); ficam só no telemóvel, sem nuvem
  · **Deep link com.statusads.connect://evidence** — autónomo do Guardião
  (grava sem estar armado) e ignorado em modo de coerção por segurança
- **Central de Segurança (v3.17.0)** — score de segurança 0-100, ameaças do
  ambiente, rastreadores detectados, checklist de prontidão e **diário de
  eventos de segurança** (ameaças, rastreadores, SOS, sistema) com sync na
  nuvem e exportação CSV. Na APK veste o design exclusivo "Tactical HUD"
- **Vigilância Contínua (v3.17.0)** — sentinela que escana Wi-Fi + BLE a cada
  45s, alimenta os registos, classifica o risco ao longo do tempo (sparkline)
  e escreve tudo no diário — retoma-se sozinha ao reabrir a app
- **Inteligência de Ambiente (v3.18.0)** — a camada que correlaciona TUDO:
  veredicto do ambiente (calmo/elevado/crítico) combinando rede + Bluetooth +
  local; **locais conhecidos por impressão digital Wi-Fi** (hash estável dos
  BSSIDs dominantes — casa, trabalho, etc. ficam etiquetados sem revelar
  endereço) com **detecção de deslocamento abrupto para local desconhecido**
  (sinal clássico de rapto/coação — entra no diário com severidade ALTA e no
  SMS/email do SOS); **congestionamento de canais** com recomendação do
  melhor canal (1/6/11 em 2.4 GHz); **fabricante por OUI** (Samsung, TP-Link,
  Huawei…); classificação router/hotspot/mesh/enterprise/oculta; tendência de
  sinal por rede (a aproximar-se? a afastar-se?); classificação BLE
  (rastreador/telemóvel/áudio/vestível/veículo) também na web; locais
  sincronizam na nuvem (tabela `place_fingerprints`) e exportam em CSV/JSON
- **Radar Wi-Fi & Redes (v3.16.0)** — captura e regista TODAS as redes Wi-Fi próximas
  SEM SE LIGAR a elas (BSSID, SSID, sinal, canal, banda, segurança) + operadora móvel
  e torres celulares visíveis. Análise de segurança integrada: redes abertas, WEP/WPA
  quebradas, **evil twins** (mesmo SSID com vários BSSID), honeypots de nome suspeito,
  redes novas no ambiente e índice de risco do local. Registo persistente de todas as
  redes já vistas (1.ª vez, última vez, nº de vezes, GPS aproximado) + rastro automático
  que sai com o SOS e sincroniza na nuvem. **Novo v3.17:** busca/filtro no registo,
  exportação CSV/JSON e sync do registo na nuvem (tabela `wifi_registry`)
- **Radar Bluetooth** — dispositivos BLE próximos sem emparelhar (MAC, fabricante, distância).
  **Novo v3.17:** registo persistente de todos os dispositivos já vistos + **detecção de
  rastreadores/perseguidores** (AirTag, SmartTag, Tile, Chipolo e padrão "quem te segue"),
  exportação CSV/JSON e descoberta manual via Web Bluetooth na web
- **Design exclusivo na APK** — "Tactical Grid": HUD militar verde-radar com varrimento
  de sonar, só existe na versão nativa; a web mantém a identidade dourada
- **Rastreamento de viagem** — partilha a localização em tempo real durante trajetos
- **Check-in seguro** — prova de vida programada
- **Radar comunitário** — alertas de segurança de outros utilizadores na zona
- **Rota segura** — caminhos com mais luz e movimento
- **Cofre de evidências** — gravações protegidas com hora e local
- **Ficha médica** — tipo sanguíneo, alergias e medicação visíveis a socorristas
- **Dicas de segurança** — 45+ dicas práticas localizadas + dica do dia

### Monetização (zero API)
- **Planos** — Grátis / Família 249 MT / Premium 499 MT (configuráveis no admin)
- **Checkout manual** — utilizador paga nos TEUS números (M-Pesa, e-Mola, mKesh, banco, PayPal) e submete o ID da transacção
- **Aprovação no painel admin** — confirmas o pagamento, a subscrição activa +31 dias automaticamente (trigger SQL)
- **Painel Admin completo** — 7 páginas: métricas, utilizadores, pagamentos, assinaturas, eventos, planos e configurações de pagamento

---

## 🧱 Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind + shadcn/ui |
| Estado | TanStack Query + hooks singleton (`useSyncExternalStore`) |
| Backend | Supabase (Postgres + RLS + Auth + Realtime + Edge Functions opcionais) |
| PWA | vite-plugin-pwa (150 entradas precache) |
| Nativo | Capacitor 8 (ver [BUILD-NATIVA.md](./BUILD-NATIVA.md)) |
| APIs gratuitas | Geolocation, Nominatim (moradas), geo-IP (ipapi/ipwho/GeoJS), Open-Meteo (clima), WebAudio (toques/sirenes) — **nenhuma requer chave** |

---

## 🚀 Arranque rápido

```bash
npm install
npm run dev          # desenvolvimento (http://localhost:8080)
npm run build        # produção (dist/)
```

### Configuração mínima
1. Copia `.env.example` → `.env` e preenche `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
2. Corre `supabase/APLICAR-TUDO.sql` no SQL Editor do Supabase (todas as tabelas + RLS + planos)
3. Torna-te admin: `update profiles set role='admin' where user_id = (select id from auth.users where email='teu@email');`
4. Publica seguindo o [PUBLICAR.md](./PUBLICAR.md)

---

## 📚 Documentação

| Ficheiro | Conteúdo |
|----------|----------|
| **[PUBLICAR.md](./PUBLICAR.md)** | ⭐ Guia de publicação em 6 passos (30 min) |
| [APIS-GRATUITAS.md](./APIS-GRATUITAS.md) | APIs free integradas e os seus limites |
| [PAYMENTS.md](./PAYMENTS.md) | Fluxo de pagamento manual + gateway automático (opcional) |
| [BUILD-NATIVA.md](./BUILD-NATIVA.md) | APK Android / iOS com Capacitor + BLE em fundo |
| [DEPLOY.md](./DEPLOY.md) | Referência técnica completa (v2.7) |
| `supabase/APLICAR-TUDO.sql` | Todas as migrations consolidadas num ficheiro |

---

## 🔒 Segurança por design

- **RLS em todas as tabelas** — cada utilizador só acede aos seus dados
- **Aprovação manual de pagamentos** — nenhum gateway, nenhum segredo no frontend
- **CSP estrito (sem `unsafe-eval`)** + anon key apenas (service_role nunca no cliente)
- **Edge functions autenticadas** — todas exigem JWT de utilizador (com verificação de
  ownership) ou service_role key; CORS com allowlist de origens; rate limiting por conta
  (`send-sms` 3 SMS/hora, `notify-contacts` 5/10 min, `web-push` 10/min)
- **Webhook de pagamentos blindado** — define `PAYMENT_WEBHOOK_SECRET` nos secrets das
  edge functions; sem ele, só confirmações demo autenticadas (JWT + ownership) são aceites
- **Anti força-bruta na BD** — rate limits nos RPCs de activação/admin/promoções +
  `security_attempt_log` e auditoria em Painel Admin → Segurança
- **Emergência à prova de falha** — retries com backoff, fila offline, alarme local independente de rede

### Redeploy das edge functions (obrigatório após actualizar)

```bash
supabase functions deploy send-sms notify-contacts web-push notify-missed-checkin payments-webhook create-payment
# E define o segredo do webhook no Dashboard → Edge Functions → Secrets:
#   PAYMENT_WEBHOOK_SECRET=<string aleatória forte>
```

---

## 🗺️ Roadmap

- [x] v3.0 — Rebrand dourado + escolha de instalação (PWA/Nativa/Camuflada)
- [x] v3.1 — Pagamentos manuais zero API + painéis completos + APIs gratuitas
- [x] v3.2 — Deteção de queda + Chamada Falsa + 45 dicas de segurança
- [x] v3.15 — Radar Bluetooth (rastro GPS + testemunhas BLE)
- [x] v3.16 — Radar Wi-Fi & Redes: captura de todas as redes próximas + análise
      de segurança (evil twins, honeypots, redes abertas) + torres celulares +
      design exclusivo "Tactical Grid" na APK + tabela `net_trails` na nuvem
- [x] v3.18 — Inteligência de Ambiente: locais conhecidos por impressão
      digital Wi-Fi + detecção de deslocamento abrupto (anti-rapto),
      veredicto correlacionado, congestionamento de canais, fabricante por
      OUI, classificação de redes/BLE e tabela `place_fingerprints`
- [x] v3.17 — Central de Segurança + Vigilância Contínua + registo BLE com
      detecção de rastreadores/perseguidores + diário de segurança na nuvem
      (`security_events`) + registo Wi-Fi na nuvem (`wifi_registry`) +
      exportação CSV/JSON de tudo o que o radar captura
- [ ] APK publicado na Play Store
- [ ] Notificações SMS ilimitadas (edge functions activas)
- [ ] Radar comunitário colaborativo entre operadoras

---

**Licença**: proprietária — © StatusAds Connect. Uso e modificação autorizados ao dono do projecto.
