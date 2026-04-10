import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  User, Camera, FileText, Zap, CheckCircle, ArrowRight, X, 
  Globe, Shield, TrendingUp, Sparkles, Target, Bot, CreditCard, Upload
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  id: string;
  icon: typeof User;
  title: string;
  description: string;
  isComplete: boolean;
  actionLabel?: string;
}

interface OnboardingFlowProps {
  profile: {
    display_name?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    niche?: string | null;
    is_verified?: boolean;
    total_campaigns?: number;
  } | null;
  role?: 'creator' | 'advertiser' | string | null;
  campaignCount?: number;
  onAction: (action: string) => void;
  onDismiss: () => void;
}

const ONBOARDING_DISMISSED_KEY = "statusads_onboarding_dismissed";

export const OnboardingFlow = ({ profile, role, campaignCount = 0, onAction, onDismiss }: OnboardingFlowProps) => {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const [currentHighlight, setCurrentHighlight] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem(ONBOARDING_DISMISSED_KEY);
    if (stored === "true") setDismissed(true);
  }, []);

  const isAdvertiser = role === 'advertiser';

  const creatorSteps: OnboardingStep[] = [
    {
      id: "name", icon: User,
      title: t("onboarding.completeProfile"),
      description: t("onboarding.completeProfileDesc"),
      isComplete: !!(profile?.display_name && profile?.bio),
      actionLabel: t("onboarding.editProfile"),
    },
    {
      id: "niche", icon: Globe,
      title: t("onboarding.defineNiche"),
      description: t("onboarding.defineNicheDesc"),
      isComplete: !!profile?.niche,
      actionLabel: t("onboarding.defineNicheAction"),
    },
    {
      id: "avatar", icon: Camera,
      title: t("onboarding.addPhoto"),
      description: t("onboarding.addPhotoDesc"),
      isComplete: !!profile?.avatar_url,
      actionLabel: t("onboarding.addPhotoAction"),
    },
    {
      id: "first_campaign", icon: Upload,
      title: t("onboarding.firstProof"),
      description: t("onboarding.firstProofDesc"),
      isComplete: (profile?.total_campaigns || 0) > 0,
      actionLabel: t("onboarding.viewCampaigns"),
    },
  ];

  const advertiserSteps: OnboardingStep[] = [
    {
      id: "create_campaign", icon: Target,
      title: t("onboarding.createCampaign"),
      description: t("onboarding.createCampaignDesc"),
      isComplete: campaignCount > 0,
      actionLabel: t("dashboard.newCampaign"),
    },
    {
      id: "find_creator", icon: Bot,
      title: t("onboarding.useMatchmaker"),
      description: t("onboarding.useMatchmakerDesc"),
      isComplete: false,
      actionLabel: t("onboarding.goToStatusAI"),
    },
    {
      id: "make_payment", icon: CreditCard,
      title: t("onboarding.securePayment"),
      description: t("onboarding.securePaymentDesc"),
      isComplete: false,
      actionLabel: t("onboarding.viewPayments"),
    },
    {
      id: "review_proof", icon: CheckCircle,
      title: t("onboarding.trackVerification"),
      description: t("onboarding.trackVerificationDesc"),
      isComplete: false,
      actionLabel: t("onboarding.viewVerifications"),
    },
  ];

  const steps = isAdvertiser ? advertiserSteps : creatorSteps;
  const completedSteps = steps.filter(s => s.isComplete).length;
  const progress = (completedSteps / steps.length) * 100;
  const allComplete = completedSteps === steps.length;

  useEffect(() => {
    const nextIncomplete = steps.findIndex(s => !s.isComplete);
    if (nextIncomplete >= 0) setCurrentHighlight(nextIncomplete);
  }, [profile, campaignCount]);

  if (dismissed || allComplete) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    onDismiss();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="glass border-border/40 rounded-xl p-4 md:p-5 relative overflow-hidden"
    >
      <button onClick={handleDismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors z-10">
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="bg-primary/10 p-2 rounded-lg">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-foreground">
            {isAdvertiser ? t("onboarding.launchCampaign") : t("onboarding.getStarted")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("onboarding.stepsCompleted", { done: completedSteps, total: steps.length })}
          </p>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-primary">{Math.round(progress)}%</span>
        </div>
      </div>

      <Progress value={progress} className="h-1.5 mb-4" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isHighlighted = i === currentHighlight;

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                "flex items-start gap-2.5 p-3 rounded-lg border transition-all cursor-pointer",
                step.isComplete ? "bg-primary/5 border-primary/20"
                  : isHighlighted ? "bg-muted/50 border-primary/30 ring-1 ring-primary/20"
                  : "bg-muted/20 border-border/30 hover:border-border/50"
              )}
              onClick={() => !step.isComplete && onAction(step.id)}
            >
              <div className={cn(
                "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
                step.isComplete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {step.isComplete ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-xs font-medium", step.isComplete ? "text-primary line-through" : "text-foreground")}>
                  {step.title}
                </p>
                <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{step.description}</p>
                {!step.isComplete && isHighlighted && (
                  <Button size="sm" variant="link" className="h-auto p-0 text-[10px] text-primary mt-1">
                    {step.actionLabel} <ArrowRight className="h-2.5 w-2.5 ml-0.5" />
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};