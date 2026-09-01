# StatusAds Connect v2.7.0 — Guia de Deploy Completo

## Visao Geral

Plataforma de seguranca pessoal via BLE (Bluetooth Low Energy) para anti-sequestro.
O sistema detecta quando um dispositivo BLE e removido do utilizador, activa alarmes
e notifica contactos de emergencia via SMS e Push.

### Componentes

1. **Frontend** — React 18 + Vite + TypeScript (PWA, 90 precache entries)
2. **Supabase** — PostgreSQL + PostGIS + Auth + Realtime + Edge Functions
3. **Edge Functions** — Deno (send-sms, notify-contacts, web-push/send)

### Funcionalidades v2.7.0

- **BLE Anti-Kidnapping**: Monitoramento 15s, grace period 60s, haversine distance
- **GPS Geofence**: Zona de emergencia com cooldown 30s, saida automatica
- **Emergencia SOS**: Botao flutuante (long-press 800ms), sirene Web Audio, vibracao
- **Offline-First**: IndexedDB queue, sincronizacao automatica, rede detectada
- **PWA**: Service Worker, push notifications, instalavel no dispositivo
- **Mapa Tempo Real**: Leaflet dark, GPS trail, Circle geofence, markers pulsantes
- **Partilha Publica**: `/track/:token` sem autenticacao, 15s polling
- **SMS via Twilio**: Edge Functions, trigger automatico via pg_net
- **Web Push**: VAPID, notificacoes em fundo via Service Worker
- **Error Boundary System**: 4 camadas, IndexedDB error logger, SOS sobrevive crashes
- **Diagnostics**: 11 verificacoes automaticas, teste alarme, teste notificacao
- **Historico**: Filtros por periodo e tipo, detalhes expandidos, exportacao CSV

---

## PASSO 1: Configurar o Projeto Supabase

### 1.1 Criar o projecto

