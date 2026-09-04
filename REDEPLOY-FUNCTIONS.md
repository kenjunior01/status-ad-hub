# REDEPLOY DAS 6 EDGE FUNCTIONS — StatusAds Connect

As versões antigas das funções no teu projecto **ainda não têm a blindagem de
segurança** (JWT obrigatório, rate limiting, texto fixo no SMS, validação de
webhook). Enquanto não fizeres este redeploy, as falhas corrigidas na Task 16
continuam expostas na versão online.

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

⚠️ **PAYMENT_WEBHOOK_SECRET é o mais importante**: sem ele, o webhook fica em
modo não-verificado. Usa uma senha aleatória longa (ex.: `openssl rand -hex 32`).

> Modo demo: enquanto `PAYMENT_DEMO_MODE=true`, os pagamentos confirmam-se
> sem chamar as APIs reais — ideal para testes antes de contractar M-Pesa/e-Mola.

## 4. Verificar após o deploy

1. App → **Painel Admin → Saúde do Servidor** → deve ficar 100% verde.
2. Teste SMS: Perfil → número → "Enviar SMS de teste" (texto fixo, máx 3/hora).
3. Pagamento demo: activar um plano Bellvion com `PAYMENT_DEMO_MODE=true` e
   confirmar que o webhook aceita e a subscrição fica activa.
