import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Search, 
  Filter, 
  X,
  Star,
  DollarSign,
  Users,
  TrendingUp,
  Globe
} from "lucide-react";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { countries, regions } from "@/lib/currencies";

interface SearchFiltersProps {
  onFiltersChange?: (filters: FilterState) => void;
  showPriceFilter?: boolean;
  showNicheFilter?: boolean;
  showRatingFilter?: boolean;
  showLocationFilter?: boolean;
  className?: string;
}

interface FilterState {
  search: string;
  niche: string;
  priceRange: number[];
  rating: number;
  region: string;
  country: string;
  verified: boolean;
  badgeLevel: string;
}

export const SearchFilters = ({ 
  onFiltersChange,
  showPriceFilter = true,
  showNicheFilter = true,
  showRatingFilter = true,
  showLocationFilter = true,
  className 
}: SearchFiltersProps) => {
  const { t } = useTranslation();
  const { formatFromUSD } = useLocalizationContext();

  const niches = [
    { value: "beauty", label: t('niches.beauty') },
    { value: "fitness", label: t('niches.fitness') },
    { value: "tech", label: t('niches.tech') },
    { value: "lifestyle", label: t('niches.lifestyle') },
    { value: "food", label: t('niches.food') },
    { value: "travel", label: t('niches.travel') },
    { value: "entertainment", label: t('niches.entertainment') },
    { value: "education", label: t('niches.education') },
    { value: "business", label: t('niches.business') },
    { value: "fashion", label: t('niches.fashion') }
  ];

  const badgeLevels = [
    { value: "bronze", label: t('creator.badges.bronze') },
    { value: "silver", label: t('creator.badges.silver') },
    { value: "gold", label: t('creator.badges.gold') },
    { value: "platinum", label: t('creator.badges.platinum') }
  ];

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    niche: "",
    priceRange: [0, 1000],
    rating: 0,
    region: "",
    country: "",
    verified: false,
    badgeLevel: ""
  });

  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const updateFilter = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);

    // Update active filters for badges
    updateActiveFilters(newFilters);
  };

  const updateActiveFilters = (currentFilters: FilterState) => {
    const active: string[] = [];
    
    if (currentFilters.niche) {
      const niche = niches.find(n => n.value === currentFilters.niche);
      active.push(`${t('filters.niches')}: ${niche?.label || currentFilters.niche}`);
    }
    if (currentFilters.region) {
      const region = regions.find(r => r.code === currentFilters.region);
      active.push(`${t('localization.selectRegion')}: ${region?.name || currentFilters.region}`);
    }
    if (currentFilters.country) {
      const country = countries.find(c => c.code === currentFilters.country);
      active.push(`${t('localization.selectCountry')}: ${country?.flag} ${country?.name || currentFilters.country}`);
    }
    if (currentFilters.rating > 0) active.push(`${currentFilters.rating}+ ⭐`);
    if (currentFilters.verified) active.push(t('filters.verified'));
    if (currentFilters.badgeLevel) {
      const badge = badgeLevels.find(b => b.value === currentFilters.badgeLevel);
      if (badge) active.push(badge.label);
    }
    if (currentFilters.priceRange[0] > 0 || currentFilters.priceRange[1] < 1000) {
      active.push(`${format(currentFilters.priceRange[0])} - ${format(currentFilters.priceRange[1])}`);
    }

    setActiveFilters(active);
  };

  const clearFilter = (filterText: string) => {
    const newFilters = { ...filters };
    
    if (filterText.includes(t('filters.niches'))) newFilters.niche = "";
    if (filterText.includes(t('localization.selectRegion'))) newFilters.region = "";
    if (filterText.includes(t('localization.selectCountry'))) newFilters.country = "";
    if (filterText.includes("⭐")) newFilters.rating = 0;
    if (filterText === t('filters.verified')) newFilters.verified = false;
    if (badgeLevels.some(b => b.label === filterText)) newFilters.badgeLevel = "";
    if (filterText.includes(" - ") && !filterText.includes(":")) newFilters.priceRange = [0, 1000];

    setFilters(newFilters);
    onFiltersChange?.(newFilters);
    updateActiveFilters(newFilters);
  };

  const clearAllFilters = () => {
    const defaultFilters: FilterState = {
      search: "",
      niche: "",
      priceRange: [0, 1000],
      rating: 0,
      region: "",
      country: "",
      verified: false,
      badgeLevel: ""
    };
    
    setFilters(defaultFilters);
    setActiveFilters([]);
    onFiltersChange?.(defaultFilters);
  };

  return (
    <div className={className}>
      {/* Search Bar */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('hero.searchPlaceholder')}
            className="pl-10"
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {t('common.filter')}
              {activeFilters.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilters.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{t('filters.title')}</h4>
                {activeFilters.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    {t('filters.clearAll')}
                  </Button>
                )}
              </div>

              {/* Region Filter */}
              {showLocationFilter && (
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {t('localization.selectRegion')}
                  </label>
                  <Select value={filters.region} onValueChange={(value) => {
                    updateFilter("region", value);
                    updateFilter("country", "");
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t('common.all')}</SelectItem>
                      {regions.map((region) => (
                        <SelectItem key={region.code} value={region.code}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Country Filter */}
              {showLocationFilter && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t('localization.selectCountry')}
                  </label>
                  <Select value={filters.country} onValueChange={(value) => updateFilter("country", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t('common.all')}</SelectItem>
                      {countries
                        .filter(c => !filters.region || c.region === filters.region)
                        .map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.flag} {country.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Niche Filter */}
              {showNicheFilter && (
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('filters.niches')}</label>
                  <Select value={filters.niche} onValueChange={(value) => updateFilter("niche", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('filters.selectNiches')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t('common.all')}</SelectItem>
                      {niches.map((niche) => (
                        <SelectItem key={niche.value} value={niche.value}>
                          {niche.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Price Range Filter */}
              {showPriceFilter && (
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {t('filters.priceRange')}: {format(filters.priceRange[0])} - {format(filters.priceRange[1])}
                  </label>
                  <Slider
                    value={filters.priceRange}
                    onValueChange={(value) => updateFilter("priceRange", value)}
                    max={1000}
                    min={0}
                    step={50}
                    className="mt-2"
                  />
                </div>
              )}

              {/* Rating Filter */}
              {showRatingFilter && (
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    {t('filters.engagement')}
                  </label>
                  <Select 
                    value={filters.rating.toString()} 
                    onValueChange={(value) => updateFilter("rating", parseFloat(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">{t('common.all')}</SelectItem>
                      <SelectItem value="3">3+ ⭐</SelectItem>
                      <SelectItem value="4">4+ ⭐</SelectItem>
                      <SelectItem value="4.5">4.5+ ⭐</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Badge Level */}
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {t('searchFilters.level')}
                </label>
                <Select value={filters.badgeLevel} onValueChange={(value) => updateFilter("badgeLevel", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('common.all')}</SelectItem>
                    {badgeLevels.map((badge) => (
                      <SelectItem key={badge.value} value={badge.value}>
                        {badge.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilters.map((filter, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="flex items-center gap-1 pr-1"
            >
              {filter}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter(filter)}
                className="h-4 w-4 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};