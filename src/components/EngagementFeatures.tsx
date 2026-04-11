import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Gift, Users, Link2, Copy, Check, Star, Share2, Trophy, Sparkles
} from 'lucide-react';

interface EngagementFeaturesProps {
  onNavigate?: (page: string) => void;
}

export const EngagementFeatures = ({ onNavigate }: EngagementFeaturesProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralPoints, setReferralPoints] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchReferralData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code, referral_points')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setReferralCode(profile.referral_code);
        setReferralPoints(profile.referral_points || 0);
      }

      const { count } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id);

      setReferralCount(count || 0);
    };

    fetchReferralData();
  }, []);

  const referralLink = referralCode 
    ? `${window.location.origin}?ref=${referralCode}` 
    : '';

  const handleCopy = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: '✅ Link copiado!', description: 'Partilha com os teus amigos.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'StatusAds Connect',
          text: 'Junta-te à StatusAds e ganha pontos! Usa o meu link:',
          url: referralLink,
        });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  const rewards = [
    { points: 100, label: t('engagement.rewardHighlight', 'Perfil em Destaque (1 dia)'), icon: Star },
    { points: 250, label: t('engagement.rewardBadge', 'Badge Especial no perfil'), icon: Trophy },
    { points: 500, label: t('engagement.rewardBoost', 'Boost de visibilidade (7 dias)'), icon: Sparkles },
  ];

  if (!userId) {
    return (
      <section className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Card className="p-6 text-center border-border/30">
            <Gift className="h-10 w-10 text-primary mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground mb-1">
              {t('engagement.inviteTitle', 'Convida e Ganha')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('engagement.inviteDesc', 'Regista-te para ganhar pontos ao convidar amigos. Troca por recompensas exclusivas!')}
            </p>
            <Button onClick={() => onNavigate?.('auth')} className="gap-2">
              <Users className="h-4 w-4" /> {t('engagement.signupToStart', 'Criar conta para começar')}
            </Button>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20">
            <Gift className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-foreground">
              {t('engagement.inviteTitle', 'Convida e Ganha')}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t('engagement.inviteSubtitle', 'Ganha 50 pontos por cada amigo que se registar')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Referral Link Card */}
          <Card className="col-span-1 md:col-span-2 p-4 border-border/30 bg-card">
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                {t('engagement.yourLink', 'O teu link de convite')}
              </h3>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Input
                value={referralLink}
                readOnly
                className="h-10 bg-muted/30 border-border/40 text-xs font-mono"
              />
              <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0 gap-1">
                {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              <Button size="sm" onClick={handleShare} className="shrink-0 gap-1">
                <Share2 className="h-3.5 w-3.5" /> {t('engagement.share', 'Partilhar')}
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t('engagement.invited', 'Convidados'), value: referralCount, icon: Users, color: 'text-primary' },
                { label: t('engagement.points', 'Pontos'), value: referralPoints, icon: Star, color: 'text-warning' },
                { label: t('engagement.code', 'Código'), value: referralCode || '—', icon: Link2, color: 'text-accent' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex flex-col items-center p-3 rounded-xl bg-muted/50 text-center"
                >
                  <stat.icon className={cn("h-4 w-4 mb-1", stat.color)} />
                  <p className="text-sm font-bold text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Rewards Card */}
          <Card className="p-4 border-border/30 bg-card">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-bold text-foreground">
                {t('engagement.rewards', 'Recompensas')}
              </h3>
            </div>

            <div className="space-y-3">
              {rewards.map((reward, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    referralPoints >= reward.points ? "bg-primary/20 text-primary" : "bg-muted-foreground/10 text-muted-foreground"
                  )}>
                    <reward.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{reward.label}</p>
                    <p className="text-[10px] text-muted-foreground">{reward.points} pontos</p>
                  </div>
                  {referralPoints >= reward.points ? (
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                      {t('engagement.available', 'Disponível')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      {reward.points - referralPoints} pts
                    </Badge>
                  )}
                </motion.div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};
