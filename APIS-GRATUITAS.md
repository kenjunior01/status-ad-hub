# APIs Gratuitas Integradas — StatusAds Connect

Todas as APIs usadas pela plataforma que são **100% gratuitas, sem chave de registo,
sem cartão e sem limite prático** para o uso normal de um app de segurança pessoal.
Implementadas em `src/lib/free-apis.ts` e nos serviços nativos do browser.

## Resumo

| API / Serviço | Para que serve na plataforma | Custo | Chave |
|---|---|---|---|
| **OpenStreetMap Nominatim** | Morada a partir do GPS (geocodificação inversa) — Emergency, Diagnósticos, Viagens | Grátis | Não |
| **OpenStreetMap tiles** | Mapas ao vivo (Emergency, Track público, Radar, Dashboard) via Leaflet | Grátis | Não |
| **ipapi.co / ipwho.is / GeoJS** | IP externo, cidade e operador (fallback em cadeia) — Diagnósticos | Grátis | Não |
| **Open-Meteo** | Meteorologia actual em viagens — Condições da Viagem | Grátis | Não |
| **wa.me (WhatsApp deep-link)** | Alerta SOS por WhatsApp aos contactos — sem gateway pago | Grátis | Não |
| **Web Push + VAPID** | Notificações em fundo (service worker) | Grátis | Só VAPID (self-gerada) |
| **Geolocation API** | GPS em tempo real (SOS, viagens, radar) | Grátis | Não (permissão) |
| **Battery Status API** | Nível de bateria no SOS e Diagnósticos | Grátis | Não |
| **Network Information API** | Tipo/velocidade de conexão — Diagnósticos | Grátis | Não |
| **MediaRecorder API** | Gravação de áudio como evidência | Grátis | Não |
| **Vibration API** | Padrão táctil no SOS e countdown | Grátis | Não |
| **Web Audio API** | Sirene/alarme de emergência (sem ficheiros) | Grátis | Não |
| **Wake Lock API** | Manter ecrã ligado em emergência/viagem (`src/lib/free-apis.ts`) | Grátis | Não |
| **Web Share API** | Partilhar link de rastreio (fallback: clipboard) | Grátis | Não |
| **Clipboard API** | Copiar coordenadas, números de pagamento, links | Grátis | Não |
| **Service Worker + IndexedDB** | PWA offline-first e fila de emergências | Grátis | Não |
| **Supabase (free tier)** | Base de dados, auth, RLS, realtime, storage | Grátis até 500 MB | Project key |

## Onde cada uma vive no código

- `src/lib/free-apis.ts` — Nominatim (`reverseGeocode`), IP (`getIpInfo` com 3
  fallbacks HTTPS), Open-Meteo (`getWeather`, `weatherLabel`), Battery
  (`getBatteryInfo`), Network Information (`getConnectionInfo`), Wake Lock
  (`requestWakeLock`), links úteis (`osmLink`, `googleMapsLink`, `whatsAppLink`).
- `src/pages/Diagnostics.tsx` — verificações "IP Externo & Operador",
  "Velocidade de Rede", "Bateria" e morada do GPS.
- `src/pages/Emergency.tsx` — morada aproximada mostrada junto às coordenadas.
- `src/pages/TripTracking.tsx` — cartão "Condições da viagem" (morada + tempo).
- `src/lib/share.ts` / `EmergencyQuickDial` — WhatsApp deep-links sem gateway.

## Notas e limites (todos folgados para produção)

- **Nominatim**: política de uso pede ≤ 1 pedido/segundo — a lib tem cache por
  coordenada (`geoCache`) e reutiliza resultados arredondados a 4 decimais (~11 m).
- **ipapi.co**: ~1.000 pedidos/dia grátis; se falhar, cai automaticamente para
  `ipwho.is` e depois `GeoJS`. Nunca bloqueia o app (todas as chamadas têm
  timeout e devolvem `null` em silêncio).
- **Open-Meteo**: 10.000 pedidos/dia grátis, sem registo.
- **Battery/Network/Wake Lock**: não existem no iOS Safari — o app trata como
  "não suportado" e continua a funcionar (verificado nos Diagnósticos).
- **Nada disto envia dados a terceiros para além do necessário**: Nominatim
  recebe apenas coordenadas de um ponto; os IPs dos utilizadores vão apenas ao
  serviço de geo-IP quando o utilizador abre os Diagnósticos.

## Quando upgrades fazem sentido (opcionais)

| Necessidade futura | Substituir por | Nota |
|---|---|---|
| SMS automático garantido | Twilio / Africa's Talking | Hoje é opcional; WhatsApp + Push cobrem o essencial |
| Push USSD do M-Pesa | API oficial Vodacom (PAYMENTS.md) | O pagamento manual já funciona sem isto |
| Morada offline | Base de endereços própria | Nominatim cobre online com cache |
