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
    return num.toLocaleString();
  };

  const statItems = [
    {
      icon: Users,
      value: formatNumber(stats?.overview.total_creators || 0),
      label: t('hero.stats.creators'),
      color: "text-primary",
      bg: "bg-primary/10"
    },
    {
      icon: DollarSign,
      value: formatFromUSD(stats?.overview.total_campaign_value || 0),
      label: t('hero.stats.paid'),
      color: "text-success",
      bg: "bg-success/10"
    },
    {
      icon: Globe,
      value: formatNumber(stats?.overview.total_campaigns || 0),
      label: t('hero.stats.campaigns'),
      color: "text-primary",
      bg: "bg-primary/10"
    },
    {
      icon: Shield,
      value: "100%",
      label: t('trust.securePayment'),
      color: "text-accent",
      bg: "bg-accent/10"
    },
  ];

  return (
    <section className="py-4 md:py-6 px-4 bg-card/50 border-b border-border/30">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {statItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="text-center">
                {loading ? (
                  <Skeleton className="h-7 w-16 mx-auto mb-1" />
                ) : (
                  <p className="font-bold text-lg md:text-2xl text-foreground">{item.value}</p>
                )}
                <p className="text-[10px] md:text-xs text-muted-foreground">{item.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
