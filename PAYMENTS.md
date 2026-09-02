# Pagamentos e Assinaturas — StatusAds Connect

Assinaturas mensais com **M-Pesa** (Vodacom), **e-Mola** (Movitel), **mKesh** (Tmcel) e **PayPal**, com painel admin completo.

> **✅ Funciona sem configurar NADA.** Nenhuma API é necessária para testar ou demonstrar o produto:
> os pagamentos correm em **modo sandbox automático** (prompt simulado, confirmação em ~8 s) enquanto
> não houver chaves reais, os SMS são opcionais (fallback: Web Push + alerta por WhatsApp integrado)
> e todo o resto (GPS, mapas, check-in, evidências, painéis) usa apenas o Supabase e serviços gratuitos.
> As chaves dos providers só são precisas quando quiseres receber dinheiro a sério.

## Planos

| Plano | Preço | PayPal | Contactos | Dispositivos |
|---|---|---|---|---|
| Grátis | 0 MT | — | 2 | 1 |
| Família | 249 MT/mês | $3.99 | 6 | 3 |
| Premium | 499 MT/mês | $7.99 | ilimitados | 10 |

Preços editáveis no painel admin → **Planos** (tabela `plans`).

## Activar em produção (3 passos)

### 1. Executar a migration no Supabase

Supabase Dashboard → **SQL Editor** → colar e correr:

```
supabase/migrations/009_payments_subscriptions.sql
```

Cria: `plans`, `subscriptions`, `payments`, `admin_logs`, `profiles.role`, função `is_admin()`, trigger de activação automática (`trg_payment_confirmed` → `activate_or_extend_subscription`), expiração automática via `pg_cron` (se disponível) e as políticas RLS.

**Torna-te admin** (no SQL Editor):

```sql
update public.profiles
set role = 'admin'
where user_id = (select id from auth.users where email = 'o-teu-email@exemplo.com');
```

Depois disto, a secção **Painel Admin** aparece no menu lateral do app.

### 2. Deploy das edge functions

```bash
supabase functions deploy create-payment
supabase functions deploy payments-webhook
```

### 3. Configurar as chaves dos providers

Supabase Dashboard → **Edge Functions → Secrets** (ou `supabase secrets set`):

**M-Pesa (Vodacom MZ)** — portal: developer.mpesa.vm.co.mz
```
MPESA_API_KEY=...
MPESA_PUBLIC_KEY=...        (chave pública RSA do portal)
MPESA_SP_CODE=...           (código do fornecedor)
MPESA_ENV=live              (ou sandbox)
MPESA_PORT=18352
```
Callback a configurar no portal M-Pesa: `https://<project>.supabase.co/functions/v1/payments-webhook` (+ `?secret=...` se definires `PAYMENT_WEBHOOK_SECRET`).

**e-Mola (Movitel)** — API negociada com o gerente de conta:
```
EMOLA_PUSH_URL=https://...   (endpoint de push fornecido)
EMOLA_API_KEY=...
EMOLA_MERCHANT_ID=...
```

**mKesh (Tmcel)** — mesmo padrão:
```
MKESH_PUSH_URL=https://...
MKESH_API_KEY=...
```

**PayPal** (developer.paypal.com):
```
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_ENV=sandbox          (ou live)
```

**Opcional — segredo do webhook** (recomendado em produção):
```
PAYMENT_WEBHOOK_SECRET=um-segredo-longo
```
Com isto definido, os callbacks só são aceites se enviarem o header `x-webhook-secret` (ou `?secret=`).

## Modo demonstração (sem chaves)

Enquanto **nenhum provider estiver configurado** (ou `PAYMENT_DEMO_MODE=true`):
- O checkout funciona ponta-a-ponta com confirmação **simulada** (~8 s) — ideal para demos e testes.
- Os painéis admin mostram dados de demonstração semeados até a migration 009 ser executada.
- O badge **DEMO** é visível nos painéis.

Assim que adicionares a primeira chave real, o modo demo desliga-se automaticamente.

## Fluxo de pagamento

1. Utilizador escolhe plano em **/planos** → checkout com método.
2. Carteiras móveis (M-Pesa/e-Mola/mKesh): a edge function envia o **push C2B** para o número → utilizador confirma com o PIN no telefone.
3. PayPal: redirecção para aprovar → retorno a `/dashboard/assinatura` → capture.
4. Provider chama **payments-webhook** → pagamento `confirmed` → **trigger SQL** cria/estende a assinatura +31 dias e sincroniza `profiles.plan`.
5. O app actualiza os limites (ex: contactos) na hora.

O admin também pode **confirmar manualmente** um pagamento no painel (Pagamentos → Confirmar) — o mesmo trigger corre.

## Segurança

- `create-payment` valida o **JWT** do utilizador (ninguém inicia pagamentos em nome de outro).
- `payments-webhook` aceita apenas callbacks com segredo (quando configurado) e bloqueia confirmações demo se algum provider real estiver activo.
- Todas as novas tabelas têm **RLS**: utilizador lê só o seu; escrita de pagamentos só via service_role/edge; gestão de planos e acções admin protegidas por `is_admin()`.
- A activação de assinaturas corre no **trigger SQL** (security definer), nunca no cliente.
