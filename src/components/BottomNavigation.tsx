import { useTranslation } from "react-i18next";
import { Home, MessageSquare, LayoutGrid, Search, LogIn, Briefcase, Megaphone } from "lucide-react";
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

export const BottomNavigation = ({ onNavigate, currentPage, auth }: BottomNavigationProps) => {
  const { t } = useTranslation();

  const getNavItems = () => {
    if (!auth.user) {
      return [
        { key: "index", icon: Home, label: t("navigation.home") || "Início" },
        { key: "creators", icon: Search, label: t("navigation.creators") || "Criadores" },
        { key: "academia", icon: Briefcase, label: "Academia" },
        { key: "auth", icon: LogIn, label: t("navigation.login") || "Entrar" },
      ];
    }

    if (auth.userRole === "creator") {
      return [
        { key: "index", icon: Home, label: t("navigation.home") || "Início" },
        { key: "creators", icon: Search, label: t("navigation.opportunities") || "Explorar" },
        { key: "messages", icon: MessageSquare, label: t("navigation.messages") || "Mensagens" },
        { key: "dashboard", icon: LayoutGrid, label: t("navigation.dashboard") || "Painel" },
      ];
    }

    if (auth.userRole === "advertiser") {
      return [
        { key: "index", icon: Home, label: t("navigation.home") || "Início" },
        { key: "creators", icon: Megaphone, label: t("navigation.ads") || "Anúncios" },
        { key: "messages", icon: MessageSquare, label: t("navigation.messages") || "Mensagens" },
        { key: "dashboard", icon: LayoutGrid, label: t("navigation.dashboard") || "Painel" },
      ];
    }

    // admin or other
    return [
      { key: "index", icon: Home, label: t("navigation.home") || "Início" },
      { key: "creators", icon: Search, label: "Explorar" },
      { key: "messages", icon: MessageSquare, label: "Mensagens" },
      { key: "dashboard", icon: LayoutGrid, label: "Painel" },
    ];
  };

  const resolveNavPage = (key: string) => {
    if (key === "dashboard") return auth.user ? auth.getDashboardPage() : "auth";
    if (key === "messages") return auth.user ? "messages" : "auth";
    if (key === "academia") return "academia";
    if (key === "auth") return "auth";
    return key;
  };
  const isActive = (key: string) => {
    if (key === "index") return currentPage === "index";
    if (key === "dashboard") return currentPage.includes("dashboard");
    if (key === "academia") return currentPage === "academia";
    if (key === "creators") return currentPage === "creators";
    if (key === "auth") return currentPage === "auth";
    if (key === "messages") return currentPage === "messages";
    return false;
  };

  const navItems = getNavItems();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[60] md:hidden bg-card border-t border-border/40 safe-area-bottom"
      style={{ willChange: "transform" }}
    >
      <div className="flex items-center justify-around px-2" style={{ height: "56px" }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.key);

          return (
            <button
              key={item.key}
              onClick={() => onNavigate(resolveNavPage(item.key))}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 relative transition-colors duration-200",
                active ? "text-primary" : "text-muted-foreground"
              )}
              style={{ minHeight: "44px" }}
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
                  className={cn("h-5 w-5 relative z-10", active && "text-primary")}
                  strokeWidth={active ? 2.5 : 1.5}
                />
              </div>
              <span className={cn(
                "text-[9px] font-medium leading-tight",
                active ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
