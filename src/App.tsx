import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { PageTransition } from "@/components/PageTransition";
import { LocalizationProvider } from "@/contexts/LocalizationContext";
import { useAdaptiveTheme } from "@/hooks/useAdaptiveTheme";
import { useAuthReady } from "@/hooks/useAuthReady";
import { AnimatedLoading } from "@/components/AnimatedLoading";
import { StatusBotMascot } from "@/components/StatusBotMascot";
import { FloatingBackground } from "@/components/FloatingBackground";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import { CreatorDashboard } from "./pages/CreatorDashboard";
import { AdvertiserDashboard } from "./pages/AdvertiserDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";
import { GlobalDashboard } from "./pages/GlobalDashboard";
import { AcademiaStatusAds } from "./components/AcademiaStatusAds";

import "@/lib/i18n";

const queryClient = new QueryClient();

function AppContent() {
  useAdaptiveTheme();
  const auth = useAuthReady();
  const [currentPage, setCurrentPage] = useState("index");
  const [appReady, setAppReady] = useState(false);

  // Splash screen
  useEffect(() => {
    const timer = setTimeout(() => setAppReady(true), 2200);
    return () => clearTimeout(timer);
  }, []);

  // Detect password recovery link on load
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setCurrentPage('reset-password');
    }
  }, []);

  if (!appReady) {
    return <AnimatedLoading />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "index":
        return <Index onNavigate={setCurrentPage} />;
      case "auth":
        return <Auth onNavigate={setCurrentPage} />;
      case "reset-password":
        return <ResetPassword onNavigate={setCurrentPage} />;
      case "creator-dashboard":
        return <CreatorDashboard />;
      case "advertiser-dashboard":
        return <AdvertiserDashboard />;
      case "admin-dashboard":
        return <AdminDashboard />;
      case "global-dashboard":
        return <GlobalDashboard />;
      case "academia":
        return <div className="max-w-2xl mx-auto py-8 px-4"><AcademiaStatusAds /></div>;
      case "creators":
        return <Index onNavigate={setCurrentPage} />;
      default:
        return <Index onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <FloatingBackground />
      <Navigation onNavigate={setCurrentPage} currentPage={currentPage} auth={auth} />
      <main className="pb-20 md:pb-0">
        <PageTransition pageKey={currentPage}>
          {renderPage()}
        </PageTransition>
      </main>
      <BottomNavigation onNavigate={setCurrentPage} currentPage={currentPage} auth={auth} />
      <StatusBotMascot />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocalizationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </LocalizationProvider>
    </QueryClientProvider>
  );
}

export default App;
