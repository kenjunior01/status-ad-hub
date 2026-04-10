import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/FavoriteButton";
import { GamificationBadge } from "@/components/GamificationBadge";
import { useFavorites } from "@/hooks/useFavorites";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { Star, BadgeCheck, Eye, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  display_name: string;
  niche: string | null;
  price_range: string | null;
  rating: number;
  total_reviews: number;
  total_campaigns: number;
  is_verified: boolean;
  badge_level: string;
  created_at: string;
}

interface PremiumCreatorCardProps {
  profile: Profile;
  className?: string;
  onSelect?: (profile: Profile) => void;
  variant?: "default" | "featured" | "compact";
  showFavoriteButton?: boolean;
}

const getAvatarGradient = (name: string) => {
  const gradients = [
    "from-emerald-500 to-teal-600",
    "from-teal-500 to-cyan-600",
    "from-green-500 to-emerald-600",
    "from-cyan-500 to-teal-600",
    "from-emerald-600 to-green-500",
    "from-teal-600 to-emerald-500",
  ];
  return gradients[name.charCodeAt(0) % gradients.length];
};

export const PremiumCreatorCard = ({ 
  profile, 
  className, 
  onSelect,
  variant = "default",
  showFavoriteButton = false
}: PremiumCreatorCardProps) => {
  const { t } = useTranslation();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { formatFromUSD } = useLocalizationContext();
  const isNew = Date.now() - new Date(profile.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
  const isTopRated = profile.rating >= 4.5 && profile.total_reviews >= 3;

  const getBasePrice = () => {
    if (!profile.price_range) return 50;
    const match = profile.price_range.match(/\d+/);
    return match ? parseInt(match[0]) : 50;
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(profile);
  };

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-200",
        "glass border-border/30 hover:border-primary/40",
        "hover:shadow-medium hover:-translate-y-0.5",
        variant === "featured" && "ring-1 ring-primary/20",
        className
      )}
      onClick={() => onSelect?.(profile)}
    >
      {showFavoriteButton && (
        <div className="absolute top-1.5 left-1.5 z-20">
          <FavoriteButton isFavorite={isFavorite(profile.id)} onClick={handleFavoriteClick} size="sm" variant="overlay" />
        </div>
      )}

      <div className="absolute top-1.5 right-1.5 z-10 flex gap-0.5">
        {isTopRated && (
          <Badge className="bg-warning text-warning-foreground text-[9px] px-1 py-0 h-4">
            <Star className="h-2 w-2 mr-0.5 fill-current" />Top
          </Badge>
        )}
        {isNew && (
          <Badge className="bg-success text-success-foreground text-[9px] px-1 py-0 h-4">{t('index.new')}</Badge>
        )}
      </div>

      <div className="p-2 pb-0">
        <div className="relative">
          <div className={cn("w-full aspect-square rounded-lg overflow-hidden bg-gradient-to-br", getAvatarGradient(profile.display_name))}>
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white/90">
                {profile.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          {profile.is_verified && (
            <div className="absolute -bottom-0.5 -right-0.5 bg-primary text-primary-foreground rounded-full p-0.5 shadow-sm">
              <BadgeCheck className="h-3 w-3" />
            </div>
          )}
        </div>
      </div>

      <div className="p-2 pt-1.5 space-y-1">
        <div>
          <h3 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {profile.display_name}
          </h3>
          {profile.niche && (
            <p className="text-[10px] text-muted-foreground line-clamp-1">{profile.niche}</p>
          )}
        </div>

        {profile.total_reviews > 0 && (
          <div className="flex items-center gap-1">
            <Star className="h-2.5 w-2.5 text-warning fill-warning" />
            <span className="text-[10px] font-semibold text-foreground">{profile.rating.toFixed(1)}</span>
            <span className="text-[9px] text-muted-foreground">({profile.total_reviews})</span>
          </div>
        )}

        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <Eye className="h-2 w-2" />
          <span>{profile.total_campaigns} {t('index.campaignsCount')}</span>
        </div>

        <div className="border-t border-border/30 pt-1" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] text-muted-foreground">{t('creator.startingAt')}</p>
            <p className="font-bold text-xs text-foreground">{formatFromUSD(getBasePrice())}</p>
          </div>
          <GamificationBadge badgeLevel={profile.badge_level || 'bronze'} size="xs" />
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-all duration-150 transform translate-y-0.5 group-hover:translate-y-0">
          <div className="bg-primary text-primary-foreground text-[10px] font-medium text-center py-1 rounded-md flex items-center justify-center gap-0.5">
            <ArrowUpRight className="h-2.5 w-2.5" />
            {t('index.viewProfile')}
          </div>
        </div>
      </div>
    </Card>
  );
};
