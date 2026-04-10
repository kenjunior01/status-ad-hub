import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { GamificationBadge } from "@/components/GamificationBadge";
import { calculateXP, getProgressToNextRank, RANKS } from "@/lib/gamification";
import { useProfile } from "@/hooks/useProfile";
import { Trophy, Zap, Star, TrendingUp, Lock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const GamificationProgress = () => {
  const { t } = useTranslation();
  const { profile } = useProfile();

  const xp = calculateXP({
    total_campaigns: profile?.total_campaigns || 0,
    total_reviews: profile?.total_reviews || 0,
    rating: profile?.rating || 0,
    is_verified: profile?.is_verified || false,
    follower_count: profile?.follower_count || 0,
    engagement_rate: profile?.engagement_rate || 0,
  });

  const { current, next, progress, xpNeeded } = getProgressToNextRank(xp);

  return (
    <Card className="glass border-border/40 overflow-hidden">
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", current.bgGradient.replace('/20', '').replace('/10', ''))} />
      
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="text-base">{t("gamification.levelAndProgress")}</span>
          </div>
          <GamificationBadge badgeLevel={current.rank} size="md" />
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-primary" />
              {xp.toLocaleString()} XP
            </span>
            {next && (
              <span className="text-muted-foreground">
                {next.icon} {next.label} {t("gamification.inXP", { xp: xpNeeded.toLocaleString() })}
              </span>
            )}
          </div>
          <Progress value={progress} className="h-2.5" />
          {!next && (
            <p className="text-xs text-center text-primary font-medium">
              {t("gamification.maxLevelReached")}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-1">
          {RANKS.map((rank, i) => {
            const isActive = rank.rank === current.rank;
            const isUnlocked = xp >= rank.minXP;
            
            return (
              <motion.div
                key={rank.rank}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className={cn("flex flex-col items-center gap-1 flex-1", !isUnlocked && "opacity-40")}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all",
                  isActive ? "border-primary bg-primary/10 scale-110" : isUnlocked ? "border-primary/40 bg-primary/5" : "border-muted bg-muted/30"
                )}>
                  {isUnlocked ? rank.icon : <Lock className="h-3 w-3 text-muted-foreground" />}
                </div>
                <span className={cn("text-[9px] font-medium text-center", isActive ? "text-primary" : "text-muted-foreground")}>
                  {rank.label}
                </span>
              </motion.div>
            );
          })}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Star className="h-3 w-3" />
            {t("gamification.levelBenefits", { level: current.label })}
          </p>
          <div className="grid grid-cols-1 gap-1">
            {current.perks.map((perk, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-foreground">
                <Check className="h-3 w-3 text-primary flex-shrink-0" />
                {perk}
              </div>
            ))}
          </div>
        </div>

        {next && (
          <div className="bg-muted/30 rounded-lg p-3 border border-border/40">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span dangerouslySetInnerHTML={{ __html: t("gamification.unlockNextLevel", { level: next.label, rate: next.commissionRate }) }} />
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};