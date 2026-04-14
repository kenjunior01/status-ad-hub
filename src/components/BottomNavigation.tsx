import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Home, MessageSquare, LayoutGrid, Search, LogIn, Briefcase, Megaphone, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import i18n from "i18next";

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

const languages = [
  { code: "pt-BR", label: "🇧🇷 PT" },
  { code: "en-US", label: "🇺🇸 EN" },
  { code: "es-ES", label: "🇪🇸 ES" },
  { code: "fr-FR", label: "🇫🇷 FR" },
];

export const BottomNavigation = ({ onNavigate, currentPage, auth }: BottomNavigationProps) => {
  const { t } = useTranslation();
  const [showLangPicker, setShowLangPicker] = useState(false);

  const getNavItems = () => {
    if (!auth.user) {
      return [
        { key: "index", icon: Home, label: t("navigation.home") || "Início" },
        { key: "creators", icon: Search, label: t("navigation.creators") || "Criadores" },
        { key: "lang", icon: Globe, label: i18n.language?.split("-")[0]?.toUpperCase() || "PT", isLang: true },
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
    if (key === "creators") return currentPage === "creators";
    if (key === "auth") return currentPage === "auth";
    if (key === "messages") return currentPage === "messages";
    return false;
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Language picker overlay */}
      <AnimatePresence>
        {showLangPicker && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-16 left-0 right-0 z-[61] flex justify-center pb-2"
          >
            <div className="bg-card border border-border/50 rounded-2xl shadow-lg p-2 flex gap-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    i18n.changeLanguage(lang.code);
                    setShowLangPicker(false);
                  }}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-medium transition-colors",
                    i18n.language === lang.code ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        className="fixed bottom-0 left-0 right-0 z-[60] md:hidden bg-card border-t border-border/40 safe-area-bottom"
        style={{ willChange: "transform" }}
      >
        <div className="flex items-center justify-around px-2" style={{ height: "56px" }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.key);
            const isLang = (item as any).isLang;

            return (
              <button
                key={item.key}
                onClick={() => {
                  if (isLang) {
                    setShowLangPicker(!showLangPicker);
                  } else {
                    setShowLangPicker(false);
                    onNavigate(resolveNavPage(item.key));
                  }
                }}
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
    </>
  );
};
