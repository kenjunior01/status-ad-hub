import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { HeroSearch } from "@/components/HeroSearch";
import { PremiumCreatorCard } from "@/components/PremiumCreatorCard";
import { CategoryTabs } from "@/components/CategoryTabs";
import { AdvancedFiltersSidebar, MobileFiltersSheet, FilterState } from "@/components/AdvancedFiltersSidebar";
import { SocialProof } from "@/components/TrustIndicators";
import { FloatingCTA } from "@/components/EnhancedCTA";
import { ValuePropositionSection } from "@/components/ValuePropositionSection";
import { SponsorAdsCarousel } from "@/components/SponsorAdsCarousel";
import { SponsorAdPurchaseModal } from "@/components/SponsorAdPurchaseModal";
import { EngagementFeatures } from "@/components/EngagementFeatures";
import { CreatorProfile } from "@/pages/CreatorProfile";
import { useProfiles } from "@/hooks/useProfiles";
import { useFavorites } from "@/hooks/useFavorites";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { 
  Users, 
  MessageCircle, 
  Banknote, 
  Star, 
  ShieldCheck,
  Award,
  Zap,
  Globe2,
  ArrowRight,
  ChevronDown,
  Heart,
  Sparkles,
  CircleDot
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [showFloatingCTA, setShowFloatingCTA] = useState(false);
  const [activeCategory, setActiveCategory] = useState("featured");
  const [showAllProfiles, setShowAllProfiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [sponsorModalOpen, setSponsorModalOpen] = useState(false);

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return t('greeting.morning', 'Bom dia');
    if (hour >= 12 && hour < 18) return t('greeting.afternoon', 'Boa tarde');
    return t('greeting.evening', 'Boa noite');
  }, [t]);

  // Random inspirational quote
  const inspirationalQuote = useMemo(() => {
    const quotes = [
      t('inspiration.q1', 'O sucesso é a soma de pequenos esforços repetidos dia após dia.'),
      t('inspiration.q2', 'Cada visualização é uma oportunidade de transformar vidas.'),
      t('inspiration.q3', 'Conecte, crie e monetize — o seu potencial é ilimitado.'),
      t('inspiration.q4', 'Grandes resultados começam com o primeiro passo.'),
      t('inspiration.q5', 'A sua criatividade é o seu maior ativo.'),
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }, [t]);

  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingCTA(window.scrollY > 600);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleProfileSelect = (profile: any) => {
    setSelectedProfile(profile);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    toast({
      title: t('common.search'),
      description: `${t('common.loading')}`,
    });
  };

  const handleCategorySelect = (category: string) => {
    setActiveCategory(category.toLowerCase());
    toast({
      title: `${category}`,
      description: t('common.filter'),
    });
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  // Apply filters to profiles
  const applyFilters = (profilesList: any[]) => {
    return profilesList.filter(profile => {
      // Price filter
      const price = parseInt(profile.price_range?.replace(/\D/g, '') || '50');
      if (price < filters.priceRange[0] || price > filters.priceRange[1]) {
        return false;
      }

      // Rating filter
      if (filters.minRating > 0 && profile.rating < filters.minRating) {
        return false;
      }

      // Campaigns filter
      if (filters.minCampaigns > 0 && profile.total_campaigns < filters.minCampaigns) {
        return false;
      }

      // Verified filter
      if (filters.verifiedOnly && !profile.is_verified) {
        return false;
      }

      // Badge level filter
      if (filters.badgeLevels.length > 0 && !filters.badgeLevels.includes(profile.badge_level)) {
        return false;
      }

      // Niche filter
      if (filters.niches.length > 0) {
        const nicheMap: Record<string, string[]> = {
          lifestyle: ["Lifestyle", "Viagem"],
          fitness: ["Fitness & Saúde", "Fitness"],
          tech: ["Tecnologia", "Tech"],
          beauty: ["Beleza & Moda", "Beleza"],
          food: ["Culinária", "Gastronomia"],
          travel: ["Viagem", "Travel"],
          gaming: ["Games", "Gaming"],
          education: ["Educação", "Education"],
          business: ["Negócios", "Business"],
          design: ["Arte & Design", "Design"],
        };
        
        const matchesNiche = filters.niches.some(niche => {
          const niches = nicheMap[niche] || [];
          return profile.niche && niches.some(n => 
            profile.niche?.toLowerCase().includes(n.toLowerCase())
          );
        });
        
        if (!matchesNiche) return false;
      }

      return true;
    });
  };

  // Get profiles based on active category
  const getActiveProfiles = () => {
    let baseProfiles: any[];
    
    switch (activeCategory) {
      case "featured":
        baseProfiles = getFeaturedProfiles();
        break;
      case "recent":
        baseProfiles = getNewProfiles();
        break;
      case "trending":
        baseProfiles = [...profiles].sort((a, b) => b.total_campaigns - a.total_campaigns).slice(0, 24);
        break;
      case "favorites":
        baseProfiles = profiles.filter(p => favorites.some(f => f.id === p.id));
        break;
      default:
        // Filter by niche
        const nicheMap: Record<string, string[]> = {
          lifestyle: ["Lifestyle", "Viagem"],
          fitness: ["Fitness & Saúde", "Fitness"],
          tech: ["Tecnologia", "Tech"],
          beauty: ["Beleza & Moda", "Beleza"],
          food: ["Culinária", "Gastronomia"],
          travel: ["Viagem", "Travel"],
          gaming: ["Games", "Gaming"],
          education: ["Educação", "Education"],
          business: ["Negócios", "Business"],
          design: ["Arte & Design", "Design"],
        };
        const niches = nicheMap[activeCategory] || [];
        baseProfiles = profiles.filter(p => 
          p.niche && niches.some(n => p.niche?.toLowerCase().includes(n.toLowerCase()))
        );
    }

    return applyFilters(baseProfiles);
  };

  const activeProfiles = getActiveProfiles();
  const displayProfiles = showAllProfiles ? activeProfiles : activeProfiles.slice(0, 8);

  // Show Creator Profile if selected
  if (selectedProfile) {
    return (
      <CreatorProfile 
        profile={selectedProfile}
        onBack={() => setSelectedProfile(null)}
        onContact={() => {
          toast({
            title: t('common.loading'),
            description: selectedProfile.display_name,
          });
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto"></div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent wa-bg-pattern pb-20 md:pb-0">
      {/* Hero Section with Search */}
      <section className="relative py-8 md:py-12 px-4 bg-gradient-hero overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-[10%] w-32 md:w-40 h-32 md:h-40 bg-primary-foreground/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-10 right-[15%] w-40 md:w-56 h-40 md:h-56 bg-primary-foreground/6 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
          <div className="absolute top-1/3 left-1/2 w-24 md:w-32 h-24 md:h-32 bg-primary-foreground/5 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />
        </div>
        
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Greeting & Inspirational Quote */}
          <motion.div 
            className="mb-4 md:mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-base md:text-xl font-semibold text-primary-foreground mb-0.5">
              {greeting} 👋
            </p>
            <p className="text-xs md:text-base text-primary-foreground/60 italic max-w-md mx-auto line-clamp-2">
              "{inspirationalQuote}"
            </p>
          </motion.div>

          <motion.div 
            className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm text-primary-foreground px-3 py-1.5 rounded-full mb-3 md:mb-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Globe2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
            <span className="text-[10px] md:text-xs font-medium">{t('global.platform')}</span>
          </motion.div>
          
          <motion.h1 
            className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-primary-foreground mb-2 md:mb-3 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {t('hero.title')}
          </motion.h1>
          
          <motion.p 
            className="text-sm md:text-lg text-primary-foreground/70 mb-6 md:mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {t('hero.subtitle')}
          </motion.p>
          
          {/* Search Component */}
          <HeroSearch onSearch={handleSearch} onCategorySelect={handleCategorySelect} />
        </div>
      </section>

      {/* Sponsor Ads Carousel */}
      <SponsorAdsCarousel onAdvertise={() => setSponsorModalOpen(true)} />
      <SponsorAdPurchaseModal open={sponsorModalOpen} onOpenChange={setSponsorModalOpen} />

      {/* Main Listings Section with Sidebar */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  {t('index.exploreCreators')}
                </h2>
                {activeProfiles.length > 0 && (
                  <p className="text-muted-foreground">
                    {activeProfiles.length} {t('index.creatorsAvailable')}
                  </p>
                )}
              </div>
              
              {/* Mobile Filters */}
              <div className="flex items-center gap-2">
                <MobileFiltersSheet
                  filters={filters}
                  onFiltersChange={setFilters}
                  onClearFilters={clearFilters}
                >
                  <span />
                </MobileFiltersSheet>
                
                {/* Favorites Button */}
                <Button
                  variant={activeCategory === "favorites" ? "default" : "outline"}
                  onClick={() => setActiveCategory("favorites")}
                  className="gap-2"
                >
                  <Heart className="h-4 w-4" />
                  {t('index.favorites')} ({getFavoriteCount()})
                </Button>
              </div>
            </div>

            {/* Category Tabs */}
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

          {/* Content Grid with Sidebar */}
          <div className="flex gap-8">
            {/* Desktop Sidebar */}
            <AdvancedFiltersSidebar
              filters={filters}
              onFiltersChange={setFilters}
              onClearFilters={clearFilters}
            />

            {/* Profile Grid */}
            <div className="flex-1">
              {displayProfiles.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3">
                    {displayProfiles.map((profile, index) => (
                      <PremiumCreatorCard 
                        key={profile.id} 
                        profile={profile} 
                        onSelect={handleProfileSelect}
                        variant={index < 2 && activeCategory === "featured" ? "featured" : "default"}
                        showFavoriteButton
                      />
                    ))}
                  </div>

                  {/* Load More */}
                  {activeProfiles.length > 8 && !showAllProfiles && (
                    <div className="text-center mt-10">
                      <Button 
                        variant="outline" 
                        size="lg"
                        onClick={() => setShowAllProfiles(true)}
                        className="gap-2 px-8"
                      >
                        <ChevronDown className="h-4 w-4" />
                        {t('index.viewMore')} ({activeProfiles.length - 8} {t('index.creators')})
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    {activeCategory === "favorites" ? (
                      <Heart className="h-10 w-10 text-primary" />
                    ) : (
                      <Sparkles className="h-10 w-10 text-primary" />
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {activeCategory === "favorites" 
                      ? t('favorites.empty')
                      : t('emptyState.noCreators')
                    }
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {activeCategory === "favorites"
                      ? t('favorites.addSome')
                      : t('emptyState.noCreatorsDescription')
                    }
                  </p>
                  <Button onClick={() => {
                    setActiveCategory("featured");
                    clearFilters();
                  }} className="gap-2">
                    <ArrowRight className="h-4 w-4" />
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

      {/* Social Proof Section */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <SocialProof />
        </div>
      </section>

      {/* Value Proposition Section - For Businesses & Individuals */}
      <ValuePropositionSection onNavigate={onNavigate} />

      {/* Final CTA Section */}
      <section className="py-16 px-4 bg-gradient-hero text-primary-foreground relative overflow-hidden">
        <div className="absolute top-5 right-[20%] w-32 h-32 bg-primary-foreground/5 rounded-full blur-2xl animate-float" />
        <div className="absolute bottom-5 left-[10%] w-40 h-40 bg-primary-foreground/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm px-3 py-1.5 rounded-full mb-4">
            <Globe2 className="h-3.5 w-3.5" />
            <span className="text-xs">{t('valueProposition.trustedBy')}</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('valueProposition.creator.title')}
          </h2>
          <p className="text-base text-primary-foreground/75 mb-6 max-w-2xl mx-auto">
            {t('valueProposition.creator.description')}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button 
              size="lg" 
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2 px-6"
              onClick={() => onNavigate?.('auth')}
            >
              {t('valueProposition.creator.cta')}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => onNavigate?.('advertiser-dashboard')}
            >
              {t('valueProposition.business.cta')}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <CircleDot className="h-5 w-5 text-primary" />
                <span className="text-lg font-bold">StatusAds</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t('global.tagline')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-background">{t('footer.about')}</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="hover:text-primary transition-colors cursor-pointer" onClick={() => onNavigate?.('about')}>{t('footer.about')}</li>
                <li className="hover:text-primary transition-colors cursor-pointer" onClick={() => onNavigate?.('terms')}>{t('footer.terms')}</li>
                <li className="hover:text-primary transition-colors cursor-pointer" onClick={() => onNavigate?.('privacy')}>{t('footer.privacy')}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-background">{t('navigation.creators')}</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="hover:text-primary transition-colors cursor-pointer" onClick={() => onNavigate?.('auth')}>{t('auth.register')}</li>
                <li className="hover:text-primary transition-colors cursor-pointer" onClick={() => onNavigate?.('academia')}>{t('footer.help')}</li>
                <li className="hover:text-primary transition-colors cursor-pointer" onClick={() => onNavigate?.('auth')}>{t('footer.contact')}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-background">{t('navigation.advertisers')}</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="hover:text-primary transition-colors cursor-pointer" onClick={() => onNavigate?.('auth')}>{t('valueProposition.business.cta')}</li>
                <li className="hover:text-primary transition-colors cursor-pointer" onClick={() => onNavigate?.('academia')}>{t('footer.help')}</li>
                <li className="hover:text-primary transition-colors cursor-pointer" onClick={() => onNavigate?.('auth')}>{t('footer.contact')}</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-muted mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} StatusAds. {t('global.platform')}
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="hover:text-primary cursor-pointer" onClick={() => onNavigate?.('terms')}>{t('footer.terms')}</span>
              <span className="hover:text-primary cursor-pointer" onClick={() => onNavigate?.('privacy')}>{t('footer.privacy')}</span>
              <span className="hover:text-primary cursor-pointer" onClick={() => onNavigate?.('auth')}>{t('footer.contact')}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating CTA */}
      <FloatingCTA 
        show={showFloatingCTA} 
        variant="creator" 
        onClick={() => onNavigate?.('auth')} 
      />
    </div>
  );
};

export default Index;