1. Aceda a [supabase.com](https://supabase.com) e crie um novo projecto
2. Anote o **Project URL** e **Anon Key** (Settings > API)
3. Regiao recomendada: Africa/Johannesburg

### 1.2 Executar o Schema SQL

1. Aceda ao **SQL Editor** no Supabase Dashboard
2. Cole o conteudo completo de `supabase-schema.sql`
3. Clique em **Run**
4. Verifique: 6 tabelas, 8 RPCs, triggers, RLS policies, PostGIS

```sql
-- Tabelas criadas:
-- profiles, devices, emergency_contacts, location_events,
-- emergency_alerts, push_subscriptions
```

### 1.3 Executar Migracoes Adicionais

Na ordem, no SQL Editor:

```bash
# 1. supabase/migrations/003_auto_notify_on_emergency.sql
# 2. supabase/migrations/004_settings_enhancements.sql
```

### 1.4 Configurar Segredos (Environment Secrets)

Settings > Edge Functions > Secrets:

| Chave | Valor | Onde Obter |
|-------|-------|------------|
| `TWILIO_ACCOUNT_SID` | `ACxxxxxxx` | [twilio.com/console](https://www.twilio.com/console) |
| `TWILIO_AUTH_TOKEN` | `xxxxxxxx` | Twilio Console > Keys & Tokens |
| `TWILIO_PHONE_NUMBER` | `+2588XXXXXXX` | Twilio Console > Phone Numbers |
| `VAPID_PRIVATE_KEY` | `xxxxxxxx` | Gerado localmente (PASSO 2) |
| `app.supabase_url` | `https://xxx.supabase.co` | Supabase Settings > API |
| `app.service_role_key` | `eyJxxxx` | Supabase Settings > API > service_role |

> O `service_role_key` bypassa RLS. Nunca exponha no frontend!

### 1.5 Configurar Parametros PostgreSQL

No SQL Editor:

```sql
INSERT INTO pg_settings (name, value)
VALUES 
  ('app.supabase_url', 'https://SEU-PROJETO.supabase.co'),
  ('app.service_role_key', 'SUA-SERVICE-ROLE-KEY')
ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;
```

---

## PASSO 2: Gerar Chaves VAPID

```bash
npx web-push generate-vapid-keys

# Public key  -> .env como VITE_VAPID_PUBLIC_KEY
# Private key -> Supabase Secrets como VAPID_PRIVATE_KEY
```

---

## PASSO 3: Configurar Twilio

1. Criar conta em [twilio.com](https://www.twilio.com)
2. Verificar numero de telefone
3. Comprar numero de telefone (ou usar trial)
4. Testar: `twilio sms:send --from +2588XXX --to +25884XXX "Teste StatusAds"`

---

## PASSO 4: Deploy das Edge Functions

```bash
npm install -g supabase
supabase login
supabase link --project-ref SEU-PROJECT-REF

supabase functions deploy send-sms
supabase functions deploy notify-contacts
supabase functions deploy web-push/send
```

---

## PASSO 5: Configurar o Frontend

### 5.1 Variaveis de Ambiente

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA-ANON-KEY
VITE_VAPID_PUBLIC_KEY=SUA-CHAVE-PUBLICA-VAPID
```

### 5.2 Build de Producao

```bash
npm install
npm run build
# Output em /dist (PWA com ~90 precache entries)
```

### 5.3 Deploy

**Vercel (Recomendado):** `vercel --prod`
**Netlify:** `netlify deploy --prod --dir=dist`
**Cloudflare Pages:** `npx wrangler pages deploy dist --project-name=statusads-connect`

---

## PASSO 6: Verificacao Final

### Checklist

- [ ] Login/Registo funciona
- [ ] Dashboard mostra estatisticas + mapa
- [ ] Adicionar dispositivo BLE (Chrome/Edge)
- [ ] Adicionar e **editar** contacto de emergencia
- [ ] Definir zona de emergencia (geofence)
- [ ] Activar emergencia (mapa, sirene, vibracao, GPS trail)
- [ ] Resolver emergencia / marcar falso alarme
- [ ] Link `/track/:token` funciona sem login
- [ ] Diagnostico do sistema: 11/11 verificacoes
- [ ] Push notifications activam
- [ ] Teste SMS envia mensagem
- [ ] Historico: filtros por tipo, exportacao CSV
- [ ] Offline: fila IndexedDB sincroniza ao reconectar
- [ ] SOSButton sobrevive a crash de pagina
- [ ] Erros: logs em Settings > Erros e Diagnostico

---

## Estrutura do Projecto

```
status-ad-hub/
├── public/
│   ├── manifest.json              # PWA manifest (v2.7.0)
│   ├── pwa-192x192.png            # PWA icons
│   ├── pwa-512x512.png
│   └── favicon.png
├── src/
│   ├── components/
│   │   ├── effects/               # 16+ animacao components
│   │   │   ├── AnimatedGrid, AuroraBackground, BeamBorder,
│   │   │   ├── CounterAnimated, FloatingOrbs, GlowCard,
│   │   │   ├── MagneticButton, Marquee, MorphingBlob,
│   │   │   ├── NoiseTexture, ParticleField, RippleButton,
│   │   │   ├── ScrollProgress, Shimmer, SpotlightCard, TextReveal, Typewriter
│   │   ├── layout/
│   │   │   └── DashboardLayout.tsx  # Sidebar + header + nav
│   │   ├── ui/                    # shadcn/ui (46 components)
│   │   ├── ErrorBoundary.tsx      # 4-layer error system
│   │   ├── ProximityPanel.tsx     # BLE real-time status
│   │   ├── SOSButton.tsx          # Floating SOS (long-press)
│   │   ├── OnboardingWizard.tsx   # First-run wizard
│   │   └── PWAInstallPrompt.tsx   # PWA install banner
│   ├── hooks/
│   │   ├── useAuth.tsx            # Supabase auth
│   │   ├── useBluetooth.tsx       # BLE context provider
│   │   ├── useDevices.ts          # Device CRUD
│   │   ├── useContacts.ts         # Contact CRUD
│   │   ├── useEmergency.ts        # Emergency trigger + alarm
│   │   ├── useEmergencyAlerts.ts  # Realtime alert subscription
│   │   ├── useEmergencyAlarm.ts   # Web Audio siren
│   │   ├── useGeofenceMonitor.ts  # GPS geofence v2 (offline queue)
│   │   ├── useGeolocation.ts      # GPS position
│   │   ├── useBackgroundTracking.ts # Persistent GPS logging
│   │   ├── useHistory.ts          # Events + dashboard stats
│   │   ├── useNotifications.tsx   # Push + local notifications
│   │   ├── useNetworkStatus.ts    # Online/offline detection
│   │   ├── useOfflineQueue.tsx    # IndexedDB offline queue
│   │   ├── usePWA.tsx             # PWA install state
│   │   ├── useProximityMonitor.ts # BLE anti-kidnapping v2
│   │   ├── useGlobalErrorHandlers.ts # Window error capture
│   │   └── useProfile.ts          # Profile CRUD
│   ├── lib/
│   │   ├── api.ts                 # All API + Realtime subscriptions
│   │   ├── emergency-alarm.ts     # Web Audio API siren (dual freq)
│   │   ├── error-logger.ts        # IndexedDB structured error logs
│   │   ├── supabase.ts            # Supabase client
│   │   ├── types.ts               # TypeScript domain types
│   │   ├── utils.ts               # Utilities (cn, etc.)
│   │   ├── web-bluetooth.ts       # BLE scan/pair/classify
│   │   ├── web-push.ts            # VAPID push subscription
│   │   └── share.ts               # Web Share API
│   ├── pages/
│   │   ├── Landing.tsx            # Marketing/landing page
│   │   ├── Login.tsx              # Auth login
│   │   ├── Register.tsx           # Auth register
│   │   ├── Dashboard.tsx          # Main dashboard + map
│   │   ├── Devices.tsx            # BLE device management
│   │   ├── EmergencyContacts.tsx  # Contact CRUD (edit fix)
│   │   ├── Emergency.tsx          # Emergency map + controls
│   │   ├── History.tsx            # Event timeline + CSV export
│   │   ├── Settings.tsx           # 10-section settings
│   │   ├── Diagnostics.tsx        # 11 system health checks
│   │   └── TrackEmergency.tsx     # Public emergency tracking
│   ├── App.tsx                    # Router + providers + error system
│   ├── main.tsx                   # Entry + pre-mount error handlers
│   ├── sw.ts                      # Service Worker (push + notificationclick)
│   └── index.css                  # Tailwind + custom animations
├── supabase/
│   ├── functions/
│   │   ├── send-sms/index.ts            # Twilio SMS
│   │   ├── notify-contacts/index.ts     # SMS + Push dispatch
│   │   └── web-push/send/index.ts      # Web Push encryption
│   └── migrations/
│       ├── 003_auto_notify_on_emergency.sql  # pg_net auto-notify
│       └── 004_settings_enhancements.sql     # notification_prefs + delete RPC
├── supabase-schema.sql            # Full database schema (6 tables + 8 RPCs)
├── DEPLOY.md                     # This file
└── package.json                   # v2.7.0
```

---

## Resolucao de Problemas

| Problema | Solucao |
|----------|--------|
| `Relation 'profiles' does not exist` | Execute `supabase-schema.sql` no SQL Editor |
| Push notifications nao funcionam | Verifique VAPID keys + HTTPS obrigatorio |
| SMS nao envia | Verifique credenciais Twilio nos segredos do Supabase |
| BLE nao funciona no Safari/iOS | Web Bluetooth API so suporta Chromium. Para iOS, use Capacitor |
| Geofence `A aguardar GPS...` | De permissao de localizacao. Nao funciona em HTTP |
| SOSButton nao aparece | Verifique se `SOSButton` esta a renderizar fora do `ErrorBoundary` no App.tsx |
| Erro de build: `Cannot find module` | Execute `npm install` e verifique `tsconfig.json` |
| PWA nao instala | Verifique `manifest.json` + HTTPS + Service Worker registado |

---

## Notas de Versao

### v2.7.0 (Atual)
- Historico: filtros por tipo, detalhes expandidos, exportacao CSV
- Contactos: edicao funcional, confirmacao visual
- Navegacao: Diagnostico acessivel via sidebar
- Rotas: redirecionamento `/emergency-contacts` -> `/contacts`
- SOSButton: removida duplicacao no DashboardLayout
- Console.log: removidos 7 ficheiros para producao
- Versao: unificada em package.json, manifest, Settings, Landing, ErrorBoundary
