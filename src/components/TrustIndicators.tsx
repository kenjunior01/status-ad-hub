import { useTranslation } from "react-i18next";
import { Shield, CheckCircle, Globe, CreditCard, Clock, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import { Skeleton } from "@/components/ui/skeleton";

interface TrustIndicatorsProps {
  className?: string;
}

export const TrustIndicators = ({ className }: TrustIndicatorsProps) => {
  const { t } = useTranslation();
  
  const indicators = [
    {
      icon: Shield,
      label: t('trust.securePayment'),
      description: t('trustIndicators.secureDesc')
    },
    {
      icon: CheckCircle,
      label: t('trust.verifiedCreators'),
      description: t('trustIndicators.verifiedDesc')
    },
    {
      icon: Globe,
      label: t('trustIndicators.globalReach'),
      description: t('trustIndicators.globalDesc')
    },
    {
      icon: CreditCard,
      label: t('trustIndicators.multiCurrency'),
      description: t('trustIndicators.currencyDesc')
    }
  ];

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {indicators.map((indicator, index) => {
        const Icon = indicator.icon;
        return (
          <div
            key={index}
            className="flex flex-col items-center text-center p-4 glass rounded-lg hover:glow-primary transition-all duration-300"
          >
            <div className="bg-primary/10 p-3 rounded-full mb-2">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <h4 className="font-medium text-sm text-foreground mb-1">
              {indicator.label}
            </h4>
            <p className="text-xs text-muted-foreground">
              {indicator.description}
            </p>
          </div>
        );
      })}
    </div>
  );
};

interface SocialProofProps {
  className?: string;
}

export const SocialProof = ({ className }: SocialProofProps) => {
  const { t } = useTranslation();
  const { formatFromUSD } = useLocalizationContext();
  const { stats, loading } = usePlatformStats();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString('pt-BR');
  };
  
  return (
    <div className={cn("text-center space-y-6", className)}>
      {/* Only show stats when there's meaningful data */}
      {!loading && (stats?.overview.total_creators || 0) > 0 && (
        <div className="flex justify-center items-center gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {formatNumber(stats?.overview.total_creators || 0)}
            </div>
            <div className="text-xs text-muted-foreground">{t('socialProof.creators')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success">
              {formatFromUSD(stats?.overview.total_campaign_value || 0)}
            </div>
            <div className="text-xs text-muted-foreground">{t('socialProof.paid')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">
              {stats?.overview.completion_rate || 0}%
            </div>
            <div className="text-xs text-muted-foreground">{t('socialProof.completionRate')}</div>
          </div>
        </div>
      )}

      {/* Trust badges instead of fake testimonial */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex items-center gap-2 justify-center bg-muted/50 rounded-lg p-3">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">{t('trust.securePayment')}</span>
        </div>
        <div className="flex items-center gap-2 justify-center bg-muted/50 rounded-lg p-3">
          <CheckCircle className="h-4 w-4 text-success" />
          <span className="text-xs font-medium">{t('trust.verifiedCreators')}</span>
        </div>
        <div className="flex items-center gap-2 justify-center bg-muted/50 rounded-lg p-3">
          <Globe className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">{t('trustIndicators.globalReach')}</span>
        </div>
        <div className="flex items-center gap-2 justify-center bg-muted/50 rounded-lg p-3">
          <CreditCard className="h-4 w-4 text-success" />
          <span className="text-xs font-medium">{t('trustIndicators.multiCurrency')}</span>
        </div>
      </div>
    </div>
  );
};

interface UrgencyCounterProps {
  endTime: Date;
  className?: string;
}

export const UrgencyCounter = ({ endTime, className }: UrgencyCounterProps) => {
  const { t } = useTranslation();
  
  return (
    <div className={cn("bg-warning/10 border border-warning/20 rounded-lg p-4", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-4 w-4 text-warning" />
        <span className="text-sm font-medium text-warning">{t('urgency.limitedOffer')}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('urgency.signupBonus')}
      </p>
      <div className="mt-2 text-xs text-warning font-medium">
        ⏰ {t('urgency.spotsLeft')}
      </div>
    </div>
  );
};
