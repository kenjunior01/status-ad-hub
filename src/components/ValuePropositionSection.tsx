import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import {
  Building2,
  User,
  Globe,
  DollarSign,
  Target,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Megaphone,
  Wallet,
  Clock,
  Star
} from "lucide-react";

interface ValuePropositionSectionProps {
  onNavigate?: (page: string) => void;
}

export const ValuePropositionSection = ({ onNavigate }: ValuePropositionSectionProps) => {
  const { t } = useTranslation();
  const { stats, loading } = usePlatformStats();
  const { formatFromUSD } = useLocalizationContext();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString('pt-BR');
  };

  const businessBenefits = [
    {
      icon: Globe,
      title: t('valueProposition.business.benefits.globalReach.title'),
      description: t('valueProposition.business.benefits.globalReach.description')
    },
    {
      icon: Target,
      title: t('valueProposition.business.benefits.targetedAds.title'),
      description: t('valueProposition.business.benefits.targetedAds.description')
    },
    {
      icon: BarChart3,
      title: t('valueProposition.business.benefits.analytics.title'),
      description: t('valueProposition.business.benefits.analytics.description')
    },
    {
      icon: Shield,
      title: t('valueProposition.business.benefits.verified.title'),
      description: t('valueProposition.business.benefits.verified.description')
    }
  ];

  const creatorBenefits = [
    {
      icon: Wallet,
      title: t('valueProposition.creator.benefits.monetize.title'),
      description: t('valueProposition.creator.benefits.monetize.description')
    },
    {
      icon: Clock,
      title: t('valueProposition.creator.benefits.flexible.title'),
      description: t('valueProposition.creator.benefits.flexible.description')
    },
    {
      icon: DollarSign,
      title: t('valueProposition.creator.benefits.payments.title'),
      description: t('valueProposition.creator.benefits.payments.description')
    },
    {
      icon: Star,
      title: t('valueProposition.creator.benefits.growth.title'),
      description: t('valueProposition.creator.benefits.growth.description')
    }
  ];

  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 px-4 py-1">
            <Globe className="h-3 w-3 mr-2" />
            {t('valueProposition.badge')}
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('valueProposition.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('valueProposition.subtitle')}
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* For Businesses */}
          <Card className="relative overflow-hidden border-2 glass hover:border-primary/50 hover:glow-primary transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <Badge className="bg-primary/10 text-primary border-0">
                  {t('valueProposition.business.badge')}
                </Badge>
              </div>
              <CardTitle className="text-2xl">
                {t('valueProposition.business.title')}
              </CardTitle>
              <CardDescription className="text-base">
                {t('valueProposition.business.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {businessBenefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg shrink-0">
                      <benefit.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{benefit.title}</p>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats - Only show when data exists */}
              {!loading && (stats?.overview.total_campaigns || 0) > 0 && (
                <div className="grid grid-cols-3 gap-4 py-4 border-y border-border">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">
                      {formatNumber(stats?.overview.total_campaigns || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('hero.stats.campaigns')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">
                      {formatNumber(stats?.overview.total_creators || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('hero.stats.creators')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">
                      {stats?.overview.completion_rate || 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">{t('valueProposition.business.stats.openRate')}</p>
                  </div>
                </div>
              )}

              <Button 
                className="w-full gap-2" 
                size="lg"
                onClick={() => onNavigate?.('advertiser-dashboard')}
              >
                <Megaphone className="h-4 w-4" />
                {t('valueProposition.business.cta')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* For Individuals/Creators */}
          <Card className="relative overflow-hidden border-2 glass hover:border-success/50 hover:glow-success transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-success/10 to-transparent" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-success/10 rounded-xl">
                  <User className="h-6 w-6 text-success" />
                </div>
                <Badge className="bg-success/10 text-success border-0">
                  {t('valueProposition.creator.badge')}
                </Badge>
              </div>
              <CardTitle className="text-2xl">
                {t('valueProposition.creator.title')}
              </CardTitle>
              <CardDescription className="text-base">
                {t('valueProposition.creator.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {creatorBenefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg shrink-0">
                      <benefit.icon className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{benefit.title}</p>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats - Only show when data exists */}
              {!loading && (stats?.overview.total_creators || 0) > 0 && (
                <div className="grid grid-cols-3 gap-4 py-4 border-y border-border">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-success">
                      {formatFromUSD(stats?.overview.total_paid_to_creators || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('valueProposition.creator.stats.paid')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-success">
                      {formatNumber(stats?.overview.total_creators || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('valueProposition.creator.stats.creators')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-success">24h</p>
                    <p className="text-xs text-muted-foreground">{t('valueProposition.creator.stats.payout')}</p>
                  </div>
                </div>
              )}

              <Button 
                className="w-full gap-2 bg-success hover:bg-success/90" 
                size="lg"
                onClick={() => onNavigate?.('creator-dashboard')}
              >
                <Zap className="h-4 w-4" />
                {t('valueProposition.creator.cta')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Global Trust Indicators */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground mb-6">
            {t('valueProposition.trustedBy')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="font-medium">{t('valueProposition.trust.securePayments')}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="font-medium">{t('valueProposition.trust.verifiedCreators')}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="font-medium">{t('valueProposition.trust.globalSupport')}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="font-medium">{t('valueProposition.trust.multiCurrency')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
