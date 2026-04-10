import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Flame, Trophy, Target, Zap, Gift,
  Star, TrendingUp, Users, Clock,
  ArrowRight, Sparkles, Crown, Medal
} from 'lucide-react';

interface EngagementFeaturesProps {
  onNavigate?: (page: string) => void;
}

export const EngagementFeatures = ({ onNavigate }: EngagementFeaturesProps) => {
  const { t } = useTranslation();
  const [activeChallenge, setActiveChallenge] = useState(0);

  const dailyChallenges = [
    {
      id: 1,
      title: t('engagement.challenge1', 'Complete your first campaign'),
      xp: 50,
      icon: Target,
      color: 'from-primary to-accent',
      progress: 0,
    },
    {
      id: 2,
      title: t('engagement.challenge2', 'Get 5 profile views'),
      xp: 30,
      icon: Users,
      color: 'from-accent to-success',
      progress: 60,
    },
    {
      id: 3,
      title: t('engagement.challenge3', 'Send a proposal'),
      xp: 20,
      icon: Zap,
      color: 'from-warning to-destructive',
      progress: 0,
    },
  ];

  const leaderboard = [
    { rank: 1, name: 'Top Creator', xp: 2450, badge: 'gold', icon: Crown },
    { rank: 2, name: 'Rising Star', xp: 1890, badge: 'silver', icon: Medal },
    { rank: 3, name: 'Active Seller', xp: 1240, badge: 'bronze', icon: Trophy },
  ];

  return (
    <section className="py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gradient-to-br from-warning/20 to-destructive/10 border border-warning/20">
            <Flame className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-foreground">
              {t('engagement.title', 'Stay Engaged')}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t('engagement.subtitle', 'Complete challenges, earn XP, climb the ranks')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Daily Challenges */}
          <Card className="col-span-1 md:col-span-2 p-4 border-border/30 bg-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  {t('engagement.dailyChallenges', 'Daily Challenges')}
                </h3>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                <Clock className="h-3 w-3 mr-1" />
                {t('engagement.resetsIn', 'Resets in 12h')}
              </Badge>
            </div>

            <div className="space-y-3">
              {dailyChallenges.map((challenge, i) => (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                    activeChallenge === i
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/30 hover:border-primary/20 hover:bg-muted/50"
                  )}
                  onClick={() => setActiveChallenge(i)}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br",
                    challenge.color
                  )}>
                    <challenge.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{challenge.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={challenge.progress} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-muted-foreground">{challenge.progress}%</span>
                    </div>
                  </div>
                  <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px] px-1.5">
                    +{challenge.xp} XP
                  </Badge>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Mini Leaderboard */}
          <Card className="p-4 border-border/30 bg-card">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-bold text-foreground">
                {t('engagement.topCreators', 'Top Creators')}
              </h3>
            </div>

            <div className="space-y-3">
              {leaderboard.map((entry, i) => (
                <motion.div
                  key={entry.rank}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                    entry.rank === 1 ? "bg-warning/20 text-warning" :
                    entry.rank === 2 ? "bg-slate-300/20 text-slate-400" :
                    "bg-amber-700/20 text-amber-600"
                  )}>
                    {entry.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{entry.name}</p>
                    <p className="text-[10px] text-muted-foreground">{entry.xp.toLocaleString()} XP</p>
                  </div>
                  <entry.icon className={cn(
                    "h-4 w-4",
                    entry.rank === 1 ? "text-warning" :
                    entry.rank === 2 ? "text-slate-400" :
                    "text-amber-600"
                  )} />
                </motion.div>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 text-xs gap-1 text-primary"
              onClick={() => onNavigate?.('dashboard')}
            >
              {t('engagement.viewAll', 'View full leaderboard')}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Card>
        </div>

        {/* Quick Stats / Streak */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[
            { icon: Flame, label: t('engagement.streak', 'Day Streak'), value: '3 🔥', color: 'text-destructive' },
            { icon: Star, label: t('engagement.totalXP', 'Total XP'), value: '340', color: 'text-warning' },
            { icon: TrendingUp, label: t('engagement.rank', 'Your Rank'), value: '#42', color: 'text-primary' },
            { icon: Gift, label: t('engagement.nextReward', 'Next Reward'), value: '60 XP', color: 'text-accent' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/30"
            >
              <stat.icon className={cn("h-4 w-4", stat.color)} />
              <div>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                <p className="text-sm font-bold text-foreground">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
