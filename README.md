# 🛡️ StatusAds Connect v3.19.0

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
