import { useTranslation } from "react-i18next";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { Globe, Users, DollarSign, Star, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const TrustStatsBar = () => {
  const { t } = useTranslation();
  const { formatFromUSD } = useLocalizationContext();
  const { stats, loading } = usePlatformStats();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString('pt-BR');
  };

  return (
    <section className="py-6 px-4 bg-card border-b border-border">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              {loading ? <Skeleton className="h-7 w-16" /> : (
                <p className="font-bold text-xl text-foreground">
                  {formatNumber(stats?.overview.total_creators || 0)}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{t('hero.stats.creators')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div>
              {loading ? <Skeleton className="h-7 w-20" /> : (
                <p className="font-bold text-xl text-foreground">
                  {formatFromUSD(stats?.overview.total_campaign_value || 0)}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{t('hero.stats.paid')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              {loading ? <Skeleton className="h-7 w-16" /> : (
                <p className="font-bold text-xl text-foreground">
                  {formatNumber(stats?.overview.total_campaigns || 0)}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Campanhas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <Star className="h-5 w-5 text-warning" />
            </div>
            <div>
              {loading ? <Skeleton className="h-7 w-12" /> : (
                <p className="font-bold text-xl text-foreground">
                  {stats?.overview.completion_rate || 0}%
                </p>
              )}
              <p className="text-xs text-muted-foreground">Taxa de Conclusão</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Shield className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="font-bold text-xl text-foreground">100%</p>
              <p className="text-xs text-muted-foreground">{t('trust.securePayment')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
