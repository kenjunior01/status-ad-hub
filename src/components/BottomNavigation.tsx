import { useTranslation } from "react-i18next";
import { Home, LayoutGrid, GraduationCap, CircleUser } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BottomNavigationProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  auth: {
    user: any;
    userRole: string | null;
    isReady: boolean;
    getDashboardPage: () => string;
  };
}

const navItems = [
  { key: "index", icon: Home, labelKey: "navigation.home" },
  { key: "dashboard", icon: LayoutGrid, labelKey: "navigation.dashboard" },
  { key: "academia", icon: GraduationCap, label: "Academia" },
  { key: "profile", icon: CircleUser, labelKey: "navigation.profile" },
];

export const BottomNavigation = ({ onNavigate, currentPage, auth }: BottomNavigationProps) => {
  const { t } = useTranslation();

  const resolveNavPage = (key: string) => {
    if (key === 'dashboard') return auth.user ? auth.getDashboardPage() : 'auth';
    if (key === 'profile') return auth.user ? auth.getDashboardPage() : 'auth';
    if (key === 'academia') return 'academia';
    return key;
  };

  const isActive = (key: string) => {
    if (key === 'index') return currentPage === 'index';
    if (key === 'dashboard') return currentPage.includes('dashboard');
    if (key === 'academia') return currentPage === 'academia';
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Frosted glass background */}
      <div className="absolute inset-0 bg-card/90 backdrop-blur-xl border-t border-border/30" />
      
      <div className="relative flex items-center justify-around h-16 px-2 safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.key);
          const label = item.label || t(item.labelKey!) || item.key;

          return (
            <button
              key={item.key}
              onClick={() => onNavigate(resolveNavPage(item.key))}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-1.5 relative transition-all duration-300",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                {active && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -inset-2.5 rounded-2xl bg-primary/12"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon 
                  className={cn(
                    "h-5 w-5 relative z-10 transition-transform duration-300",
                    active && "text-primary scale-110"
                  )} 
                  strokeWidth={active ? 2.5 : 1.5} 
                />
              </div>
              <span className={cn(
                "text-[10px] font-semibold leading-tight transition-all duration-300",
                active ? "text-primary" : "text-muted-foreground"
              )}>
                {label}
              </span>
              {active && (
                <motion.div
                  layoutId="bottomNavDot"
                  className="absolute -top-0.5 w-5 h-1 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};