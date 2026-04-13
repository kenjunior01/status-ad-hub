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
    <nav className="fixed bottom-0 left-0 right-0 z-[60] md:hidden" style={{ position: 'fixed' }}>
      <div className="absolute inset-0 bg-card backdrop-blur-xl border-t border-border/40" style={{ opacity: 0.98 }} />
      
      <div className="relative flex items-center justify-around h-14 px-2 safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.key);
          const label = item.label || t(item.labelKey!) || item.key;

          return (
            <button
              key={item.key}
              onClick={() => onNavigate(resolveNavPage(item.key))}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 relative transition-all duration-200",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                {active && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -inset-2 rounded-xl bg-primary/10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon 
                  className={cn(
                    "h-5 w-5 relative z-10 transition-all duration-200",
                    active && "text-primary"
                  )} 
                  strokeWidth={active ? 2.5 : 1.5} 
                />
              </div>
              <span className={cn(
                "text-[9px] font-medium leading-tight",
                active ? "text-primary" : "text-muted-foreground"
              )}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
