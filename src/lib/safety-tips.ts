/**
 * safety-tips ? Biblioteca de dicas de seguran?a pessoal.
 *
 * Conte?do pr?tico e localizado para a realidade mo?ambicana:
 * casa, rua, chapas/t?xis, viagens, online, assaltos, multid?es,
 * fam?lia e uso inteligente do pr?prio app.
 *
 * A "Dica do dia" rota automaticamente (baseada na data) no Dashboard
 * e na p?gina Dicas de Seguran?a.
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
  { id: 'casa', label: 'Em Casa', description: 'Protec??o da resid?ncia e rotinas seguras', emoji: '??' },
  { id: 'rua', label: 'Na Rua', description: 'Desloca??es a p? e aten??o ao ambiente', emoji: '??' },
  { id: 'transporte', label: 'Chapas & T?xis', description: 'Transporte p?blico e boleias com seguran?a', emoji: '??' },
  { id: 'viagem', label: 'Viagens', description: 'Estradas, viagens longas e chegadas', emoji: '???' },
  { id: 'online', label: 'Online & WhatsApp', description: 'Golpes, engenharia social e privacidade', emoji: '??' },
  { id: 'assalto', label: 'Assalto & Rapto', description: 'Como agir nas situa??es mais cr?ticas', emoji: '??' },
  { id: 'multidoes', label: 'Multid?es & Eventos', description: 'Marchas, mercados, festas e est?dios', emoji: '???' },
  { id: 'familia', label: 'Fam?lia & Crian?as', description: 'Proteger quem mais ama', emoji: '????????' },
  { id: 'app', label: 'Dominar o App', description: 'Extrair o m?ximo do StatusAds Connect', emoji: '???' },
]

export const SAFETY_TIPS: SafetyTip[] = [
  /* ?? EM CASA ?? */
  {
    id: 'casa-1',
    category: 'casa',
    title: 'Deixa sempre uma luz de fundo',
    text: 'Um candeeiro aceso ou um temporizador de luz durante a noite d? a impress?o de que h? gente em casa. A maioria das tentativas de entrada come?a com observa??o: se a casa parecer habitada, o risco diminui drasticamente.',
    essential: true,
  },
  {
    id: 'casa-2',
    category: 'casa',
    title: 'Confere quem bate ANTES de abrir',
    text: 'Usa o olho m?gico, a janela ou pergunta "quem ??" sem abrir a porta. Inquilinos e trabalhadores de servi?os (EDM, FIPAG, g?s) devem ser pedidos para mostrar identifica??o ? janela. Batedores disfar?am-se de t?cnicos para confirmar se a casa est? vazia.',
    essential: true,
  },
  {
    id: 'casa-3',
    category: 'casa',
    title: 'Evita rotinas previs?veis',
    text: 'Se saes sempre ?s 06:15 e voltas ?s 17:30 todos os dias, quem te observa sabe exactamente quando a casa fica vazia. Variar 20-30 minutos de vez em quando, ou confiar um vizinho de confian?a para vigiar, quebra esse padr?o.',
  },
  {
    id: 'casa-4',
    category: 'casa',
    title: 'Cuidado com o que publicas sobre a tua casa',
    text: 'Fotos que mostram port?es, gradeamento, cancelas e c?maras ajudam a mapear a tua seguran?a. Antes de publicar uma foto em casa, faz zoom na imagem: se conseguires identificar pontos de entrada, um estranho tamb?m consegue.',
  },
  {
    id: 'casa-5',
    category: 'casa',
    title: 'Acorda a rede de vizinhan?a',
    text: 'Um grupo de WhatsApp de rua bem usado vale mais que um c?o: acorda a rua sobre um estranho a rondar, uma viatura suspeita, um furto ontem ? noite. Cria o grupo com 10-20 vizinhos pr?ximos e combina sinais simples de alerta.',
  },
  {
    id: 'casa-6',
    category: 'casa',
    title: 'Tem n?meros de emerg?ncia ? m?o',
    text: 'Grava na tua lista: pol?cia 119/112, bombeiros, ambul?ncia, o teu jefe de quarteir?o e 2 vizinhos. Em p?nico ningu?m procura no papel ? os n?meros t?m de estar memorizados ou em favoritos no telefone.',
  },

  /* ?? NA RUA ?? */
  {
    id: 'rua-1',
    category: 'rua',
    title: 'Anda com o telem?vel fora de vista',
    text: 'Telem?vel na rua = alvo. Evita mandar mensagens parado no passeio; se precisares de usar o telefone, encosta-te a um muro, de costas para a parede, e guarda-o antes de voltar a andar. Roubo de telem?vel ? o crime de rua mais comum nos centros das cidades.',
    essential: true,
  },
  {
    id: 'rua-2',
    category: 'rua',
    title: 'Confian?a anda ao contr?rio: quem te para, justifica-se',
    text: 'Se algu?m que se diz pol?cia ou agente te abordar ? noite em local despovoado, permanece calmo e prop?e caminhar at? um local iluminado e movimentado. Agentes leg?timos n?o se incomodam; assaltantes evitam testemunhas.',
    essential: true,
  },
  {
    id: 'rua-3',
    category: 'rua',
    title: 'Evita atalhos vazios ao fim do dia',
    text: 'O caminho mais curto n?o ? necessariamente o mais seguro se for despovoado ou mal iluminado. Prefere ruas movimentadas e iluminadas. Usa uma aplica??o de navega??o para seguir ruas; a an?lise do StatusAds apenas assinala alertas comunit?rios pr?ximos de uma linha directa e n?o escolhe caminhos seguros.',
  },
  {
    id: 'rua-4',
    category: 'rua',
    title: 'Leva pouco dinheiro "de mostra"',
    text: 'Separa o dinheiro: uma pequena nota num bolso de acesso r?pido e o resto escondido noutra pasta ou bolso interno. Sob press?o, entregas a nota acess?vel. Cart?es e telem?vel nunca no mesmo s?tio que o dinheiro "de mostra".',
  },
  {
    id: 'rua-5',
    category: 'rua',
    title: 'Sacos e malas: lado contr?rio ? rua',
    text: 'Anda com a mala ou saco no lado oposto ? estrada. Motociclistas roubam do lado do tr?nsito em segundos. Fecha zips virados para o corpo e usa al?a transversal em vez de ombro s?.',
  },
  {
    id: 'rua-6',
    category: 'rua',
    title: 'Se te sentires seguido: entra num local p?blico',
    text: 'Muda de passeio, atravessa a rua, entra numa loja, farm?cia, posto ou igreja. Ningu?m segue uma pessoa dentro de um s?tio cheio. Se a sensa??o persistir, usa o app: ac??o "Alerta por WhatsApp" para um familiar com a tua localiza??o em tempo real.',
  },

  /* ?? CHAPAS & T?XIS ?? */
  {
    id: 'trans-1',
    category: 'transporte',
    title: 'T?xi: anota a matr?cula e partilha antes de entrar',
    text: 'Antes de entrar num t?xi ou carro de aplica??o, tira foto da matr?cula e manda a um familiar: "vou num branco 123-ABC-123, saio daqui para casa". Faz isto sempre ? ? o h?bito que mais dissuade motoristas desonestos.',
    essential: true,
  },
  {
    id: 'trans-2',
    category: 'transporte',
    title: 'Senta-te perto da janela com sa?da livre',
    text: 'Num t?xi, evita o meio de bancos apertados onde n?o consegues sair depressa. Na chapa, prefere o lugar perto da porta. Em qualquer ve?culo: porta destrancada se poss?vel e telem?vel no bolso de acesso r?pido.',
  },
  {
    id: 'trans-3',
    category: 'transporte',
    title: 'Boleia: nunca para um desconhecido sem testemunha',
    text: 'Se aceitares boleia, que seja ? vista de gente, com a matr?cula partilhada e a viagem activa no app (Rastreamento de Viagem partilha a tua localiza??o em tempo real com quem escolheres). Se o motorista desviar da rota combinada, pede para parar em local movimentado.',
    essential: true,
  },
  {
    id: 'trans-4',
    category: 'transporte',
    title: 'Dinheiro trocado e escondido',
    text: 'Prepara o valor exacto da passagem antes. N?o exibes notas grandes na porta da chapa ? ? publicidade ao teu dinheiro. Guarda o resto noutra zona do corpo antes de voltar a andar.',
  },
  {
    id: 'trans-5',
    category: 'transporte',
    title: 'Hor?rio: evita as primeiras e ?ltimas chapas',
    text: 'Chapas ?s 04:30 e depois das 20:00 t?m menos passageiros e menos testemunhas ? ? onde acontecem os piores incidentes. Se o hor?rio for inevit?vel, avisa algu?m do trajeto e hora de chegada estimada.',
  },
  {
    id: 'trans-6',
    category: 'transporte',
    title: 'Conversa com o motorista sem dar informa??o',
    text: 'Motoristas simp?ticos perguntam onde moras, se vives sozinho, se esperas algu?m. Responde com vaguedade ("perto", "n?o, moro com fam?lia"). Informa??o aparentemente inofensiva ? usada para escolher alvos.',
  },

  /* ?? VIAGENS ?? */
  {
    id: 'viag-1',
    category: 'viagem',
    title: 'Activa o Rastreamento de Viagem sempre que estrada',
    text: 'Antes de arrancar numa viagem, activa o Rastreamento de Viagem no app e partilha o link com um familiar. Se algo acontecer, a pessoa sabe exactamente o ?ltimo ponto do teu trajecto ? sem precisar de te ligar.',
    essential: true,
  },
  {
    id: 'viag-2',
    category: 'viagem',
    title: 'Combina check-ins por hora',
    text: 'Em viagens longas, combina com a fam?lia: "envio mensagem a cada 2 horas". Passou 1 hora sem mensagem? A pessoa activa a partilha de localiza??o. A pontualidade do check-in ? o teu sistema de alarme silencioso.',
  },
  {
    id: 'viag-3',
    category: 'viagem',
    title: 'N?o pares em zonas ermas ? noite',
    text: 'Se precisares de descansar, preferir postos de combust?vel iluminados e com movimento. Furos e "avarias" em zonas despovoadas s?o cen?rio cl?ssico de emboscada ? se puder, continua devagar at? local seguro mesmo com pneu danificado.',
  },
  {
    id: 'viag-4',
    category: 'viagem',
    title: 'Bagagem neutra, sem publicidade',
    text: 'Sacolas de lojas caras e caixas de electr?nica vis?vel atraem aten??o em paragens. Transporta bagagem neutra e cobre o que tiver marca vis?vel. Objectos de valor v?o contigo no assento, n?o na mala do tejadilho.',
  },
  {
    id: 'viag-5',
    category: 'viagem',
    title: 'Chegando tarde: hotel antes de aventuras',
    text: 'Chegar a cidade desconhecida ? noite: vai directo ao alojamento, marca o check-in, deixa as coisas e s? depois sai. Primeira noite em cidade nova n?o ? noite de explora??o.',
  },

  /* ?? ONLINE & WHATSAPP ?? */
  {
    id: 'onl-1',
    category: 'online',
    title: 'Golpe do "parente em apuros": confirma por voz',
    text: '"M?e, estou num problema, preciso de 5000 MT urgente" ? de n?mero novo. Antes de transferir, LIGA ao n?mero antigo da pessoa ou a um familiar. Golpistas copiam fotos e nomes de perfis. Regra de ouro: dinheiro s? por confirma??o de voz com a pessoa no n?mero conhecido.',
    essential: true,
  },
  {
    id: 'onl-2',
    category: 'online',
    title: 'Nunca partilhes c?digo de verifica??o',
    text: 'Ningu?m leg?timo ? nem operadora, nem banco, nem WhatsApp ? pede o c?digo que chega por SMS. Quem pede o c?digo ? algu?m a tentar roubar a tua conta. Escreve: "vou ligar ao meu banco para confirmar" e o golpista desiste.',
    essential: true,
  },
  {
    id: 'onl-3',
    category: 'online',
    title: 'Localiza??o em tempo real: s? com quem confias',
    text: 'O WhatsApp permite partilhar localiza??o em tempo real. Usa para viagens e encontros com quem confias ? e desactiva quando chegas. Localiza??o "para sempre activa" com conhecidos distantes ? uma porta aberta.',
  },
  {
    id: 'onl-4',
    category: 'online',
    title: 'Vender online: ponto p?blico e pagamento ? vista',
    text: 'Para vender algo por an?ncio: marca encontro em centro comercial ou posto com movimento, de dia. S? entrega ao vivo e ? vista ? nunca "o meu motorista vai buscar". O golpe do motorista ? dos mais comuns em Mo?ambique.',
    essential: true,
  },
  {
    id: 'onl-5',
    category: 'online',
    title: 'Cuidado com o perfil que "trabalha no exterior"',
    text: 'Perfis rom?nticos ou de recrutadores com promessas de emprego no estrangeiro que pedem taxas antecipadas: 100% golpe. Emprego leg?timo nunca cobra para contratar. Bloqueia e reporta.',
  },
  {
    id: 'onl-6',
    category: 'online',
    title: 'Bloqueia o ecr? e usa PIN forte',
    text: 'PIN de 6 d?gitos (n?o data de nascimento), biometria activa e bloqueio autom?tico a 30 segundos. Um telem?vel roubado desbloqueado ? conta banc?ria, WhatsApp e identidade abertas ao ladr?o.',
  },

  /* ?? ASSALTO & RAPTO ?? */
  {
    id: 'ass-1',
    category: 'assalto',
    title: 'Bem material substitui-se; a vida, n?o',
    text: 'Num assalto com viol?ncia, a regra n?mero um ?: entrega. Telem?vel, dinheiro, saco ? tudo substitui-se. Nada que levas vale a tua vida. N?o corras, n?o brigueis por bens materiais, n?o fales demais: m?os vis?veis, voz calma, obedi?ncia total.',
    essential: true,
  },
  {
    id: 'ass-2',
    category: 'assalto',
    title: 'Observa sem encarar',
    text: 'Durante um assalto, recolhe sem encarar: altura, roupa, cicatriz, tatuagem, cor da viatura e sentido de fuga. Essa informa??o d?s ? pol?cia DEPOIS, em seguran?a. Encarar de frente ? interpretado como desafio.',
    essential: true,
  },
  {
    id: 'ass-3',
    category: 'assalto',
    title: 'Se ?s levado ? for?a: deixa rastros',
    text: 'Deixa cair "sem querer" objectos teus no caminho (bon?, cal?ado, cart?o) ? procuras seguem esses rastros. Se conseguires, o app StatusAds com SOS activo j? mandou a tua localiza??o aos contactos: cada segundo conta.',
  },
  {
    id: 'ass-4',
    category: 'assalto',
    title: 'Fala pouco, humaniza-te',
    text: 'Em situa??es de cativeiro, fala com calma sobre fam?lia comum, comida, futebol ? o objectivo ? ser visto como pessoa, n?o como objecto. Nunca desafi?s, nunca invoques pol?cia, nunca digas "sei quem ?s".',
  },
  {
    id: 'ass-5',
    category: 'assalto',
    title: 'O momento de fugir ? no in?cio ou na distra??o',
    text: 'Estatisticamente, os primeiros segundos ? quando ainda h? gente ? vista e o agressor ainda n?o controlou tudo ? s?o a melhor janela para fugir correndo para local com pessoas. Depois de entrarem num ve?culo, a fuga torna-se muito mais arriscada: avalia sempre antes.',
  },
  {
    id: 'ass-6',
    category: 'assalto',
    title: 'Depois do crime: preserva provas e reporta',
    text: 'N?o toques no telem?vel roubado pela app "para ver" ? reporta o IMEI ? operadora e ? pol?cia com o n?mero da ocorr?ncia. Guarda SMS, transac??es e testemunhas. A Timeline de Incidentes do app ajuda a reconstruir hor?rios exactos.',
  },

  /* ?? MULTID?ES & EVENTOS ?? */
  {
    id: 'mul-1',
    category: 'multidoes',
    title: 'Ponto de encontro combinado ANTES de entrar',
    text: '"Se nos separarmos, encontramo-nos junto ? sa?da principal ?s X horas." Combinado antes, numa multid?o sem rede, vale mais que 10 chamadas que n?o passam. Escolhe um ponto vis?vel e permanente, nunca "perto do palco".',
    essential: true,
  },
  {
    id: 'mul-2',
    category: 'multidoes',
    title: 'Nos movimentos de multid?o: bordas, n?o centro',
    text: 'Se uma multid?o aperta e come?a a empurrar, move-te diagonalmente para a borda. O perigo real de uma multid?o em p?nico ? a compress?o no centro. Bra?os junto ao peito protege as costelas e cria espa?o para respirar.',
  },
  {
    id: 'mul-3',
    category: 'multidoes',
    title: 'Marchas e concentra??es: evita por princ?pio',
    text: 'Concentra??es pol?ticas e marchas podem mudar de tom em minutos. Se estiveres pr?ximo, afasta-te assim que vires pol?cia anti-motim ou pedras ? n?o fiques a filmar de perto. Dist?ncia m?nima: 2 quarteir?es.',
  },
  {
    id: 'mul-4',
    category: 'multidoes',
    title: 'Festas: bebida nunca fora da tua vista',
    text: 'Aceita bebida s? fechada ou servida na tua frente e nunca a deixes na mesa para "guardar o lugar". Subst?ncias usadas em bebidas s?o incolores e inodoras. Vais ao WC? Deixa a bebida ou pede nova ao voltar.',
    essential: true,
  },

  /* ?? FAM?LIA & CRIAN?AS ?? */
  {
    id: 'fam-1',
    category: 'familia',
    title: 'C?digo de fam?lia para emerg?ncias',
    text: 'Combina uma palavra que s? a fam?lia sabe ("o nome do nosso primeiro c?o"). "Manda a Maria buscar os mi?dos" dita pela palavra errada = sinal de alarme. Serve tamb?m para confirmar mensagens estranhas em WhatsApp.',
    essential: true,
  },
  {
    id: 'fam-2',
    category: 'familia',
    title: 'Crian?as: nome do pai no bra?o e regra de 3 passos',
    text: 'Em mercados e festas: etiqueta escondida com nome + telefone do pai/mai na roupa ou bra?o. Regra simples: "nunca est?s a mais de 3 passos de mim". Se se perder, a crian?a deve ir a uma m?e com crian?as ou a um funcion?rio identificado ? nunca a um estranho simp?tico que "vai ajud?-la a procurar".',
  },
  {
    id: 'fam-3',
    category: 'familia',
    title: 'Ensina as crian?as o estranho perigoso N?O ? feio',
    text: 'O estranho perigoso parece gente simp?tica e bem vestida. Ensina: um adulto de verdade NUNCA pede a uma crian?a para ir a um s?tio, ajudar ou guardar segredo dos pais. Se um adulto pede isso, a crian?a grita e corre para ti.',
  },
  {
    id: 'fam-4',
    category: 'familia',
    title: 'Ficha m?dica: salva-vidas em acidentes',
    text: 'Preenche a Ficha M?dica no app (tipo sangu?neo, alergias, medica??o, contacto de emerg?ncia). Num acidente em que estejas inconsciente, socorristas com acesso ? tua partilha de emerg?ncia sabem o que N?O te podem dar.',
  },
  {
    id: 'fam-5',
    category: 'familia',
    title: 'Idosos: chamada r?pida no ecr? inicial',
    text: 'No telefone dos teus pais/av?s: bot?o de chamada r?pida do contacto familiar no ecr? inicial, volume alto, e o app instalado com os contactos de emerg?ncia j? configurados. Simples de usar sob press?o ? essencial.',
  },

  /* ?? DOMINAR O APP ?? */
  {
    id: 'app-1',
    category: 'app',
    title: 'Configura 3 contactos de emerg?ncia HOJE',
    text: 'O SOS s? ? ?til se houver quem receba. Vai a Contactos de Emerg?ncia e adiciona pelo menos 3 pessoas: algu?m da casa, algu?m do trabalho e algu?m que viva perto. Confirma que os n?meros t?m WhatsApp ? o alerta chega por SMS e WhatsApp.',
    essential: true,
  },
  {
    id: 'app-2',
    category: 'app',
    title: 'Treina o SOS por voz antes de precisar',
    text: 'Activa o SOS por Voz e testa: "socorro" em voz normal e em voz sussurrada. Aprende como o app pede confirma??o. Numa emerg?ncia real n?o h? tempo de descobrir ? o teu c?rebro vai fazer o que treinou.',
  },
  {
    id: 'app-3',
    category: 'app',
    title: 'Camuflagem + Chamada Falsa: o par perfeito',
    text: 'Disfar?a o app (Modo Discreto) e agenda uma Chamada Falsa para 1 minuto. Quando ela tocar, atendes e sais com naturalidade ? "? o chefe, ? urgente". Ningu?m desconfia de um telefonema.',
  },
  {
    id: 'app-4',
    category: 'app',
    title: 'Dead Man\'s Switch em reuni?es de risco',
    text: 'Vais a um encontro desconhecido (compra/venda, entrevista, conversa dif?cil)? Activa o Dead Man\'s Switch com 30 minutos: se n?o tocares no app nesse tempo, o SOS parte sozinho. O teu sil?ncio ? o alarme.',
    essential: true,
  },
  {
    id: 'app-5',
    category: 'app',
    title: 'Instala a app nativa para protec??o total',
    text: 'A vers?o PWA funciona bem, mas a app nativa (Android) protege com o ecr? bloqueado: BLE dos an?is/?culos em fundo, SOS mais r?pido e notifica??es garantidas. Vai a /instalar e escolhe App Nativa.',
  },
  {
    id: 'app-6',
    category: 'app',
    title: 'Cofre de Evid?ncias: grava primeiro, exporta depois',
    text: 'Em situa??es de amea?a verbal, grava ?udio pelo Cofre de Evid?ncias ? as grava??es ficam protegidas e assinaladas com hora e local. Em Mo?ambique, gravar a tua pr?pria conversa para defesa ? leg?tima; usa com responsabilidade.',
  },
]

/** Dica do dia ? rota??o di?ria e determin?stica por categoria misturada. */
export function getDailyTip(): SafetyTip {
  const dayNumber = Math.floor(Date.now() / 86_400_000)
  return SAFETY_TIPS[dayNumber % SAFETY_TIPS.length]
}

/** N dicas destacadas para hoje (di?ria + 2 complementares). */
export function getDailyTips(n = 3): SafetyTip[] {
  const dayNumber = Math.floor(Date.now() / 86_400_000)
  const tips: SafetyTip[] = []
  for (let i = 0; i < n; i++) {
    tips.push(SAFETY_TIPS[(dayNumber * 7 + i * 11) % SAFETY_TIPS.length])
  }
  return tips
}
