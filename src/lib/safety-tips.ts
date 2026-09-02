/**
 * safety-tips — Biblioteca de dicas de segurança pessoal.
 *
 * Conteúdo prático e localizado para a realidade moçambicana:
 * casa, rua, chapas/táxis, viagens, online, assaltos, multidões,
 * família e uso inteligente do próprio app.
 *
 * A "Dica do dia" rota automaticamente (baseada na data) no Dashboard
 * e na página Dicas de Segurança.
 */

export type TipCategory =
  | 'casa'
  | 'rua'
  | 'transporte'
  | 'viagem'
  | 'online'
  | 'assalto'
  | 'multidoes'
  | 'familia'
  | 'app'

export interface SafetyTip {
  id: string
  category: TipCategory
  title: string
  text: string
  /** Dicas marcadas como essenciais aparecem primeiro. */
  essential?: boolean
}

export const TIP_CATEGORIES: { id: TipCategory; label: string; description: string; emoji: string }[] = [
  { id: 'casa', label: 'Em Casa', description: 'Protecção da residência e rotinas seguras', emoji: '🏠' },
  { id: 'rua', label: 'Na Rua', description: 'Deslocações a pé e atenção ao ambiente', emoji: '🚶' },
  { id: 'transporte', label: 'Chapas & Táxis', description: 'Transporte público e boleias com segurança', emoji: '🚕' },
  { id: 'viagem', label: 'Viagens', description: 'Estradas, viagens longas e chegadas', emoji: '🛣️' },
  { id: 'online', label: 'Online & WhatsApp', description: 'Golpes, engenharia social e privacidade', emoji: '📱' },
  { id: 'assalto', label: 'Assalto & Rapto', description: 'Como agir nas situações mais críticas', emoji: '🆘' },
  { id: 'multidoes', label: 'Multidões & Eventos', description: 'Marchas, mercados, festas e estádios', emoji: '🏟️' },
  { id: 'familia', label: 'Família & Crianças', description: 'Proteger quem mais ama', emoji: '👨‍👩‍👧' },
  { id: 'app', label: 'Dominar o App', description: 'Extrair o máximo do StatusAds Connect', emoji: '🛡️' },
]

