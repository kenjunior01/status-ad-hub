import { useMemo } from "react";

type MascotMood = "happy" | "waving" | "excited" | "cool" | "love" | "thinking" | "sleeping" | "surprised";

interface MascotTip {
  mood: MascotMood;
  message: string;
}

const TIPS_BY_PAGE: Record<string, MascotTip[]> = {
  index: [
    { mood: "waving", message: "Bem-vindo! Explore criadores incríveis 🎯" },
    { mood: "excited", message: "Milhares de criadores prontos para monetizar!" },
    { mood: "cool", message: "O marketplace #1 de WhatsApp Status 🚀" },
    { mood: "happy", message: "Encontre o criador perfeito para sua marca!" },
  ],
  messages: [
    { mood: "happy", message: "Negocie directamente com criadores! 💬" },
    { mood: "cool", message: "Use cotações e facturas direto no chat 📄" },
    { mood: "thinking", message: "Dica: envie comprovativos de pagamento aqui!" },
    { mood: "love", message: "Comunicação é a chave do sucesso! 🔑" },
    { mood: "excited", message: "Crie cotações com o botão + no topo! 📋" },
  ],
  "creator-dashboard": [
    { mood: "excited", message: "Acompanhe seus ganhos em tempo real! 💰" },
    { mood: "thinking", message: "Complete seu perfil para mais oportunidades!" },
    { mood: "cool", message: "Suba de rank completando campanhas! ⭐" },
    { mood: "happy", message: "Seu painel, sua central de comando!" },
  ],
  "advertiser-dashboard": [
    { mood: "happy", message: "Gerencie suas campanhas como um pro! 📊" },
    { mood: "thinking", message: "Use a StatusAI para encontrar criadores ideais!" },
    { mood: "cool", message: "Acompanhe o ROI de cada campanha!" },
    { mood: "excited", message: "Publique anúncios e receba candidaturas! 🎯" },
  ],
  "admin-dashboard": [
    { mood: "cool", message: "Painel de controle total da plataforma! 🛡️" },
    { mood: "thinking", message: "Monitore transações e disputas." },
  ],
  auth: [
    { mood: "waving", message: "Crie sua conta em segundos! ✨" },
    { mood: "love", message: "Junte-se a milhares de criadores!" },
    { mood: "happy", message: "Login rápido e seguro 🔒" },
  ],
  academia: [
    { mood: "thinking", message: "Aprenda a monetizar seu Status! 📚" },
    { mood: "excited", message: "Dicas de ouro para criadores! 💡" },
  ],
};

const TIPS_BY_STATE: Record<string, MascotTip[]> = {
  no_conversations: [
    { mood: "thinking", message: "Ainda sem conversas? Candidate-se a anúncios!" },
    { mood: "waving", message: "Explore o marketplace e comece a negociar!" },
  ],
  new_user: [
    { mood: "waving", message: "Primeira vez aqui? Complete seu perfil! 🎉" },
    { mood: "excited", message: "Bem-vindo à comunidade StatusAds! 🌟" },
  ],
  returning: [
    { mood: "happy", message: "Bom te ver de volta! 😊" },
    { mood: "cool", message: "Que bom que voltou! Vamos trabalhar? 💪" },
  ],
};

export const useMascotContext = (
  page: string,
  state?: string
): MascotTip => {
  return useMemo(() => {
    // State-specific tips have priority
    if (state && TIPS_BY_STATE[state]) {
      const stateTips = TIPS_BY_STATE[state];
      return stateTips[Math.floor(Math.random() * stateTips.length)];
    }

    const pageTips = TIPS_BY_PAGE[page] || TIPS_BY_PAGE.index;
    return pageTips[Math.floor(Math.random() * pageTips.length)];
  }, [page, state]);
};
