# REDEPLOY DAS EDGE FUNCTIONS — StatusAds Connect

As versões antigas das funções no teu projecto **ainda não têm a blindagem de
segurança** (JWT obrigatório, rate limiting, texto fixo no SMS, validação de
webhook). Enquanto não fizeres este redeploy, as falhas corrigidas na Task 16
continuam expostas na versão online.

> **v3.19.0** — nova edge function `ai-analyst` (Copiloto AEGIS · IA).
> Faz o deploy dela também (passo 2) e configura os segredos `AI_*` (passo 3).
> Sem chave IA a app continua 100% funcional — usa o **Analista Local** offline.

---

## 1. Pré-requisitos (2 minutos)

1. **Access token**: dashboard.supabase.com → clicar no teu avatar →
   **Account → Access Tokens → Generate new token** (começa por `sbp_...`).
2. **Project ref**: dashboard.supabase.com → abre o teu projecto → o ref está
   no URL: `https://supabase.com/dashboard/project/<PROJECT_REF>`

## 2. Deploy (correr na pasta do projecto, terminal)

```bash
export SUPABASE_ACCESS_TOKEN=sbp_O_TEU_TOKEN
export PROJECT_REF=o_teu_project_ref

# 5 funções com verificação de JWT (default)
for f in send-sms notify-contacts web-push notify-missed-checkin create-payment; do
  npx supabase functions deploy $f --project-ref $PROJECT_REF
done

# payments-webhook é chamado por servidores externos (sem JWT do utilizador)
npx supabase functions deploy payments-webhook --project-ref $PROJECT_REF --no-verify-jwt

# v3.19.0 — Copiloto AEGIS · IA (JWT obrigatório, rate-limit 20/h)
npx supabase functions deploy ai-analyst --project-ref $PROJECT_REF
```

Alternativa sem terminal: abrir cada pasta `supabase/functions/<nome>/`,
copiar o `index.ts` e colar em Dashboard → Edge Functions → <nome> → Edit → Deploy.

## 3. Segredos (Dashboard → Edge Functions → Secrets)

Segredos partilhados (já deves ter): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

| Função | Segredos necessários |
|---|---|
| send-sms | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| notify-contacts | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |
| web-push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (ex.: `mailto:tu@email.com`) |
| notify-missed-checkin | mesmos TWILIO_* + VAPID_* |
| create-payment | `PAYMENT_DEMO_MODE=true/false`, MPESA_* (`API_KEY`,`PUBLIC_KEY`,`SP_CODE`,`ENV`,`PORT`), EMOLA_* (`API_KEY`,`MERCHANT_ID`,`PUSH_URL`), MKESH_* (`API_KEY`,`PUSH_URL`), PAYPAL_* (`CLIENT_ID`,`CLIENT_SECRET`,`ENV`) |
| payments-webhook | **`PAYMENT_WEBHOOK_SECRET`** (obrigatório — valida assinatura HMAC) + mesmos MPESA_/EMOLA_/MKESH_/PAYPAL_* |
| ai-analyst (v3.19.0) | **`AI_API_KEY`** (opcional — activa a IA na nuvem) · `AI_BASE_URL` (opcional) · `AI_MODEL` (opcional) |

### Segredos do Copiloto AEGIS · IA (v3.19.0)

Sem `AI_API_KEY` a app usa o **Analista Local** offline — tudo funciona, mas
as respostas são do motor de regras em vez de um LLM. Para activar a IA na
nuvem, escolhe UM fornecedor (API compatível OpenAI):

| Fornecedor | AI_BASE_URL | AI_MODEL |
|---|---|---|
| z.ai (GLM) | `https://api.z.ai/api/paas/v4` | `glm-4.6` |
| OpenAI | (omitter — default) | `gpt-4o-mini` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| OpenRouter | `https://openrouter.ai/api/v1` | ex.: `anthropic/claude-sonnet-4` |

Configura (Dashboard → Edge Functions → Secrets → Add new secret):
`AI_API_KEY=<chave do fornecedor>`, e opcionalmente `AI_BASE_URL` + `AI_MODEL`.

⚠️ **Privacidade**: o contexto enviado ao LLM é anonimizado no cliente
(MACs truncados, sem coordenadas GPS, sem contactos) e a função tem
rate-limit de 20 análises/hora por utilizador com JWT obrigatório.

⚠️ **PAYMENT_WEBHOOK_SECRET é o mais importante**: sem ele, o webhook fica em
modo não-verificado. Usa uma senha aleatória longa (ex.: `openssl rand -hex 32`).

> Modo demo: enquanto `PAYMENT_DEMO_MODE=true`, os pagamentos confirmam-se
> sem chamar as APIs reais — ideal para testes antes de contractar M-Pesa/e-Mola.

## 4. Verificar após o deploy

1. App → **Painel Admin → Saúde do Servidor** → deve ficar 100% verde.
2. Teste SMS: Perfil → número → "Enviar SMS de teste" (texto fixo, máx 3/hora).
3. Pagamento demo: activar um plano Bellvion com `PAYMENT_DEMO_MODE=true` e
   confirmar que o webhook aceita e a subscrição fica activa.
