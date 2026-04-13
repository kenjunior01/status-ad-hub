import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/FavoriteButton";
import { GamificationBadge } from "@/components/GamificationBadge";
import { useFavorites } from "@/hooks/useFavorites";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { Star, BadgeCheck, Eye, ArrowUpRight, Smartphone, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
  avatar_url?: string | null;
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
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Card 
        className={cn(
          "group relative overflow-hidden cursor-pointer transition-all duration-300",
          "bg-card border-border/30 hover:border-primary/40",
          "hover:shadow-strong",
          variant === "featured" && "ring-1 ring-primary/20 shadow-md",
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
            <Badge className="bg-warning text-warning-foreground text-[9px] px-1 py-0 h-4 shadow-sm">
              <Star className="h-2 w-2 mr-0.5 fill-current" />Top
            </Badge>
          )}
          {isNew && (
            <Badge className="bg-success text-success-foreground text-[9px] px-1 py-0 h-4 shadow-sm">{t('index.new')}</Badge>
          )}
        </div>

        {/* Avatar */}
        <div className="p-1.5 md:p-2 pb-0">
          <div className="relative">
            <div className={cn(
              "w-full aspect-[4/5] rounded-xl overflow-hidden",
              !profile.avatar_url && `bg-gradient-to-br ${getAvatarGradient(profile.display_name)}`
            )}>
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.display_name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                  <span className="text-2xl md:text-3xl font-bold text-white/90 drop-shadow-sm">
                    {profile.display_name.charAt(0).toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    <Smartphone className="h-2.5 w-2.5 text-white/80" />
                    <span className="text-[8px] text-white/80 font-medium">
                      {t('creator.availableForAds', 'Available')}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {profile.is_verified && (
              <div className="absolute -bottom-0.5 -right-0.5 bg-primary text-primary-foreground rounded-full p-0.5 shadow-md ring-2 ring-card">
                <BadgeCheck className="h-3 w-3" />
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-1.5 md:p-2 pt-1.5 space-y-0.5 md:space-y-1">
          <div>
            <h3 className="font-bold text-[11px] md:text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {profile.display_name}
            </h3>
            {profile.niche && (
              <p className="text-[9px] md:text-[10px] text-muted-foreground line-clamp-1">{profile.niche}</p>
            )}
          </div>

          {profile.total_reviews > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-2.5 w-2.5 text-warning fill-warning" />
              <span className="text-[10px] font-bold text-foreground">{profile.rating.toFixed(1)}</span>
              <span className="text-[9px] text-muted-foreground">({profile.total_reviews})</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <Eye className="h-2.5 w-2.5" />
            <span>{profile.total_campaigns} {t('index.campaignsCount')}</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] md:text-[9px] text-muted-foreground">{t('creator.startingAt')}</p>
              <p className="font-extrabold text-[11px] md:text-xs text-foreground">{formatFromUSD(getBasePrice())}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onSelect?.(profile); }}
              className="bg-primary/10 hover:bg-primary/20 text-primary rounded-full p-1.5 transition-colors"
              title="Enviar mensagem"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
