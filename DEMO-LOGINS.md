# StatusAds Connect — Logins de Demonstração

> ⚠️ **ANTES DE ABRIR AO PÚBLICO**: apague estas contas (Supabase Dashboard →
> Authentication → Users) ou mude as senhas. São contas de teste/demonstração.

## Contas criadas

| Papel | Email | Senha | Notas |
|-------|-------|-------|-------|
| **Administrador (dono)** | `teste.admin@statusads-demo.mz` | `Gu@rdi4o-2026-x` | Acesso ao Painel Admin (7 páginas). Use esta para gerir utilizadores, pagamentos e configurações. |
| **Utilizador comum (demo)** | `demo.user@statusads-demo.mz` | `Demo@2026-user` | Conta nova para testar a experiência do utilizador final: tutorial de primeira entrada, SOS, camuflagem, gravação, etc. |

## Como logar

1. Abra o site (ou a APK) → **Entrar**
2. Introduza o email e a senha da tabela acima
3. **Dica de teste de camuflagem**: logo após o primeiro login, o Tutorial de
   Boas-Vindas aparece — pode revê-lo sempre em *Acções Rápidas → Tutorial do App*

## Tornar um utilizador administrador (de produção)

Depois de correr `supabase/APLICAR-TUDO.sql` no SQL Editor:

```sql
update profiles set role = 'admin' where id = (
  select id from auth.users where email = 'SEU_EMAIL_AQUI'
);
```

## Fluxo OAuth Google/Apple

Os botões Google/Apple no login chamam `supabase.auth.signInWithOAuth`.
Para funcionarem, active os providers em:

**Supabase Dashboard → Authentication → Providers → Google / Apple → Enable**

(É preciso criar credenciais OAuth na Google Cloud Console / Apple Developer
com redirect para `https://<projecto>.supabase.co/auth/v1/callback`.)

## Notas

- A conta demo foi criada por REST (`/auth/v1/signup`) — se correr o
  `APLICAR-TUDO.sql` (com o trigger `handle_new_user`), o perfil nasce
  automaticamente no próximo signup; contas já existentes podem ter o
  perfil criado no primeiro acesso ao dashboard (o app tolera perfil ausente).
- O usuário demo está no plano **Grátis** (3 contactos, 3 evidências visíveis).
  Para testar Premium, confirme um pagamento manual no painel admin para esta conta.
