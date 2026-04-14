import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { HeroSearch } from "@/components/HeroSearch";
import { PremiumCreatorCard } from "@/components/PremiumCreatorCard";
import { CategoryTabs } from "@/components/CategoryTabs";
import { AdvancedFiltersSidebar, MobileFiltersSheet, FilterState } from "@/components/AdvancedFiltersSidebar";
import { ValuePropositionSection } from "@/components/ValuePropositionSection";
import { EngagementFeatures } from "@/components/EngagementFeatures";
import { CreatorProfile } from "@/pages/CreatorProfile";
import { useProfiles } from "@/hooks/useProfiles";
import { useFavorites } from "@/hooks/useFavorites";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { useConversations } from "@/hooks/useConversations";
import { 
  ArrowRight,
  ChevronDown,
  Heart,
  Sparkles,
  CircleDot,
  Globe2,
  Shield,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MascotInline } from "@/components/MascotInline";

interface IndexProps {
  onNavigate?: (page: string) => void;
}

const defaultFilters: FilterState = {
  priceRange: [0, 500],
  niches: [],
  minRating: 0,
  minCampaigns: 0,
  minResponseRate: 0,
  onlineOnly: false,
  verifiedOnly: false,
  badgeLevels: []
};

const Index = ({ onNavigate }: IndexProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { formatFromUSD } = useLocalizationContext();
  const { profiles, loading, getFeaturedProfiles, getNewProfiles, getDiscoverProfiles } = useProfiles();
  const { favorites, getFavoriteCount } = useFavorites();
  const { createConversation } = useConversations();
  const [activeCategory, setActiveCategory] = useState("featured");
  const [showAllProfiles, setShowAllProfiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  const handleProfileSelect = (profile: any) => {
    setSelectedProfile(profile);
  };

  const handleMessageCreator = async (profile: any) => {
    try {
      // profile.user_id is the auth user id, profile.id is the profile table id
      const userId = profile.user_id || profile.id;
      await createConversation(userId);
      toast({ title: "Conversa criada!", description: `Conversa com ${profile.display_name} iniciada.` });
      onNavigate?.("messages");
    } catch (err) {
      toast({ title: "Erro", description: "Faça login para enviar mensagens.", variant: "destructive" });
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCategorySelect = (category: string) => {
    setActiveCategory(category.toLowerCase());
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const applyFilters = (profilesList: any[]) => {
    return profilesList.filter(profile => {
      const price = parseInt(profile.price_range?.replace(/\D/g, '') || '50');
      if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false;
      if (filters.minRating > 0 && profile.rating < filters.minRating) return false;
      if (filters.minCampaigns > 0 && profile.total_campaigns < filters.minCampaigns) return false;
      if (filters.verifiedOnly && !profile.is_verified) return false;
      if (filters.badgeLevels.length > 0 && !filters.badgeLevels.includes(profile.badge_level)) return false;
      if (filters.niches.length > 0) {
        const nicheMap: Record<string, string[]> = {
          lifestyle: ["Lifestyle", "Viagem"], fitness: ["Fitness & Saúde", "Fitness"],
          tech: ["Tecnologia", "Tech"], beauty: ["Beleza & Moda", "Beleza"],
          food: ["Culinária", "Gastronomia"], travel: ["Viagem", "Travel"],
          gaming: ["Games", "Gaming"], education: ["Educação", "Education"],
          business: ["Negócios", "Business"], design: ["Arte & Design", "Design"],
        };
        const matchesNiche = filters.niches.some(niche => {
          const niches = nicheMap[niche] || [];
          return profile.niche && niches.some((n: string) => profile.niche?.toLowerCase().includes(n.toLowerCase()));
        });
        if (!matchesNiche) return false;
      }
      return true;
    });
  };

  const getActiveProfiles = () => {
    let baseProfiles: any[];
    switch (activeCategory) {
      case "featured": baseProfiles = getFeaturedProfiles(); break;
      case "recent": baseProfiles = getNewProfiles(); break;
      case "trending": baseProfiles = [...profiles].sort((a, b) => b.total_campaigns - a.total_campaigns).slice(0, 24); break;
      case "favorites": baseProfiles = profiles.filter(p => favorites.some(f => f.id === p.id)); break;
      default:
        const nicheMap: Record<string, string[]> = {
          lifestyle: ["Lifestyle", "Viagem"], fitness: ["Fitness & Saúde", "Fitness"],
          tech: ["Tecnologia", "Tech"], beauty: ["Beleza & Moda", "Beleza"],
          food: ["Culinária", "Gastronomia"], travel: ["Viagem", "Travel"],
          gaming: ["Games", "Gaming"], education: ["Educação", "Education"],
          business: ["Negócios", "Business"], design: ["Arte & Design", "Design"],
        };
        const niches = nicheMap[activeCategory] || [];
        baseProfiles = profiles.filter(p => p.niche && niches.some(n => p.niche?.toLowerCase().includes(n.toLowerCase())));
    }
    return applyFilters(baseProfiles);
  };

  const activeProfiles = getActiveProfiles();
  const displayProfiles = showAllProfiles ? activeProfiles : activeProfiles.slice(0, 12);

  if (selectedProfile) {
    return (
      <CreatorProfile 
        profile={selectedProfile}
        onBack={() => setSelectedProfile(null)}
        onContact={() => onNavigate?.('messages')}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <MascotInline mood="thinking" size="lg" message="A carregar criadores..." className="mx-auto justify-center" bubblePosition="top" />
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary/20 border-t-primary mx-auto" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Hero — clean and bold like bateu.online */}
      <section className="relative py-8 md:py-14 px-4 overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-[10%] w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-[15%] w-56 h-56 bg-primary/5 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.h1 
            className="text-2xl md:text-5xl font-extrabold text-primary-foreground mb-2 md:mb-4 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {t('hero.title').split(' ').slice(0, -2).join(' ')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-foreground to-primary-foreground/70">
              {t('hero.title').split(' ').slice(-2).join(' ')}
            </span>
          </motion.h1>
          
          <motion.div
            className="flex items-center justify-center gap-2 mb-5 md:mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <MascotInline mood="waving" size="sm" animate showBubble={false} />
            <p className="text-xs md:text-base text-primary-foreground/60 max-w-lg">
              {t('hero.subtitle')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <HeroSearch onSearch={handleSearch} onCategorySelect={handleCategorySelect} />
          </motion.div>

          {/* Trust pills — inspired by bateu.online */}
          <motion.div 
            className="mt-5 flex flex-wrap items-center justify-center gap-3 md:gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-1.5 text-primary-foreground/50 text-[11px] md:text-xs">
              <Shield className="h-3 w-3" />
              <span>{t('trust.securePayment')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-primary-foreground/50 text-[11px] md:text-xs">
              <Zap className="h-3 w-3" />
              <span>{t('global.platform')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-primary-foreground/50 text-[11px] md:text-xs">
              <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
              <span>{t('hero.stats.creators').toLowerCase()}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories — horizontal scrollable icons like bateu.online */}

      {/* Categories — horizontal scrollable icons like bateu.online */}
      <section className="py-4 md:py-6 px-4 border-b border-border/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t('index.exploreCreators')}
            </h2>
            <div className="flex items-center gap-2">
              <MobileFiltersSheet
                filters={filters}
                onFiltersChange={setFilters}
                onClearFilters={clearFilters}
              >
                <span />
              </MobileFiltersSheet>
              <Button
                variant={activeCategory === "favorites" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveCategory("favorites")}
                className="gap-1 h-8 text-xs"
              >
                <Heart className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('index.favorites')}</span>
                ({getFavoriteCount()})
              </Button>
            </div>
          </div>
          <CategoryTabs 
            activeTab={activeCategory} 
            onTabChange={(tab) => {
              setActiveCategory(tab);
              setShowAllProfiles(false);
            }}
            counts={{
              featured: getFeaturedProfiles().length,
              recent: getNewProfiles().length,
              trending: profiles.length,
            }}
          />
        </div>
      </section>

      {/* Profile Grid */}
      <section className="py-6 md:py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-8">
            <AdvancedFiltersSidebar
              filters={filters}
              onFiltersChange={setFilters}
              onClearFilters={clearFilters}
            />

            <div className="flex-1">
              {activeProfiles.length > 0 && (
                <p className="text-xs text-muted-foreground mb-4">
                  {activeProfiles.length} {t('index.creatorsAvailable')}
                </p>
              )}

              {displayProfiles.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3">
                    {displayProfiles.map((profile, index) => (
                      <PremiumCreatorCard 
                        key={profile.id} 
                        profile={profile} 
                        onSelect={handleProfileSelect}
                        onMessage={handleMessageCreator}
                        variant={index < 2 && activeCategory === "featured" ? "featured" : "default"}
                        showFavoriteButton
                      />
                    ))}
                  </div>

                  {activeProfiles.length > 12 && !showAllProfiles && (
                    <div className="text-center mt-8">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowAllProfiles(true)}
                        className="gap-2"
                      >
                        <ChevronDown className="h-4 w-4" />
                        {t('index.viewMore')} ({activeProfiles.length - 12})
                      </Button>
                    </div>
                  )}
                </>
              ) : (
              <div className="text-center py-16">
                  <MascotInline 
                    mood={activeCategory === "favorites" ? "love" : "surprised"} 
                    size="lg" 
                    message={activeCategory === "favorites" ? "Adiciona favoritos! 💚" : "Nenhum criador encontrado 🔍"}
                    className="mx-auto justify-center mb-4"
                    bubblePosition="top"
                  />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {activeCategory === "favorites" ? t('favorites.empty') : t('emptyState.noCreators')}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                    {activeCategory === "favorites" ? t('favorites.addSome') : t('emptyState.noCreatorsDescription')}
                  </p>
                  <Button onClick={() => { setActiveCategory("featured"); clearFilters(); }} size="sm" className="gap-2">
                    <ArrowRight className="h-3.5 w-3.5" />
                    {t('emptyState.tryAgain')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Engagement Features */}
      <EngagementFeatures onNavigate={onNavigate} />

      {/* Value Proposition */}
      <ValuePropositionSection onNavigate={onNavigate} />

      {/* Final CTA */}
      <section className="py-12 md:py-16 px-4 bg-gradient-hero text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-5 right-[20%] w-32 h-32 bg-primary-foreground/5 rounded-full blur-2xl" />
          <div className="absolute bottom-5 left-[10%] w-40 h-40 bg-primary-foreground/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <MascotInline mood="excited" size="lg" className="mx-auto justify-center mb-3" showBubble={false} />
          <h2 className="text-2xl md:text-4xl font-bold mb-3">
            {t('valueProposition.creator.title')}
          </h2>
          <p className="text-sm md:text-base text-primary-foreground/60 mb-6 max-w-xl mx-auto">
            {t('valueProposition.creator.description')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button 
              size="lg" 
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2 w-full sm:w-auto"
              onClick={() => onNavigate?.('auth')}
            >
              {t('valueProposition.creator.cta')}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 w-full sm:w-auto"
              onClick={() => onNavigate?.('auth')}
            >
              {t('valueProposition.business.cta')}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <MascotInline mood="cool" size="xs" showBubble={false} animate={false} />
                <span className="text-base font-bold text-foreground">StatusAds</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('global.tagline')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3 text-foreground">{t('footer.about')}</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="hover:text-primary cursor-pointer transition-colors" onClick={() => onNavigate?.('terms')}>{t('footer.terms')}</li>
                <li className="hover:text-primary cursor-pointer transition-colors" onClick={() => onNavigate?.('privacy')}>{t('footer.privacy')}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3 text-foreground">{t('navigation.creators')}</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="hover:text-primary cursor-pointer transition-colors" onClick={() => onNavigate?.('auth')}>{t('auth.register')}</li>
                <li className="hover:text-primary cursor-pointer transition-colors" onClick={() => onNavigate?.('academia')}>{t('footer.help')}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3 text-foreground">{t('navigation.advertisers')}</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="hover:text-primary cursor-pointer transition-colors" onClick={() => onNavigate?.('auth')}>{t('valueProposition.business.cta')}</li>
                <li className="hover:text-primary cursor-pointer transition-colors" onClick={() => onNavigate?.('academia')}>{t('footer.help')}</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-6 pt-6 text-center">
            <p className="text-[11px] text-muted-foreground">
              &copy; {new Date().getFullYear()} StatusAds. {t('global.platform')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
