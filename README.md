# 🛡️ StatusAds Connect v3.2.0

**App de segurança pessoal anti-rapto com SOS offline-first, camuflagem e
monetização 100% manual (zero API).** Feito para Moçambique 🇲🇿 — funciona
na rede de qualquer operadora, sem depender de gateways de pagamento ou SMS.

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
- **CSP estrito** + anon key apenas (service_role nunca no cliente)
- **Emergência à prova de falha** — retries com backoff, fila offline, alarme local independente de rede

---

## 🗺️ Roadmap

- [x] v3.0 — Rebrand dourado + escolha de instalação (PWA/Nativa/Camuflada)
- [x] v3.1 — Pagamentos manuais zero API + painéis completos + APIs gratuitas
- [x] v3.2 — Deteção de queda + Chamada Falsa + 45 dicas de segurança
- [ ] APK publicado na Play Store
- [ ] Notificações SMS ilimitadas (edge functions activas)
- [ ] Radar comunitário colaborativo entre operadoras

---

**Licença**: proprietária — © StatusAds Connect. Uso e modificação autorizados ao dono do projecto.
