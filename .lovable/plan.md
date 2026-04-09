## Plano de Implementação

### 1. Corrigir sistema de moedas
- Corrigir o `AdminDashboard` que ainda usa "R$" hardcoded em vez de `formatFromUSD`
- Garantir que o edge function `currency-rates` funciona correctamente
- Adicionar fallback para moedas não suportadas pelo frankfurter.app (MZN, AOA, NGN, KES)

### 2. Melhorar Chat System
- Redesenhar o chat com visual mais moderno e fluido (inspiração WhatsApp)
- Adicionar sistema de **cotações/propostas** dentro do chat (criador ou anunciante pode criar uma proposta com valor, descrição e prazo)
- Adicionar **geração de facturas** em PDF como mensagem no chat
- Manter **histórico de comprovativos de pagamento** visíveis no chat
- Mensagens especiais renderizadas como cards (cotação, factura, comprovativo)

### 3. Painel Admin — Configuração de APIs de Pagamento
- Criar tabela `platform_settings` para guardar configurações de API keys criptografadas
- No tab "Configurações" do admin, adicionar formulários para:
  - **PaySuite** (API Key) — Moçambique / M-Pesa
  - **PayPal** (Client ID + Client Secret) — Internacional
  - **Multicaixa Express** (API Key) — Angola
  - **PIX / Mercado Pago** (Access Token) — Brasil
- Edge functions lêem as keys da tabela `platform_settings` em vez de secrets fixos
- Admin pode activar/desactivar cada gateway

### 4. Novos métodos de pagamento
- Adicionar **Multicaixa Express** (Angola) ao `PaymentCheckout`
- Adicionar **PIX via Mercado Pago** (Brasil) ao `PaymentCheckout`
- Cada método aparece condicionalmente baseado na região/país do utilizador

### Ordem de execução
1. Corrigir moedas (rápido)
2. Tabela `platform_settings` + painel admin
3. Chat melhorado com cotações e facturas
4. Novos gateways de pagamento
