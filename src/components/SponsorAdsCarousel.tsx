import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Megaphone, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SponsorAd {
  id: string;
  name: string;
  logo: string;
  tagline: string;
  url?: string;
  category: string;
}

const placeholderSponsors: SponsorAd[] = [
  { id: '1', name: 'TechFlow', logo: '🚀', tagline: 'Grow your audience', category: 'Tech', url: '#' },
  { id: '2', name: 'BrandUp', logo: '📈', tagline: 'Scale your brand', category: 'Marketing', url: '#' },
  { id: '3', name: 'PayEasy', logo: '💳', tagline: 'Fast global payments', category: 'Finance', url: '#' },
  { id: '4', name: 'DesignLab', logo: '🎨', tagline: 'Creative solutions', category: 'Design', url: '#' },
  { id: '5', name: 'CloudNest', logo: '☁️', tagline: 'Hosting made simple', category: 'Tech', url: '#' },
  { id: '6', name: 'AdReach', logo: '📣', tagline: 'Maximize your reach', category: 'Marketing', url: '#' },
  { id: '7', name: 'AppLaunch', logo: '📱', tagline: 'Launch faster', category: 'Tech', url: '#' },
  { id: '8', name: 'DataPulse', logo: '📊', tagline: 'Insights that matter', category: 'Analytics', url: '#' },
];

interface SponsorAdsCarouselProps {
  onAdvertise?: () => void;
}

export const SponsorAdsCarousel = ({ onAdvertise }: SponsorAdsCarouselProps) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let animId: number;
    let lastTime = 0;
    const speed = 0.5;

    const step = (time: number) => {
      if (!isPaused && lastTime) {
        const dt = time - lastTime;
        el.scrollLeft += speed * (dt / 16);
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 0;
        }
      }
      lastTime = time;
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isPaused]);

  const items = [...placeholderSponsors, ...placeholderSponsors];

  const handleAdvertiseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAdvertise?.();
  };

  return (
    <section className="py-3 px-4 bg-card/60 backdrop-blur-sm border-b border-border/50 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Megaphone className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              {t('sponsors.title', 'Sponsors')}
            </span>
          </div>
          <button
            type="button"
            onClick={handleAdvertiseClick}
            className={cn(
              "flex items-center gap-1.5 text-[11px] font-bold px-4 py-2 rounded-full",
              "bg-gradient-to-r from-primary to-accent text-primary-foreground",
              "hover:shadow-lg hover:shadow-primary/25 hover:scale-105",
              "transition-all duration-300 cursor-pointer z-10 relative",
              "animate-pulse hover:animate-none"
            )}
          >
            <Sparkles className="h-3 w-3" />
            {t('sponsors.advertiseHere', 'Advertise here')}
          </button>
        </div>

        {/* Auto-scrolling row */}
        <div
          ref={scrollRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setTimeout(() => setIsPaused(false), 3000)}
          className="flex gap-2.5 overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((sponsor, i) => (
            <motion.a
              key={`${sponsor.id}-${i}`}
              href={sponsor.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (i % placeholderSponsors.length) * 0.05, duration: 0.3 }}
              className={cn(
                "flex-shrink-0",
                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl",
                "bg-background/80 border border-border/50 hover:border-primary/40",
                "transition-all duration-200 hover:shadow-md hover:scale-[1.03]",
                "w-[150px] md:w-[170px] group cursor-pointer"
              )}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center text-base shadow-inner">
                {sponsor.logo}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                  {sponsor.name}
                  <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{sponsor.tagline}</p>
              </div>
            </motion.a>
          ))}

          {/* CTA card */}
          <motion.button
            type="button"
            onClick={handleAdvertiseClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className={cn(
              "flex-shrink-0",
              "flex items-center gap-2.5 px-3 py-2.5 rounded-xl",
              "border-2 border-dashed border-primary/60 hover:border-primary",
              "bg-primary/5 hover:bg-primary/10",
              "transition-all duration-300 hover:scale-[1.05] hover:shadow-lg hover:shadow-primary/10",
              "w-[150px] md:w-[170px] cursor-pointer"
            )}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center shadow-inner">
              <Megaphone className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-bold text-primary truncate">
                {t('sponsors.yourBrand', 'Your brand')}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium">$50/mo</p>
            </div>
          </motion.button>
        </div>
      </div>
    </section>
  );
};