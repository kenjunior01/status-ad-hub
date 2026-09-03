# 🚀 PUBLICAR — Guia Definitivo (do zero ao ar em 30 minutos)

Este é o guia actualizado para publicar o **StatusAds Connect** com monetização
**100% manual (zero API)** e todas as funcionalidades de segurança activas.
Se seguires os 6 passos abaixo, o teu site fica funcional e monetizável hoje.

---

## ✅ O que já está pronto no código (não precisas fazer nada)

| Área | Estado |
|------|--------|
| SOS (botão, voz, óculos, queda) | ✅ Implementado |
| Deteção de queda com auto-SOS | ✅ Implementado |
| Chamada Falsa (escapatória) | ✅ Implementado |
| Camuflagem (11 disfarces) + anti-coerção | ✅ Implementado |
| Dead Man's Switch + Check-in + Viagens | ✅ Implementado |
| Evidências + Ficha Médica + WhatsApp | ✅ Implementado |
| Planos + checkout manual (M-Pesa/e-Mola/mKesh/Banco/PayPal) | ✅ Implementado |
| Painel Admin (7 páginas) | ✅ Implementado |
| Dicas de Segurança (45 dicas + dica do dia) | ✅ Implementado |
| APIs gratuitas (GPS, Nominatim, geo-IP, Open-Meteo) | ✅ Integrado |

**O que falta é só configuração da tua conta** (passos 1-4) e o deploy (passo 5).

---

## PASSO 1 — Aplicar o SQL no Supabase (5 min)

O ficheiro **`supabase/APLICAR-TUDO.sql`** contém TODAS as migrations consolidadas
(tabelas de emergência, check-in, óculos, anti-coerção, **planos, assinaturas,
pagamentos manuais, ficha médica, configurações de pagamento** + RLS + triggers).

