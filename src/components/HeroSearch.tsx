import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Flame, TrendingUp, Palette, Shirt, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface HeroSearchProps {
  onSearch?: (query: string) => void;
  onCategorySelect?: (category: string) => void;
}

export const HeroSearch = ({ onSearch, onCategorySelect }: HeroSearchProps) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const popularCategories = [
    { label: t('niches.lifestyle'), icon: Flame, value: "lifestyle" },
    { label: t('niches.fitness'), icon: TrendingUp, value: "fitness" },
    { label: t('niches.tech'), icon: Palette, value: "tech" },
    { label: t('niches.beauty'), icon: Shirt, value: "beauty" },
  ];

  const handleSearch = () => {
    onSearch?.(searchQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Main Search Bar */}
      <motion.div 
        className="relative"
        animate={{ scale: isFocused ? 1.02 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <div className={`flex items-center bg-card rounded-2xl shadow-strong overflow-hidden border-2 transition-all duration-300 glass-strong ${isFocused ? 'border-primary/60 glow-primary' : 'border-transparent'}`}>
          <div className="flex-1 relative">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-4 md:h-5 w-4 md:w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('hero.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="border-0 pl-10 md:pl-12 pr-2 py-5 md:py-6 text-base md:text-lg bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
            />
          </div>
          <Button 
            onClick={handleSearch}
            size="lg"
            className="m-1.5 md:m-2 px-4 md:px-8 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <Search className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t('common.search')}</span>
          </Button>
        </div>
      </motion.div>

      {/* Popular Categories */}
      <div className="mt-5 md:mt-6 flex flex-wrap items-center justify-center gap-2 md:gap-3">
        <span className="text-xs md:text-sm text-muted-foreground">{t('categories.trending')}:</span>
        {popularCategories.map((category, i) => (
          <motion.div
            key={category.value}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
          >
            <Badge
              variant="secondary"
              className="px-3 md:px-4 py-1.5 md:py-2 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all duration-200 flex items-center gap-1.5 text-xs hover:scale-105 hover:shadow-md"
              onClick={() => onCategorySelect?.(category.value)}
            >
              <category.icon className="h-3 w-3" />
              {category.label}
            </Badge>
          </motion.div>
        ))}
      </div>

      {/* Stats Pills */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <motion.div 
          className="flex items-center gap-2 bg-success/10 text-success px-3 py-1.5 rounded-full border border-success/20"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ repeat: Infinity, duration: 3 }}
        >
          <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <span className="text-xs font-semibold">{t('hero.stats.creators').toLowerCase()}</span>
        </motion.div>
      </div>
    </div>
  );
};