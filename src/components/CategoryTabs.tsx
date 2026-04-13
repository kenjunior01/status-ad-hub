import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { 
  Star, 
  Clock, 
  TrendingUp, 
  Sparkles, 
  Dumbbell, 
  Laptop, 
  Heart,
  Utensils,
  Plane,
  Gamepad2,
  GraduationCap,
  Briefcase,
  Palette,
  LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts?: {
    featured?: number;
    recent?: number;
    trending?: number;
  };
}

export const CategoryTabs = ({ activeTab, onTabChange, counts }: CategoryTabsProps) => {
  const { t } = useTranslation();

  const allTabs = [
    { id: "featured", label: t('categories.featured'), icon: Star },
    { id: "recent", label: t('categories.recent'), icon: Clock },
    { id: "trending", label: t('categories.trending'), icon: TrendingUp },
    { id: "lifestyle", label: t('niches.lifestyle'), icon: Sparkles },
    { id: "fitness", label: t('niches.fitness'), icon: Dumbbell },
    { id: "tech", label: t('niches.tech'), icon: Laptop },
    { id: "beauty", label: t('niches.beauty'), icon: Heart },
    { id: "food", label: t('niches.food'), icon: Utensils },
    { id: "travel", label: t('niches.travel'), icon: Plane },
    { id: "gaming", label: t('niches.entertainment'), icon: Gamepad2 },
    { id: "education", label: t('niches.education'), icon: GraduationCap },
    { id: "business", label: t('niches.business'), icon: Briefcase },
  ];

  return (
    <div className="flex items-center gap-3 md:gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
      {allTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 min-w-[56px] md:min-w-[64px] transition-all duration-200",
              isActive ? "scale-105" : "opacity-70 hover:opacity-100"
            )}
          >
            <div className={cn(
              "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all duration-200",
              isActive 
                ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30" 
                : "bg-card border border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary"
            )}>
              <Icon className="h-5 w-5 md:h-5.5 md:w-5.5" />
            </div>
            <span className={cn(
              "text-[10px] md:text-xs font-medium text-center leading-tight line-clamp-1",
              isActive ? "text-primary" : "text-muted-foreground"
            )}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