export const SAFETY_TIPS: SafetyTip[] = [
  /* ── EM CASA ── */
  {
    id: 'casa-1',
    category: 'casa',
    title: 'Deixa sempre uma luz de fundo',
    text: 'Um candeeiro aceso ou um temporizador de luz durante a noite dá a impressão de que há gente em casa. A maioria das tentativas de entrada começa com observação: se a casa parecer habitada, o risco diminui drasticamente.',
    essential: true,
  },
  {
    id: 'casa-2',
    category: 'casa',
    title: 'Confere quem bate ANTES de abrir',
    text: 'Usa o olho mágico, a janela ou pergunta "quem é?" sem abrir a porta. Inquilinos e trabalhadores de serviços (EDM, FIPAG, gás) devem ser pedidos para mostrar identificação à janela. Batedores disfarçam-se de técnicos para confirmar se a casa está vazia.',
    essential: true,
  },
  {
    id: 'casa-3',
    category: 'casa',
    title: 'Evita rotinas previsíveis',
    text: 'Se saes sempre às 06:15 e voltas às 17:30 todos os dias, quem te observa sabe exactamente quando a casa fica vazia. Variar 20-30 minutos de vez em quando, ou confiar um vizinho de confiança para vigiar, quebra esse padrão.',
  },
  {
    id: 'casa-4',
    category: 'casa',
    title: 'Cuidado com o que publicas sobre a tua casa',
    text: 'Fotos que mostram portões, gradeamento, cancelas e câmaras ajudam a mapear a tua segurança. Antes de publicar uma foto em casa, faz zoom na imagem: se conseguires identificar pontos de entrada, um estranho também consegue.',
  },
  {
    id: 'casa-5',
    category: 'casa',
    title: 'Acorda a rede de vizinhança',
    text: 'Um grupo de WhatsApp de rua bem usado vale mais que um cão: acorda a rua sobre um estranho a rondar, uma viatura suspeita, um furto ontem à noite. Cria o grupo com 10-20 vizinhos próximos e combina sinais simples de alerta.',
  },
  {
    id: 'casa-6',
    category: 'casa',
    title: 'Tem números de emergência à mão',
    text: 'Grava na tua lista: polícia 119/112, bombeiros, ambulância, o teu jefe de quarteirão e 2 vizinhos. Em pânico ninguém procura no papel — os números têm de estar memorizados ou em favoritos no telefone.',
  },

  /* ── NA RUA ── */
  {
    id: 'rua-1',
    category: 'rua',
    title: 'Anda com o telemóvel fora de vista',
    text: 'Telemóvel na rua = alvo. Evita mandar mensagens parado no passeio; se precisares de usar o telefone, encosta-te a um muro, de costas para a parede, e guarda-o antes de voltar a andar. Roubo de telemóvel é o crime de rua mais comum nos centros das cidades.',
    essential: true,
  },
  {
    id: 'rua-2',
    category: 'rua',
    title: 'Confiança anda ao contrário: quem te para, justifica-se',
    text: 'Se alguém que se diz polícia ou agente te abordar à noite em local despovoado, permanece calmo e propõe caminhar até um local iluminado e movimentado. Agentes legítimos não se incomodam; assaltantes evitam testemunhas.',
    essential: true,
  },
  {
    id: 'rua-3',
    category: 'rua',
    title: 'Evita atalhos vazios ao fim do dia',
    text: 'O caminho mais curto não é o mais seguro se for despovoado e mal iluminado. Preferir sempre rua com movimento e luz, mesmo que demore 5 minutos mais. Usa a Rota Segura do app para escolher caminhos com mais gente e luz.',
  },
  {
    id: 'rua-4',
    category: 'rua',
    title: 'Leva pouco dinheiro "de mostra"',
    text: 'Separa o dinheiro: uma pequena nota num bolso de acesso rápido e o resto escondido noutra pasta ou bolso interno. Sob pressão, entregas a nota acessível. Cartões e telemóvel nunca no mesmo sítio que o dinheiro "de mostra".',
  },
  {
    id: 'rua-5',
    category: 'rua',
    title: 'Sacos e malas: lado contrário à rua',
    text: 'Anda com a mala ou saco no lado oposto à estrada. Motociclistas roubam do lado do trânsito em segundos. Fecha zips virados para o corpo e usa alça transversal em vez de ombro só.',
  },
  {
    id: 'rua-6',
    category: 'rua',
    title: 'Se te sentires seguido: entra num local público',
    text: 'Muda de passeio, atravessa a rua, entra numa loja, farmácia, posto ou igreja. Ninguém segue uma pessoa dentro de um sítio cheio. Se a sensação persistir, usa o app: acção "Alerta por WhatsApp" para um familiar com a tua localização em tempo real.',
  },

  /* ── CHAPAS & TÁXIS ── */
  {
    id: 'trans-1',
    category: 'transporte',
    title: 'Táxi: anota a matrícula e partilha antes de entrar',
    text: 'Antes de entrar num táxi ou carro de aplicação, tira foto da matrícula e manda a um familiar: "vou num branco 123-ABC-123, saio daqui para casa". Faz isto sempre — é o hábito que mais dissuade motoristas desonestos.',
    essential: true,
  },
  {
    id: 'trans-2',
    category: 'transporte',
    title: 'Senta-te perto da janela com saída livre',
    text: 'Num táxi, evita o meio de bancos apertados onde não consegues sair depressa. Na chapa, prefere o lugar perto da porta. Em qualquer veículo: porta destrancada se possível e telemóvel no bolso de acesso rápido.',
  },
  {
    id: 'trans-3',
    category: 'transporte',
    title: 'Boleia: nunca para um desconhecido sem testemunha',
    text: 'Se aceitares boleia, que seja à vista de gente, com a matrícula partilhada e a viagem activa no app (Rastreamento de Viagem partilha a tua localização em tempo real com quem escolheres). Se o motorista desviar da rota combinada, pede para parar em local movimentado.',
    essential: true,
  },
  {
    id: 'trans-4',
    category: 'transporte',
    title: 'Dinheiro trocado e escondido',
    text: 'Prepara o valor exacto da passagem antes. Não exibes notas grandes na porta da chapa — é publicidade ao teu dinheiro. Guarda o resto noutra zona do corpo antes de voltar a andar.',
  },
  {
    id: 'trans-5',
    category: 'transporte',
    title: 'Horário: evita as primeiras e últimas chapas',
    text: 'Chapas às 04:30 e depois das 20:00 têm menos passageiros e menos testemunhas — é onde acontecem os piores incidentes. Se o horário for inevitável, avisa alguém do trajeto e hora de chegada estimada.',
  },
  {
    id: 'trans-6',
    category: 'transporte',
    title: 'Conversa com o motorista sem dar informação',
    text: 'Motoristas simpáticos perguntam onde moras, se vives sozinho, se esperas alguém. Responde com vaguedade ("perto", "não, moro com família"). Informação aparentemente inofensiva é usada para escolher alvos.',
  },

  /* ── VIAGENS ── */
  {
    id: 'viag-1',
    category: 'viagem',
    title: 'Activa o Rastreamento de Viagem sempre que estrada',
    text: 'Antes de arrancar numa viagem, activa o Rastreamento de Viagem no app e partilha o link com um familiar. Se algo acontecer, a pessoa sabe exactamente o último ponto do teu trajecto — sem precisar de te ligar.',
    essential: true,
  },
  {
    id: 'viag-2',
    category: 'viagem',
    title: 'Combina check-ins por hora',
    text: 'Em viagens longas, combina com a família: "envio mensagem a cada 2 horas". Passou 1 hora sem mensagem? A pessoa activa a partilha de localização. A pontualidade do check-in é o teu sistema de alarme silencioso.',
  },
  {
    id: 'viag-3',
    category: 'viagem',
    title: 'Não pares em zonas ermas à noite',
    text: 'Se precisares de descansar, preferir postos de combustível iluminados e com movimento. Furos e "avarias" em zonas despovoadas são cenário clássico de emboscada — se puder, continua devagar até local seguro mesmo com pneu danificado.',
  },
  {
    id: 'viag-4',
    category: 'viagem',
    title: 'Bagagem neutra, sem publicidade',
    text: 'Sacolas de lojas caras e caixas de electrónica visível atraem atenção em paragens. Transporta bagagem neutra e cobre o que tiver marca visível. Objectos de valor vão contigo no assento, não na mala do tejadilho.',
  },
  {
    id: 'viag-5',
    category: 'viagem',
    title: 'Chegando tarde: hotel antes de aventuras',
    text: 'Chegar a cidade desconhecida à noite: vai directo ao alojamento, marca o check-in, deixa as coisas e só depois sai. Primeira noite em cidade nova não é noite de exploração.',
  },

  /* ── ONLINE & WHATSAPP ── */
  {
    id: 'onl-1',
    category: 'online',
    title: 'Golpe do "parente em apuros": confirma por voz',
    text: '"Mãe, estou num problema, preciso de 5000 MT urgente" — de número novo. Antes de transferir, LIGA ao número antigo da pessoa ou a um familiar. Golpistas copiam fotos e nomes de perfis. Regra de ouro: dinheiro só por confirmação de voz com a pessoa no número conhecido.',
    essential: true,
  },
  {
    id: 'onl-2',
    category: 'online',
    title: 'Nunca partilhes código de verificação',
    text: 'Ninguém legítimo — nem operadora, nem banco, nem WhatsApp — pede o código que chega por SMS. Quem pede o código é alguém a tentar roubar a tua conta. Escreve: "vou ligar ao meu banco para confirmar" e o golpista desiste.',
    essential: true,
  },
  {
    id: 'onl-3',
    category: 'online',
    title: 'Localização em tempo real: só com quem confias',
    text: 'O WhatsApp permite partilhar localização em tempo real. Usa para viagens e encontros com quem confias — e desactiva quando chegas. Localização "para sempre activa" com conhecidos distantes é uma porta aberta.',
  },
  {
    id: 'onl-4',
    category: 'online',
    title: 'Vender online: ponto público e pagamento à vista',
    text: 'Para vender algo por anúncio: marca encontro em centro comercial ou posto com movimento, de dia. Só entrega ao vivo e à vista — nunca "o meu motorista vai buscar". O golpe do motorista é dos mais comuns em Moçambique.',
    essential: true,
  },
  {
    id: 'onl-5',
    category: 'online',
    title: 'Cuidado com o perfil que "trabalha no exterior"',
    text: 'Perfis românticos ou de recrutadores com promessas de emprego no estrangeiro que pedem taxas antecipadas: 100% golpe. Emprego legítimo nunca cobra para contratar. Bloqueia e reporta.',
  },
  {
    id: 'onl-6',
    category: 'online',
    title: 'Bloqueia o ecrã e usa PIN forte',
    text: 'PIN de 6 dígitos (não data de nascimento), biometria activa e bloqueio automático a 30 segundos. Um telemóvel roubado desbloqueado é conta bancária, WhatsApp e identidade abertas ao ladrão.',
  },

  /* ── ASSALTO & RAPTO ── */
  {
    id: 'ass-1',
    category: 'assalto',
    title: 'Bem material substitui-se; a vida, não',
    text: 'Num assalto com violência, a regra número um é: entrega. Telemóvel, dinheiro, saco — tudo substitui-se. Nada que levas vale a tua vida. Não corras, não brigueis por bens materiais, não fales demais: mãos visíveis, voz calma, obediência total.',
    essential: true,
  },
  {
    id: 'ass-2',
    category: 'assalto',
    title: 'Observa sem encarar',
    text: 'Durante um assalto, recolhe sem encarar: altura, roupa, cicatriz, tatuagem, cor da viatura e sentido de fuga. Essa informação dás à polícia DEPOIS, em segurança. Encarar de frente é interpretado como desafio.',
    essential: true,
  },
  {
    id: 'ass-3',
    category: 'assalto',
    title: 'Se és levado à força: deixa rastros',
    text: 'Deixa cair "sem querer" objectos teus no caminho (boné, calçado, cartão) — procuras seguem esses rastros. Se conseguires, o app StatusAds com SOS activo já mandou a tua localização aos contactos: cada segundo conta.',
  },
  {
    id: 'ass-4',
    category: 'assalto',
    title: 'Fala pouco, humaniza-te',
    text: 'Em situações de cativeiro, fala com calma sobre família comum, comida, futebol — o objectivo é ser visto como pessoa, não como objecto. Nunca desafiês, nunca invoques polícia, nunca digas "sei quem és".',
  },
  {
    id: 'ass-5',
    category: 'assalto',
    title: 'O momento de fugir é no início ou na distração',
    text: 'Estatisticamente, os primeiros segundos — quando ainda há gente à vista e o agressor ainda não controlou tudo — são a melhor janela para fugir correndo para local com pessoas. Depois de entrarem num veículo, a fuga torna-se muito mais arriscada: avalia sempre antes.',
  },
  {
    id: 'ass-6',
    category: 'assalto',
    title: 'Depois do crime: preserva provas e reporta',
    text: 'Não toques no telemóvel roubado pela app "para ver" — reporta o IMEI à operadora e à polícia com o número da ocorrência. Guarda SMS, transacções e testemunhas. A Timeline de Incidentes do app ajuda a reconstruir horários exactos.',
  },

  /* ── MULTIDÕES & EVENTOS ── */
  {
    id: 'mul-1',
    category: 'multidoes',
    title: 'Ponto de encontro combinado ANTES de entrar',
    text: '"Se nos separarmos, encontramo-nos junto à saída principal às X horas." Combinado antes, numa multidão sem rede, vale mais que 10 chamadas que não passam. Escolhe um ponto visível e permanente, nunca "perto do palco".',
    essential: true,
  },
  {
    id: 'mul-2',
    category: 'multidoes',
    title: 'Nos movimentos de multidão: bordas, não centro',
    text: 'Se uma multidão aperta e começa a empurrar, move-te diagonalmente para a borda. O perigo real de uma multidão em pânico é a compressão no centro. Braços junto ao peito protege as costelas e cria espaço para respirar.',
  },
  {
    id: 'mul-3',
    category: 'multidoes',
    title: 'Marchas e concentrações: evita por princípio',
    text: 'Concentrações políticas e marchas podem mudar de tom em minutos. Se estiveres próximo, afasta-te assim que vires polícia anti-motim ou pedras — não fiques a filmar de perto. Distância mínima: 2 quarteirões.',
  },
  {
    id: 'mul-4',
    category: 'multidoes',
    title: 'Festas: bebida nunca fora da tua vista',
    text: 'Aceita bebida só fechada ou servida na tua frente e nunca a deixes na mesa para "guardar o lugar". Substâncias usadas em bebidas são incolores e inodoras. Vais ao WC? Deixa a bebida ou pede nova ao voltar.',
    essential: true,
  },

  /* ── FAMÍLIA & CRIANÇAS ── */
  {
    id: 'fam-1',
    category: 'familia',
    title: 'Código de família para emergências',
    text: 'Combina uma palavra que só a família sabe ("o nome do nosso primeiro cão"). "Manda a Maria buscar os miúdos" dita pela palavra errada = sinal de alarme. Serve também para confirmar mensagens estranhas em WhatsApp.',
    essential: true,
  },
  {
    id: 'fam-2',
    category: 'familia',
    title: 'Crianças: nome do pai no braço e regra de 3 passos',
    text: 'Em mercados e festas: etiqueta escondida com nome + telefone do pai/mai na roupa ou braço. Regra simples: "nunca estás a mais de 3 passos de mim". Se se perder, a criança deve ir a uma mãe com crianças ou a um funcionário identificado — nunca a um estranho simpático que "vai ajudá-la a procurar".',
  },
  {
    id: 'fam-3',
    category: 'familia',
    title: 'Ensina as crianças o estranho perigoso NÃO é feio',
    text: 'O estranho perigoso parece gente simpática e bem vestida. Ensina: um adulto de verdade NUNCA pede a uma criança para ir a um sítio, ajudar ou guardar segredo dos pais. Se um adulto pede isso, a criança grita e corre para ti.',
  },
  {
    id: 'fam-4',
    category: 'familia',
    title: 'Ficha médica: salva-vidas em acidentes',
    text: 'Preenche a Ficha Médica no app (tipo sanguíneo, alergias, medicação, contacto de emergência). Num acidente em que estejas inconsciente, socorristas com acesso à tua partilha de emergência sabem o que NÃO te podem dar.',
  },
  {
    id: 'fam-5',
    category: 'familia',
    title: 'Idosos: chamada rápida no ecrã inicial',
    text: 'No telefone dos teus pais/avós: botão de chamada rápida do contacto familiar no ecrã inicial, volume alto, e o app instalado com os contactos de emergência já configurados. Simples de usar sob pressão é essencial.',
  },

  /* ── DOMINAR O APP ── */
  {
    id: 'app-1',
    category: 'app',
    title: 'Configura 3 contactos de emergência HOJE',
    text: 'O SOS só é útil se houver quem receba. Vai a Contactos de Emergência e adiciona pelo menos 3 pessoas: alguém da casa, alguém do trabalho e alguém que viva perto. Confirma que os números têm WhatsApp — o alerta chega por SMS e WhatsApp.',
    essential: true,
  },
  {
    id: 'app-2',
    category: 'app',
    title: 'Treina o SOS por voz antes de precisar',
    text: 'Activa o SOS por Voz e testa: "socorro" em voz normal e em voz sussurrada. Aprende como o app pede confirmação. Numa emergência real não há tempo de descobrir — o teu cérebro vai fazer o que treinou.',
  },
  {
    id: 'app-3',
    category: 'app',
    title: 'Camuflagem + Chamada Falsa: o par perfeito',
    text: 'Disfarça o app (Modo Discreto) e agenda uma Chamada Falsa para 1 minuto. Quando ela tocar, atendes e sais com naturalidade — "é o chefe, é urgente". Ninguém desconfia de um telefonema.',
  },
  {
    id: 'app-4',
    category: 'app',
    title: 'Dead Man\'s Switch em reuniões de risco',
    text: 'Vais a um encontro desconhecido (compra/venda, entrevista, conversa difícil)? Activa o Dead Man\'s Switch com 30 minutos: se não tocares no app nesse tempo, o SOS parte sozinho. O teu silêncio é o alarme.',
    essential: true,
  },
  {
    id: 'app-5',
    category: 'app',
    title: 'Instala a app nativa para protecção total',
    text: 'A versão PWA funciona bem, mas a app nativa (Android) protege com o ecrã bloqueado: BLE dos anéis/óculos em fundo, SOS mais rápido e notificações garantidas. Vai a /instalar e escolhe App Nativa.',
  },
  {
    id: 'app-6',
    category: 'app',
    title: 'Cofre de Evidências: grava primeiro, exporta depois',
    text: 'Em situações de ameaça verbal, grava áudio pelo Cofre de Evidências — as gravações ficam protegidas e assinaladas com hora e local. Em Moçambique, gravar a tua própria conversa para defesa é legítima; usa com responsabilidade.',
  },
]

/** Dica do dia — rotação diária e determinística por categoria misturada. */
export function getDailyTip(): SafetyTip {
  const dayNumber = Math.floor(Date.now() / 86_400_000)
  return SAFETY_TIPS[dayNumber % SAFETY_TIPS.length]
}

/** N dicas destacadas para hoje (diária + 2 complementares). */
export function getDailyTips(n = 3): SafetyTip[] {
  const dayNumber = Math.floor(Date.now() / 86_400_000)
  const tips: SafetyTip[] = []
  for (let i = 0; i < n; i++) {
    tips.push(SAFETY_TIPS[(dayNumber * 7 + i * 11) % SAFETY_TIPS.length])
  }
  return tips
}
