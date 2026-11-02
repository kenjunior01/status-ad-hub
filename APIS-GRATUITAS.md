# APIs Gratuitas Integradas ? StatusAds Connect

Todas as APIs usadas pela plataforma que s?o **gratuitas e sem chave de registo**
para o uso normal de um app de seguran?a pessoal. Cada servi?o mant?m os seus
pr?prios limites e condi??es de utiliza??o.
Implementadas em `src/lib/free-apis.ts` e nos servi?os nativos do browser.

## Resumo

| API / Servi?o | Para que serve na plataforma | Custo | Chave |
|---|---|---|---|
| **OpenStreetMap Nominatim** | Morada a partir do GPS e pesquisa expl?cita de destinos em Mo?ambique ? Emergency, Diagn?sticos, Viagens e an?lise de percurso | Gr?tis, sujeito ? pol?tica de uso | N?o |
| **OpenStreetMap tiles** | Mapas ao vivo (Emergency, Track p?blico, Radar, Dashboard) via Leaflet | Gr?tis | N?o |
| **ipapi.co / ipwho.is / GeoJS** | IP externo, cidade e operador (fallback em cadeia) ? Diagn?sticos | Gr?tis | N?o |
| **Open-Meteo** | Meteorologia actual em viagens ? Condi??es da Viagem | Gr?tis | N?o |
| **wa.me (WhatsApp deep-link)** | Alerta SOS por WhatsApp aos contactos ? sem gateway pago | Gr?tis | N?o |
| **Web Push + VAPID** | Notifica??es em fundo (service worker) | Gr?tis | S? VAPID (self-gerada) |
| **Geolocation API** | GPS em tempo real (SOS, viagens, radar) | Gr?tis | N?o (permiss?o) |
| **Battery Status API** | N?vel de bateria no SOS e Diagn?sticos | Gr?tis | N?o |
| **Network Information API** | Tipo/velocidade de conex?o ? Diagn?sticos | Gr?tis | N?o |
| **MediaRecorder API** | Grava??o de ?udio como evid?ncia | Gr?tis | N?o |
| **Vibration API** | Padr?o t?ctil no SOS e countdown | Gr?tis | N?o |
| **Web Audio API** | Sirene/alarme de emerg?ncia (sem ficheiros) | Gr?tis | N?o |
| **Wake Lock API** | Manter ecr? ligado em emerg?ncia/viagem (`src/lib/free-apis.ts`) | Gr?tis | N?o |
| **Web Share API** | Partilhar link de rastreio (fallback: clipboard) | Gr?tis | N?o |
| **Clipboard API** | Copiar coordenadas, n?meros de pagamento, links | Gr?tis | N?o |
| **Service Worker + IndexedDB** | PWA offline-first e fila de emerg?ncias | Gr?tis | N?o |
| **Supabase (free tier)** | Base de dados, auth, RLS, realtime, storage | Gr?tis at? 500 MB | Project key |

## Onde cada uma vive no c?digo

- `src/lib/free-apis.ts` ? Nominatim (`reverseGeocode` e `searchAddress`), IP (`getIpInfo` com 3
  fallbacks HTTPS), Open-Meteo (`getWeather`, `weatherLabel`), Battery
  (`getBatteryInfo`), Network Information (`getConnectionInfo`), Wake Lock
  (`requestWakeLock`), links ?teis (`osmLink`, `googleMapsLink`, `whatsAppLink`).
- `src/pages/Diagnostics.tsx` ? verifica??es "IP Externo & Operador",
  "Velocidade de Rede", "Bateria" e morada do GPS.
- `src/pages/Emergency.tsx` ? morada aproximada mostrada junto ?s coordenadas.
- `src/pages/TripTracking.tsx` ? cart?o "Condi??es da viagem" (morada + tempo).
- `src/lib/share.ts` / `EmergencyQuickDial` ? WhatsApp deep-links sem gateway.

## Notas e limites de utiliza??o

- **Nominatim**: pol?tica de uso pede ? 1 pedido/segundo ? pedidos desta sess?o
  s?o serializados com intervalo m?nimo e resultados s?o guardados em cache.
  A pesquisa de destinos s? acontece ap?s ac??o expl?cita do utilizador; envia
  o texto pesquisado ao OpenStreetMap, nunca a posi??o actual nessa pesquisa,
  e limita resultados a Mo?ambique.
  A geocodifica??o inversa usa cache por coordenada arredondada a 4 decimais
  (~11 m); a pesquisa directa usa cache pelo texto pesquisado. Os mapas devem
  manter a atribui??o ? OpenStreetMap contributors.
- **Nominatim e OpenStreetMap**: servi?os comunit?rios sem garantia de
  disponibilidade ou SLA. A pol?tica p?blica do Nominatim pode mudar; para
  tr?fego elevado ou uso comercial, rev? os termos actuais e considera alojar
  ou contratar um fornecedor adequado.
- **ipapi.co**: ~1.000 pedidos/dia gr?tis; se falhar, cai automaticamente para
  `ipwho.is` e depois `GeoJS`. Nunca bloqueia o app (todas as chamadas t?m
  timeout e devolvem `null` em sil?ncio).
- **Open-Meteo**: 10.000 pedidos/dia gr?tis, sem registo.
- **Battery/Network/Wake Lock**: n?o existem no iOS Safari ? o app trata como
  "n?o suportado" e continua a funcionar (verificado nos Diagn?sticos).
- **Nada disto envia dados a terceiros para al?m do necess?rio**: Nominatim
  recebe as coordenadas necess?rias ? morada ou o texto do destino pesquisado;
  os IPs dos utilizadores v?o apenas ao servi?o de geo-IP quando o utilizador
  abre os Diagn?sticos.

## Quando upgrades fazem sentido (opcionais)

| Necessidade futura | Substituir por | Nota |
|---|---|---|
| SMS autom?tico garantido | Twilio / Africa's Talking | Hoje ? opcional; WhatsApp + Push cobrem o essencial |
| Push USSD do M-Pesa | API oficial Vodacom (PAYMENTS.md) | O pagamento manual j? funciona sem isto |
| Morada offline | Base de endere?os pr?pria | Nominatim cobre online com cache |
