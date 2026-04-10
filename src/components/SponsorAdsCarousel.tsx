import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, ChevronLeft, ChevronRight, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SponsorAd {
  id: string;
  name: string;
  logo: string;
  tagline: string;
  url?: string;
  category: string;
}

// Placeholder sponsors — in production these come from the database
const placeholderSponsors: SponsorAd[] = [
  { id: '1', name: 'TechFlow', logo: '🚀', tagline: 'Grow your audience', category: 'Tech', url: '#' },
  { id: '2', name: 'BrandUp', logo: '📈', tagline: 'Scale your brand', category: 'Marketing', url: '#' },
  { id: '3', name: 'PayEasy', logo: '💳', tagline: 'Fast global payments', category: 'Finance', url: '#' },
  { id: '4', name: 'DesignLab', logo: '🎨', tagline: 'Creative solutions', category: 'Design', url: '#' },
  { id: '5', name: 'CloudNest', logo: '☁️', tagline: 'Hosting made simple', category: 'Tech', url: '#' },
  { id: '6', name: 'AdReach', logo: '📣', tagline: 'Maximize your reach', category: 'Marketing', url: '#' },
];

interface SponsorAdsCarouselProps {
  onAdvertise?: () => void;
}

export const SponsorAdsCarousel = ({ onAdvertise }: SponsorAdsCarouselProps) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 200;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <section className="py-4 px-4 bg-card/50 border-b border-border">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Megaphone className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              {t('sponsors.title', 'Sponsors')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hidden md:flex"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hidden md:flex"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-muted-foreground hover:text-primary px-2"
              onClick={onAdvertise}
            >
              {t('sponsors.advertiseHere', 'Advertise here')}
            </Button>
          </div>
        </div>

        {/* Scrollable cards */}
        <div
          ref={scrollRef}
          className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {placeholderSponsors.map((sponsor) => (
            <a
              key={sponsor.id}
              href={sponsor.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex-shrink-0 snap-start",
                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl",
                "bg-background border border-border/60 hover:border-primary/40",
                "transition-all duration-200 hover:shadow-sm hover:scale-[1.02]",
                "w-[160px] md:w-[180px] group cursor-pointer"
              )}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-base">
                {sponsor.logo}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                  {sponsor.name}
                  <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{sponsor.tagline}</p>
              </div>
            </a>
          ))}

          {/* CTA card */}
          <button
            onClick={onAdvertise}
            className={cn(
              "flex-shrink-0 snap-start",
              "flex items-center gap-2.5 px-3 py-2.5 rounded-xl",
              "border-2 border-dashed border-primary/30 hover:border-primary/60",
              "transition-all duration-200 hover:bg-primary/5",
              "w-[160px] md:w-[180px] cursor-pointer"
            )}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Megaphone className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-semibold text-primary truncate">
                {t('sponsors.yourBrand', 'Your brand')}
              </p>
              <p className="text-[10px] text-muted-foreground">$50/month</p>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
};
