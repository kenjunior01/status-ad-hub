import { useTranslation } from 'react-i18next';
import { Megaphone, Sparkles, TrendingUp, Eye, Users, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface SponsorAdsCarouselProps {
  onAdvertise?: () => void;
}

export const SponsorAdsCarousel = ({ onAdvertise }: SponsorAdsCarouselProps) => {
  const { t } = useTranslation();

  const benefits = [
    { icon: Eye, label: t('sponsors.benefit1', '10K+ daily views'), color: 'text-primary' },
    { icon: Users, label: t('sponsors.benefit2', 'Global audience'), color: 'text-accent' },
    { icon: TrendingUp, label: t('sponsors.benefit3', 'Real-time analytics'), color: 'text-success' },
  ];

  return (
    <section className="py-4 px-4 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-y border-border/30">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
          {/* Left: CTA message */}
          <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {t('sponsors.ctaTitle', 'Want your brand seen by thousands?')}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('sponsors.ctaDesc', 'Promote your business directly to our creator network and their audiences.')}
              </p>
            </div>
          </div>

          {/* Center: Benefits */}
          <div className="hidden md:flex items-center gap-4">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <b.icon className={cn("h-3.5 w-3.5", b.color)} />
                <span className="text-[11px] text-muted-foreground font-medium">{b.label}</span>
              </div>
            ))}
          </div>

          {/* Right: CTA Button */}
          <Button
            onClick={() => onAdvertise?.()}
            className="gap-2 rounded-full px-6 h-10 font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <Sparkles className="h-4 w-4" />
            {t('sponsors.advertiseHere', 'Advertise Here')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Mobile benefits */}
        <div className="flex md:hidden items-center justify-center gap-4 mt-3">
          {benefits.map((b, i) => (
            <div key={i} className="flex items-center gap-1">
              <b.icon className={cn("h-3 w-3", b.color)} />
              <span className="text-[10px] text-muted-foreground">{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
