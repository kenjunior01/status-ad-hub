import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Megaphone } from 'lucide-react';
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

  // Infinite auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let animId: number;
    let lastTime = 0;
    const speed = 0.5; // px per frame (~30px/s)

    const step = (time: number) => {
      if (!isPaused && lastTime) {
        const dt = time - lastTime;
        el.scrollLeft += speed * (dt / 16);

        // Reset to start for infinite loop
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

  // Duplicate items for seamless loop
  const items = [...placeholderSponsors, ...placeholderSponsors];

  return (
    <section className="py-3 px-4 bg-card/50 border-b border-border overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Megaphone className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {t('sponsors.title', 'Sponsors')}
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAdvertise?.(); }}
            className="text-[10px] text-primary font-semibold px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/30 transition-all hover:scale-105 cursor-pointer z-10 relative"
          >
            🚀 {t('sponsors.advertiseHere', 'Advertise here')}
          </button>
        </div>

        {/* Auto-scrolling row */}
        <div
          ref={scrollRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setTimeout(() => setIsPaused(false), 3000)}
          className="flex gap-2 overflow-x-auto scrollbar-hide"
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
                "flex items-center gap-2 px-2.5 py-2 rounded-lg",
                "bg-background border border-border/50 hover:border-primary/40",
                "transition-all duration-200 hover:shadow-sm hover:scale-[1.03]",
                "w-[140px] md:w-[160px] group cursor-pointer"
              )}
            >
              <div className="flex-shrink-0 w-7 h-7 rounded-md bg-muted flex items-center justify-center text-sm">
                {sponsor.logo}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-foreground truncate flex items-center gap-1">
                  {sponsor.name}
                  <ExternalLink className="h-2 w-2 opacity-0 group-hover:opacity-50 transition-opacity" />
                </p>
                <p className="text-[9px] text-muted-foreground truncate">{sponsor.tagline}</p>
              </div>
            </motion.a>
          ))}

          {/* CTA card */}
          <motion.button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAdvertise?.(); }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className={cn(
              "flex-shrink-0",
              "flex items-center gap-2 px-2.5 py-2 rounded-lg",
              "border-2 border-dashed border-primary/50 hover:border-primary",
              "transition-all duration-200 hover:bg-primary/10 hover:scale-[1.05]",
              "w-[140px] md:w-[160px] cursor-pointer animate-pulse hover:animate-none"
            )}
          >
            <div className="flex-shrink-0 w-7 h-7 rounded-md bg-primary/20 flex items-center justify-center">
              <Megaphone className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[11px] font-bold text-primary truncate">
                {t('sponsors.yourBrand', 'Your brand')}
              </p>
              <p className="text-[9px] text-muted-foreground">$50/mo</p>
            </div>
          </motion.button>
        </div>
      </div>
    </section>
  );
};
