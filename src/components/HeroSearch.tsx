import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { motion } from "framer-motion";

interface HeroSearchProps {
  onSearch?: (query: string) => void;
  onCategorySelect?: (category: string) => void;
}

export const HeroSearch = ({ onSearch, onCategorySelect }: HeroSearchProps) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = () => {
    onSearch?.(searchQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div 
        className="relative"
        animate={{ scale: isFocused ? 1.01 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <div className={`flex items-center bg-card/80 backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden border transition-all duration-300 ${isFocused ? 'border-primary/50 shadow-lg' : 'border-border/30 shadow-md'}`}>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('hero.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="border-0 pl-10 pr-2 py-4 md:py-5 text-sm md:text-base bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
            />
          </div>
          <Button 
            onClick={handleSearch}
            className="m-1.5 px-4 md:px-6 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg md:rounded-xl"
          >
            <span className="text-sm font-medium">{t('common.search')}</span>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
