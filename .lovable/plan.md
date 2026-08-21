
Objetivo

Corrigir 4 frentes sem refazer a app inteira:  
1. a barra inferior mobile ficar realmente fixa desde o primeiro ecrã;  
2. eliminar o ZAR e estabilizar país/região/moeda;  
3. deixar a conversão automática consistente;  
4. substituir o menu inferior por itens mais úteis.

Diagnóstico atual

- A bottom nav já usa `position: fixed`, mas em `src/index.css` existe `* { transform: translateZ(0) }`. Isso cria um novo contexto para praticamente toda a árvore e faz elementos “fixed” comportarem-se como se estivessem presos ao content wrapper. É a razão mais forte para ela só aparecer no fim/ao fundo do scroll.
- O ZAR está a aparecer porque `useLocalization.ts` aceita o `statusads_localization` guardado no `localStorage` sem validar se a moeda/país ainda são suportados. Mesmo depois de limitar `currencies.ts` para MZN/BRL, um estado antigo como `ZA/ZAR` continua vivo.
- A app já tem atualização automática de câmbio pronta (`currency-rates` + `useExchangeRates`). Não preciso de API key nova para isto.
- País/região/moeda ainda não estão bem alinhados com o perfil autenticado, então a interface, os preços e os métodos de pagamento podem divergir do país real do utilizador.
- O menu inferior atual desperdiça espaço: “Perfil” leva ao dashboard, e “Academia” ocupa um lugar que “Mensagens” ou uma ação contextual devia ocupar.

Plano de implementação

1. Corrigir de vez a barra inferior fixa
- Remover o `transform: translateZ(0)` global aplicado a `*` em `src/index.css`.
- Manter aceleração/hardware only onde há animação real.
- Reforçar a bottom bar como camada do viewport: fixa, com safe-area, fundo sólido/blur controlado e z-index estável.
- Rever `App.tsx` e espaçamentos inferiores para o conteúdo nunca empurrar a barra para o fim da página.
- Garantir que ela continua sempre montada no mobile, independente da página atual.

2. Redesenhar o menu inferior para ficar mais relevante
- Tornar o menu contextual ao estado do utilizador:
  - visitante: Início, Criadores, Academia, Entrar
  - criador: Início, Oportunidades, Mensagens, Painel
  - anunciante: Início, Anúncios, Mensagens, Painel
  - admin: Painel, Atividade, Utilizadores, Pagamentos
- Remover o item “Perfil” enquanto ele continuar a redirecionar para o dashboard, porque hoje é redundante e confuso.
- Fazer “Mensagens” virar um destino real do menu, não algo escondido.

3. Corrigir ZAR, região e persistência quebrada
- Saneamento em `useLocalization.ts`:
  - validar `currency`, `country` e `region` contra listas suportadas;
  - se vier valor antigo/inválido, fazer fallback seguro;
  - versionar ou migrar a chave do `localStorage` para limpar estados legados.
- Definir prioridade de origem:
  1. país guardado no perfil autenticado;
  2. escolha manual do utilizador;
  3. deteção automática do browser/fuso horário;
  4. fallback seguro.
- Isso elimina ZAR antigo e impede novas combinações inválidas.

4. Tornar a conversão automática consistente
- Manter USD como base interna.
- Garantir que tudo o que é mostrado ao utilizador passa por `formatFromUSD` ou por conversão centralizada.
- Rever pontos com “USD” hardcoded na UI:
  - formulários de cotação e factura no chat;
  - cards de cotação/factura;
  - publicação de anúncio e labels de orçamento;
  - checkout e componentes com montantes.
- Se quiser manter a regra anterior, deixo o seletor visível apenas com MZN e BRL, mas com o motor pronto para expansão futura.
- Se depois quiser expor mais moedas no seletor, a infraestrutura já suporta isso; seria só expandir os catálogos e a deteção validada.

5. Alinhar região com pagamentos e experiência
- Usar o país resolvido como fonte única para filtrar métodos de pagamento no `PaymentCheckout`.
- Garantir coerência entre país escolhido no cadastro/perfil e país usado para moeda/região/pagamentos.
- Isso evita mismatch entre preço mostrado, região e método disponível.

6. Corrigir o acesso a mensagens pelo mobile
- Ligar o novo item “Mensagens” do bottom nav a uma experiência real de chat global.
- Aproveitar a mesma revisão para limpar inconsistências de moeda dentro do chat comercial.
- Se mantivermos essa parte na mesma entrega, também corrijo os cartões especiais do chat para dependerem de dados reais e não apenas do texto da mensagem.

Detalhes técnicos

Ficheiros mais prováveis:
- `src/index.css`
- `src/App.tsx`
- `src/components/BottomNavigation.tsx`
- `src/hooks/useLocalization.ts`
- `src/contexts/LocalizationContext.tsx`
- `src/lib/currencies.ts`
- `src/components/RegionCurrencySelector.tsx`
- `src/components/PaymentCheckout.tsx`
- `src/components/ChatQuotationForm.tsx`
- `src/components/ChatInvoiceForm.tsx`
- `src/components/ChatInvoiceCard.tsx`
- componentes que ainda mostram USD diretamente

Infra necessária
- Nenhuma nova integração externa.
- O projeto já tem backend de atualização cambial e cache.

Resultado esperado
- A barra inferior aparece logo ao abrir a app.
- Ela nunca desaparece durante scroll.
- Continua fixa ao mudar entre páginas.
- O ZAR deixa de aparecer para utilizadores com cache antigo.
- País, região, moeda e métodos de pagamento ficam coerentes.
- Os preços passam a ser mostrados de forma consistente.
- O menu mobile deixa de ter itens redundantes e passa a refletir melhor o uso real da plataforma.

Validação após implementação
- abrir a home no topo e confirmar a barra visível imediatamente;
- fazer scroll longo e trocar de páginas para confirmar que continua fixa;
- testar cache antigo de localização para confirmar que o ZAR some;
- validar MZ e BR com moeda e métodos corretos;
- testar “Mensagens” pelo menu mobile ponta a ponta.
