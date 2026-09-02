# Pagamentos e Assinaturas — StatusAds Connect

Assinaturas mensais com **M-Pesa** (Vodacom), **e-Mola** (Movitel), **mKesh** (Tmcel), **transferência bancária** e **PayPal**, com painel admin completo.

> **✅ Funciona sem configurar NADA.** Nenhuma API é necessária para cobrar de verdade:
> o checkout abre por defeito no **Pagamento Manual (offline)** — o utilizador paga para os
> teus números e submete o ID da transacção; tu validas em **Admin → Pagamentos** e a
> assinatura activa-se sozinha (trigger SQL). O modo sandbox automático continua disponível
> para demonstrações, e as chaves dos providers só são precisas se quiseres o *push USSD*
> automático do operador.

## Planos

| Plano | Preço | PayPal | Contactos | Dispositivos |
|---|---|---|---|---|
| Grátis | 0 MT | — | 2 | 1 |
| Família | 249 MT/mês | $3.99 | 6 | 3 |
| Premium | 499 MT/mês | $7.99 | ilimitados | 10 |

Preços editáveis no painel admin → **Planos** (tabela `plans`).

## Pagamento Manual (recomendado — zero API)

**Como funciona:**

1. **Tu (dono)** configuras os teus números em **Admin → Configurações**
   (M-Pesa, e-Mola, mKesh, banco/titular/NIB, e-mail PayPal, suporte).
   Ficam guardados na tabela `app_settings` e aparecem no checkout em tempo real.
2. **O utilizador** escolhe o plano → escolhe o canal → vê os teus números com botão
   de copiar + instruções passo-a-passo (ex: `*150#` → Enviar Dinheiro) → paga no
   telefone → cola o **ID da transacção** que recebeu por SMS → submete.
3. O pagamento entra como **pendente** em **Admin → Pagamentos** (badge `manual`,
   com o ID da transacção e telefone do pagador).
4. **Tu confirmas** (verificando o valor no teu telefone) → botão **Confirmar** →
   o trigger `trg_payment_confirmed` activa/estende a assinatura **+31 dias** e
   sincroniza `profiles.plan` automaticamente. Rejeitar marca como `failed`.

**Migration necessária** (uma vez, SQL Editor do Supabase):

```
supabase/migrations/011_app_settings_manual_payments.sql
```

Cria: `app_settings` (números de pagamento + suporte), política de INSERT para
pagamentos pendentes do próprio utilizador, método `bank`, coluna `payer_name`.
Idempotente — pode correr-se a seguir à 009 sem problemas.

> Sem a migration, o app continua a funcionar em modo demo (pagamentos manuais
> guardados localmente e visíveis no painel admin demo).

## Activar em produção (3 passos)

### 1. Executar as migrations no Supabase

Supabase Dashboard → **SQL Editor** → colar e correr (nesta ordem):

```
supabase/migrations/009_payments_subscriptions.sql
supabase/migrations/011_app_settings_manual_payments.sql
```

Cria: `plans`, `subscriptions`, `payments`, `admin_logs`, `app_settings`, `profiles.role`, função `is_admin()`, trigger de activação automática (`trg_payment_confirmed` → `activate_or_extend_subscription`), expiração automática via `pg_cron` (se disponível) e as políticas RLS.

**Torna-te admin** (no SQL Editor):

```sql
update public.profiles
set role = 'admin'
where user_id = (select id from auth.users where email = 'o-teu-email@exemplo.com');
```

Depois disto, a secção **Painel Admin** aparece no menu lateral do app.

### 2. (Opcional) Deploy das edge functions — só para push USSD automático

```bash
supabase functions deploy create-payment
supabase functions deploy payments-webhook
```

> Não precisas deste passo nem do seguinte se usares apenas o **Pagamento Manual**.
> O checkout manual vive 100% no app + Supabase (sem edge functions).

### 3. (Opcional) Configurar as chaves dos providers

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

**Manual (por defeito, sem API):**

1. Utilizador escolhe plano em **/planos** → "Pagamento Manual" → canal (M-Pesa/e-Mola/mKesh/Banco/PayPal).
2. Vê os teus números + instruções → paga no telefone/app → submete o **ID da transacção**.
3. Pagamento fica `pending` → tu validas em **Admin → Pagamentos → Confirmar**.
4. Trigger SQL activa a assinatura +31 dias e sincroniza `profiles.plan`.

**Automático (opcional, requer chaves):**

1. Utilizador escolhe "Pagamento automático" no checkout → método.
2. Carteiras móveis (M-Pesa/e-Mola/mKesh): a edge function envia o **push C2B** para o número → utilizador confirma com o PIN no telefone.
3. PayPal: redirecção para aprovar → retorno a `/dashboard/assinatura` → capture.
4. Provider chama **payments-webhook** → pagamento `confirmed` → **trigger SQL** cria/estende a assinatura +31 dias e sincroniza `profiles.plan`.
5. O app actualiza os limites (ex: contactos) na hora.

O admin também pode **confirmar manualmente** qualquer pagamento no painel (Pagamentos → Confirmar) — o mesmo trigger corre.

## Segurança

- `create-payment` valida o **JWT** do utilizador (ninguém inicia pagamentos em nome de outro).
- `payments-webhook` aceita apenas callbacks com segredo (quando configurado) e bloqueia confirmações demo se algum provider real estiver activo.
- Todas as novas tabelas têm **RLS**: utilizador lê só o seu; no checkout manual o utilizador só pode **inserir** pagamentos com `status='pending'` em seu nome (nunca confirmar os próprios — confirmação é exclusiva de `is_admin()`); gestão de planos e acções admin protegidas por `is_admin()`.
- `app_settings` é legível por utilizadores autenticados (precisam dos números para pagar) mas só editável por admin.
- A activação de assinaturas corre no **trigger SQL** (security definer), nunca no cliente.