1. Entra em **[dashboard.supabase.com](https://dashboard.supabase.com)** → o teu projecto
2. Menu lateral → **SQL Editor** → **New query**
3. Abre o ficheiro `supabase/APLICAR-TUDO.sql`, copia **TUDO**, cola no editor e clica **RUN**
4. Se aparecerem erros `already exists` — ignora: significa que essas partes já existem
5. Verificação: Table Editor deve mostrar as tabelas `plans`, `subscriptions`, `payments`, `app_settings`
6. **Verificação automática dentro do app**: Painel Admin → **Saúde do Servidor** —
   o cartão mostra ✅/❌ para cada componente (planos, role admin, RPCs, bucket de
   gravações, códigos BELLVION) e desaparece sozinho quando está tudo verde

> ⚠️ **Já aplicaste migrations antes?** Podes correr o ficheiro todo na mesma —
> os objectos existentes não são recriados (o seed dos planos actualiza preços sem duplicar).

---

## PASSO 2 — Tornar-te ADMIN (1 min, por código digitado)

**A partir da migration 013** já não precisas de SQL para te tornares admin:

1. Cria a tua conta normal no app (Registar, com o teu email)
2. Vai a **Painel Admin** no menu (mostra o ecrã de desbloqueio)
3. Digita o **código de administração** e clica **Desbloquear Painel Admin**

O código por defeito é:

```
STATUSADS-ADMIN-2026
```

> 🔐 **TROCA o código logo após activar** — no SQL Editor:
> ```sql
> update public.app_security_config
> set value = 'O-TEU-CODIGO-SECRETO'
> where key = 'admin_activation_code';
> ```
> Cada tentativa (falhada ou bem-sucedida) fica registada em `admin_logs`.

**Alternativa SQL** (se preferires):

```sql
update public.profiles
set role = 'admin'
where user_id = (select id from auth.users where email = 'o-teu-email@exemplo.com');
```

Confirma com:

```sql
select email, role from public.profiles p join auth.users u on u.id = p.user_id;
```

Agora, ao entrares no app, a sidebar mostra **Painel Admin** (com coroa 👑).

---

## PASSO 3 — Configurar os teus números de pagamento (3 min)

**No app** (não no Supabase):

1. Entra no app → sidebar → **Painel Admin** → **Configurações**
2. Preenche os teus números reais:
   - **M-Pesa**: ex. `84 123 4567` (nome do titular)
   - **e-Mola**: ex. `86 123 4567`
   - **mKesh**: ex. `82 123 4567`
   - **Banco**: banco, titular e NIB (opcional)
   - **PayPal**: o teu email PayPal (opcional)
3. Clica **Guardar**

A partir daqui, quem abrir **/planos** e clicar numa assinatura vê **os TEUS números**
com instruções passo-a-passo e campo para submeter o ID da transacção. O pagamento
fica **pendente** até confirmares no admin.

> Sem números configurados, o checkout mostra valores de exemplo — **configura antes de divulgar**.

---

## PASSO 4 — Testar o fluxo completo (5 min)

Faz este teste uma vez para confirmares que tudo funciona:

1. Cria uma conta de teste (ou usa o teu registo)
2. Vai a **/planos** → **Família** → escolhe **M-Pesa**
3. Simula o pagamento: transfere 1 MT para ti mesmo e usa o ID dessa transacção
4. Submete o formulário → o pagamento aparece como **pendente**
5. Entra como **admin** → **Pagamentos** → confirma o pagamento
6. A subscrição do utilizador fica **activa +31 dias** (automático, por trigger SQL)

Se este fluxo passar, o teu negócio está operacional. 💰

---

## PASSO 5 — Publicar o site (10 min)

O código está no GitHub (`github.com/kenjunior01/status-ad-hub`, branch `main`).
Escolhe UMA das opções:

### Opção A — Vercel (recomendado, grátis)

1. **[vercel.com](https://vercel.com)** → entra com GitHub
2. **Add New → Project** → importa o repo `status-ad-hub`
3. Antes de clicar em Deploy, abre **Environment Variables** e adiciona:
   ```
   VITE_SUPABASE_URL = https://SEU-PROJECTO.supabase.co
   VITE_SUPABASE_ANON_KEY = a-tua-anon-key
   ```
   (copias os 2 valores em Supabase → Settings → API)
4. **Deploy** → em ~2 minutos ficas com `statusad-hub.vercel.app`
5. Domínio próprio: Project → **Settings → Domains** → adiciona `statusmonetize.com`
   e no teu gestor de domínio aponta os DNS conforme as instruções da Vercel

### Opção B — Netlify (também grátis)

1. **[netlify.com](https://netlify.com)** → entra com GitHub
2. **Add new site → Import an existing project** → escolhe o repo
3. Build command: `npm run build` · Publish directory: `dist`
4. Environment variables: as mesmas 2 do passo 3 da Vercel
5. **Deploy** + Domains para ligar `statusmonetize.com`

### Opção C — Lovable

Se o projecto foi criado no Lovable, faz **push do GitHub** no editor:
o Lovable detecta o repo e publica automaticamente. Variáveis de ambiente
iguais às de cima (Project → Settings → Environment Variables).

> 🔑 **Nunca** uses a `service_role` key no frontend — só a `anon` key (é pública
> e protegida pelas políticas RLS que o SQL já aplicou).

---

## PASSO 6 — Pós-publicação (checklist final)

- [ ] Abrir o site publicado e fazer **registo + login**
- [ ] **Admin → Configurações**: confirmar que os números guardados aparecem no checkout
- [ ] Telemóvel: **/instalar** → instalar como PWA (Android: "Adicionar ao ecrã principal")
- [ ] Publicar nas redes: "App moçambicana de segurança pessoal — SOS offline" + link
- [ ] **RODAR o token GitHub** que foi partilhado em conversa (Settings → Developer settings → Tokens) ⚠️
- [ ] (Opcional) Gerar APK nativo: ver `BUILD-NATIVA.md`
- [ ] (Opcional) Edge functions de SMS/push automáticos: ver `PAYMENTS.md` § Avançado — o app funciona sem elas

---

## 💡 Como funciona a monetização (resumo)

```
Utilizador entra em /planos
        │
        ▼
Escolhe plano (Grátis / Família 249 MT / Premium 499 MT)
        │
        ▼
Vê OS TEUS NÚMEROS (M-Pesa, e-Mola, mKesh, banco, PayPal)
e transfere pelo teu USSD normal  ────  ZERO API, ZERO intermediário
        │
        ▼
Submete o ID da transacção no formulário
        │
        ▼
TU Recebes notificação no Painel Admin → Pagamentos
        │
   [Aprovar] → subscrição activa +31 dias (automático)
   [Rejeitar] → utilizador notificado
```

Sem gateways, sem taxas de intermediário, sem chaves de API. O dinheiro cai
directo na tua conta/carteira — o app gere a lógica de acesso.

---

## 📞 Problemas comuns

| Problema | Solução |
|----------|---------|
| "Tabela plans não existe" | Passo 1 não correu — cola o `APLICAR-TUDO.sql` completo |
| Checkout mostra números de exemplo | Passo 3 — preenche Admin → Configurações |
| Não vejo o Painel Admin | Passo 2 — o `update ... role='admin'` falhou (confirma o email) |
| Tela branca no deploy | Faltam as 2 variáveis de ambiente `VITE_*` no host |
| Pagamento confirmado não activa | Corre o trigger: o bloco `trg_payment_confirmed` está no `APLICAR-TUDO.sql` |
| Push/SMS não chegam | Normal — precisa edge functions activas (opcional); WhatsApp deep-link funciona sempre |
