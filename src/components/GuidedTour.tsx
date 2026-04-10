import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  targetTab?: string;
  emoji: string;
}

interface GuidedTourProps {
  role: "creator" | "advertiser";
  onNavigate: (tab: string) => void;
  onComplete: () => void;
}

const TOUR_COMPLETED_KEY = "statusads_tour_completed";

export const GuidedTour = ({ role, onNavigate, onComplete }: GuidedTourProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(`${TOUR_COMPLETED_KEY}_${role}`);
    if (!done) setVisible(true);
  }, [role]);

  const creatorSteps: TourStep[] = [
    { title: "Bem-vindo ao StatusAds! 🎉", description: "Vamos guiá-lo pelos principais recursos da plataforma para começar a monetizar seu WhatsApp Status.", emoji: "👋", targetTab: "overview" },
    { title: "Suas Campanhas 📋", description: "Aqui você verá todas as campanhas disponíveis. Aceite propostas de anunciantes e ganhe dinheiro publicando nos seus Status.", emoji: "📋", targetTab: "campaigns" },
    { title: "Seus Ganhos 💰", description: "Acompanhe seus ganhos em tempo real. Veja quanto ganhou este mês e o total acumulado.", emoji: "📈", targetTab: "earnings" },
    { title: "Seu Perfil ⚙️", description: "Complete seu perfil para atrair mais anunciantes. Adicione foto, bio e defina seu nicho.", emoji: "👤", targetTab: "profile" },
  ];

  const advertiserSteps: TourStep[] = [
    { title: "Bem-vindo ao StatusAds! 🎉", description: "Vamos mostrar como alcançar milhares de pessoas através do WhatsApp Status dos nossos criadores.", emoji: "👋", targetTab: "overview" },
    { title: "Crie Campanhas 🚀", description: "Clique em 'Nova Campanha' para criar seu anúncio. Defina título, orçamento e escolha o criador ideal.", emoji: "📋", targetTab: "campaigns" },
    { title: "Pagamentos 💳", description: "Gerencie seus pagamentos de forma segura. Pague campanhas e compre pontos para destacar publicações.", emoji: "💳", targetTab: "payments" },
    { title: "StatusAI 🤖", description: "Use inteligência artificial para encontrar os melhores criadores e prever o ROI das suas campanhas.", emoji: "🤖", targetTab: "statusai" },
  ];

  const steps = role === "creator" ? creatorSteps : advertiserSteps;

  if (!visible) return null;

  const handleNext = () => {
    if (step < steps.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      if (steps[nextStep].targetTab) onNavigate(steps[nextStep].targetTab!);
    } else {
      localStorage.setItem(`${TOUR_COMPLETED_KEY}_${role}`, "true");
      setVisible(false);
      onComplete();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      const prevStep = step - 1;
      setStep(prevStep);
      if (steps[prevStep].targetTab) onNavigate(steps[prevStep].targetTab!);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(`${TOUR_COMPLETED_KEY}_${role}`, "true");
    setVisible(false);
    onComplete();
  };

  const current = steps[step];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative glass border-primary/30 rounded-xl p-5 overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <button onClick={handleSkip} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4 mt-2">
          <div className="text-4xl">{current.emoji}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                Passo {step + 1} de {steps.length}
              </span>
            </div>
            <h3 className="font-bold text-foreground text-base">{current.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{current.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-xs text-muted-foreground">
            Pular tour
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrev}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Anterior
              </Button>
            )}
            <Button size="sm" onClick={handleNext} className="bg-gradient-primary">
              {step === steps.length - 1 ? "Concluir" : "Próximo"}
              {step < steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 ml-1" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
