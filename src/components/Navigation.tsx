import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, Menu, LogIn, UserPlus, LogOut, CircleDot, GraduationCap
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";

interface NavigationProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  auth: {
    user: any;
    userRole: string | null;
    isReady: boolean;
    getDashboardPage: () => string;
    logout: () => Promise<void>;
  };
}

export const Navigation = ({ onNavigate, currentPage, auth }: NavigationProps) => {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigation = (page: string) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    await auth.logout();
    onNavigate('index');
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="flex h-12 items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNavigation("index")}>
            <CircleDot className="h-5 w-5" />
            <span className="font-bold text-base tracking-tight">StatusAds</span>
          </div>

          <div className="hidden md:flex items-center gap-1">
            <LanguageSelector />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNavigation('academia')}
              className="gap-1.5 text-primary-foreground hover:bg-primary-foreground/10"
            >
              <GraduationCap className="h-4 w-4" />
              Academia
            </Button>
            {auth.isReady && auth.user ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => handleNavigation(auth.getDashboardPage())} className="gap-1.5 text-primary-foreground hover:bg-primary-foreground/10">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground">
                  <LogOut className="h-4 w-4" />
                  {t('navigation.logout') || 'Sair'}
                </Button>
              </>
            ) : auth.isReady ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => handleNavigation('auth')} className="gap-1.5 text-primary-foreground hover:bg-primary-foreground/10">
                  <LogIn className="h-4 w-4" />
                  {t('navigation.login')}
                </Button>
                <Button size="sm" className="bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground gap-1.5 border-0" onClick={() => handleNavigation('auth')}>
                  <UserPlus className="h-4 w-4" />
                  {t('navigation.register')}
                </Button>
              </>
            ) : null}
          </div>

          <div className="flex md:hidden items-center gap-1">
            <ThemeToggle />
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="px-2 text-primary-foreground hover:bg-primary-foreground/10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[240px]">
                <div className="flex flex-col space-y-2 mt-8">
                  <Button variant="outline" className="w-full justify-start" onClick={() => handleNavigation('academia')}>
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Academia
                  </Button>
                  <div className="pb-4 border-b space-y-2">
                    {auth.isReady && auth.user ? (
                      <>
                        <Button variant="default" className="w-full justify-start" onClick={() => handleNavigation(auth.getDashboardPage())}>
                          <LayoutDashboard className="h-4 w-4 mr-2" />
                          Dashboard
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
                          <LogOut className="h-4 w-4 mr-2" />
                          {t('navigation.logout') || 'Sair'}
                        </Button>
                      </>
                    ) : auth.isReady ? (
                      <>
                        <Button variant="outline" className="w-full justify-start" onClick={() => handleNavigation('auth')}>
                          <LogIn className="h-4 w-4 mr-2" />
                          {t('navigation.login')}
                        </Button>
                        <Button className="w-full justify-start" onClick={() => handleNavigation('auth')}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          {t('navigation.register')}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};
