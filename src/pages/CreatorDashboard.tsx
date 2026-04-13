import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { EarningsChart } from "@/components/EarningsChart";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import { NotificationButton } from "@/components/NotificationsPanel";
import { ProofUploadForm } from "@/components/ProofUploadForm";
import { VerificationBadge } from "@/components/VerificationBadge";
import { GamificationProgress } from "@/components/GamificationProgress";
import { GamificationBadge } from "@/components/GamificationBadge";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { SwipeCampaignCards } from "@/components/SwipeCampaignCards";
import { AIPricingAssistant } from "@/components/AIPricingAssistant";
import { AcademiaStatusAds } from "@/components/AcademiaStatusAds";
import { AdListingCard, ApplyToListingDialog } from "@/components/AdListings";
import { useProfile } from "@/hooks/useProfile";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useAdListings } from "@/hooks/useAdListings";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, Star, Target, Upload, Eye, GraduationCap, Megaphone, Settings, Grid3X3, Bookmark, BarChart3,
} from "lucide-react";
import { MascotInline } from "@/components/MascotInline";
import { useMascotContext } from "@/hooks/useMascotContext";

type VerificationStatus = "not_started" | "proof_submitted" | "under_review" | "verified" | "rejected";

export const CreatorDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const mascotTip = useMascotContext("creator-dashboard");
  const [selectedCampaignForProof, setSelectedCampaignForProof] = useState<string | null>(null);
  const [applyingTo, setApplyingTo] = useState<{ id: string; title: string } | null>(null);
  const { profile, loading: profileLoading } = useProfile();
  const { campaigns, loading: campaignsLoading } = useCampaigns();
  const { listings, loading: listingsLoading, refetch: refetchListings } = useAdListings();
  const isMobile = useIsMobile();
  const { formatFromUSD } = useLocalizationContext();

  const activeCampaigns = campaigns.filter((c) => c.status === "active" || c.status === "pending");
  const completedCampaigns = campaigns.filter((c) => c.status === "completed");
  const totalEarnings = completedCampaigns.reduce((sum, c) => sum + Number(c.price), 0);
  const monthlyEarnings = completedCampaigns
    .filter((c) => { const d = c.completed_at ? new Date(c.completed_at) : null; if (!d) return false; const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
    .reduce((sum, c) => sum + Number(c.price), 0);

  if (profileLoading || campaignsLoading) return <DashboardSkeleton />;

  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

  // Instagram-style tab items for mobile
  const mobileNavTabs = [
    { key: "overview", icon: Grid3X3, label: "Geral" },
    { key: "opportunities", icon: Megaphone, label: "Anúncios" },
    { key: "campaigns", icon: Target, label: "Campanhas" },
    { key: "earnings", icon: BarChart3, label: "Ganhos" },
    { key: "profile", icon: Settings, label: "Perfil" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ═══ INSTAGRAM-STYLE PROFILE HEADER (mobile) ═══ */}
      {isMobile ? (
        <div className="bg-card border-b border-border/30">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2">
            <h1 className="text-base font-bold text-foreground truncate max-w-[180px]">
              {profile?.display_name || "Criador"}
            </h1>
            <div className="flex items-center gap-1">
              <NotificationButton />
              <MascotInline mood={mascotTip.mood} size="xs" showBubble={false} animate={false} />
            </div>
          </div>

          {/* Profile row */}
          <div className="flex items-center gap-4 px-4 py-3">
            <div className="relative">
              <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 p-[2px]">
                <Avatar className="w-full h-full border-2 border-card">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                    {profile?.display_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <GamificationBadge badgeLevel={profile?.badge_level || "bronze"} size="sm" className="absolute -bottom-1 -right-1" />
            </div>

            {/* Stats row — Instagram style */}
            <div className="flex-1 flex justify-around text-center">
              <button onClick={() => setActiveTab("campaigns")} className="flex flex-col items-center">
                <span className="text-lg font-bold text-foreground">{campaigns.length}</span>
                <span className="text-[10px] text-muted-foreground">Campanhas</span>
              </button>
              <button onClick={() => setActiveTab("earnings")} className="flex flex-col items-center">
                <span className="text-lg font-bold text-foreground">{formatFromUSD(totalEarnings)}</span>
                <span className="text-[10px] text-muted-foreground">Ganhos</span>
              </button>
              <button onClick={() => setActiveTab("opportunities")} className="flex flex-col items-center">
                <span className="text-lg font-bold text-foreground">{listings.length}</span>
                <span className="text-[10px] text-muted-foreground">Anúncios</span>
              </button>
            </div>
          </div>

          {/* Bio area */}
          <div className="px-4 pb-3">
            <p className="text-xs text-foreground font-medium">{profile?.niche || "Criador de conteúdo"}</p>
            {profile?.bio && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{profile.bio}</p>}
            {/* Mascot tip */}
            <div className="mt-2 flex items-center gap-2 bg-primary/5 rounded-lg px-2 py-1.5">
              <MascotInline mood={mascotTip.mood} size="xs" showBubble={false} animate={false} />
              <p className="text-[10px] text-muted-foreground flex-1">{mascotTip.message}</p>
            </div>
          </div>

          {/* Action buttons — Instagram style */}
          <div className="flex gap-1 px-4 pb-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs font-semibold rounded-lg"
              onClick={() => setActiveTab("profile")}
            >
              Editar perfil
            </Button>
            <Button
              size="sm"
              className="flex-1 h-8 text-xs font-semibold rounded-lg"
              onClick={() => setActiveTab("opportunities")}
            >
              Ver anúncios
            </Button>
          </div>

          {/* Stories-like highlights row */}
          <div className="flex gap-3 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {[
              { label: "Mês", value: formatFromUSD(monthlyEarnings), icon: "💰" },
              { label: "Activas", value: activeCampaigns.length, icon: "🎯" },
              { label: "Rating", value: profile?.rating ? `${Number(profile.rating).toFixed(1)}⭐` : "—", icon: "⭐" },
              { label: "Level", value: profile?.badge_level || "bronze", icon: "🏅" },
            ].map((h, i) => (
              <div key={i} className="flex flex-col items-center gap-1 shrink-0">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-border/30 flex items-center justify-center text-lg">
                  {h.icon}
                </div>
                <span className="text-[10px] font-semibold text-foreground">{String(h.value)}</span>
                <span className="text-[9px] text-muted-foreground">{h.label}</span>
              </div>
            ))}
          </div>

          {/* Tab navigation — Instagram style icons */}
          <div className="flex border-t border-border/30">
            {mobileNavTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 relative transition-colors ${active ? "text-foreground" : "text-muted-foreground"}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 1.5} />
                  <span className="text-[9px]">{tab.label}</span>
                  {active && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-foreground rounded-full" />}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* ═══ DESKTOP HEADER ═══ */
        <div className="p-6">
          <div className="max-w-6xl mx-auto">
            <motion.div {...fadeUp} className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {t("common.hello")}, {profile?.display_name || t("navigation.creators")} 👋
                </h1>
                <GamificationBadge badgeLevel={profile?.badge_level || "bronze"} size="md" />
                <MascotInline mood={mascotTip.mood} size="sm" message={mascotTip.message} bubblePosition="right" />
              </div>
              <div className="flex gap-2"><NotificationButton /></div>
            </motion.div>
          </div>
        </div>
      )}

      {/* ═══ CONTENT AREA ═══ */}
      <div className={`${isMobile ? 'px-3 py-3' : 'px-6'} max-w-6xl mx-auto space-y-4`}>
        {/* Onboarding - only on overview */}
        {activeTab === "overview" && (
          <OnboardingFlow
            profile={profile} role="creator" campaignCount={campaigns.length}
            onAction={(action) => {
              if (action === "name" || action === "niche" || action === "avatar") setActiveTab("profile");
              if (action === "first_campaign") setActiveTab("opportunities");
            }}
            onDismiss={() => {}}
          />
        )}

        {/* Desktop metrics & tabs */}
        {!isMobile && (
          <>
            <motion.div {...fadeUp} className="grid grid-cols-4 gap-3">
              {[
                { title: t("dashboard.totalEarnings"), value: formatFromUSD(totalEarnings), icon: DollarSign, variant: "success" as const },
                { title: t("dashboard.thisMonth"), value: formatFromUSD(monthlyEarnings), icon: TrendingUp, variant: "primary" as const },
                { title: t("dashboard.activeCampaigns"), value: activeCampaigns.length, icon: Target, variant: "warning" as const },
                { title: "Oportunidades", value: listings.length, icon: Megaphone, variant: "default" as const },
              ].map((m, i) => (
                <div key={i}>
                  <Card className="glass">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <m.icon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="text-2xl font-bold">{m.value}</div>
                          <div className="text-xs text-muted-foreground">{m.title}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </motion.div>

            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border/30">
              {mobileNavTabs.concat([{ key: "academia", icon: GraduationCap, label: "Academia" }]).map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ═══ TAB CONTENT ═══ */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {isMobile ? (
              /* Mobile overview: clean cards */
              <div className="space-y-3">
                <GamificationProgress />
                <AIPricingAssistant mode="creator" />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-5">
                <GamificationProgress />
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Star className="h-5 w-5" />Performance</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{t("dashboard.completionRate")}</span>
                      <span className="font-semibold text-success">{completedCampaigns.length > 0 ? Math.round((completedCampaigns.length / campaigns.length) * 100) : 0}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{t("dashboard.completedCampaigns")}</span>
                      <span className="font-semibold">{completedCampaigns.length}</span>
                    </div>
                  </CardContent>
                </Card>
                <AIPricingAssistant mode="creator" />
              </div>
            )}
          </div>
        )}

        {activeTab === "opportunities" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" /> Anúncios
              </h2>
              <Badge variant="secondary" className="text-xs">{listings.length}</Badge>
            </div>
            {listings.length === 0 ? (
              <div className="py-12 text-center">
                <MascotInline mood="thinking" size="md" message="Novos anúncios aparecem aqui!" bubblePosition="top" />
                <p className="text-sm text-muted-foreground mt-4">Nenhum anúncio disponível</p>
              </div>
            ) : (
              <div className="space-y-2">
                {listings.map((listing) => (
                  <AdListingCard key={listing.id} listing={listing} isCreator onApply={(id) => setApplyingTo({ id, title: listing.title })} />
                ))}
              </div>
            )}
          </div>
        )}

        {applyingTo && (
          <ApplyToListingDialog listingId={applyingTo.id} listingTitle={applyingTo.title} onClose={() => setApplyingTo(null)} onApplied={refetchListings} />
        )}

        {activeTab === "campaigns" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-semibold">{t("dashboard.campaigns")}</h2>
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setActiveTab("opportunities")}>
                <Eye className="h-3 w-3 mr-1" />Explorar
              </Button>
            </div>

            {selectedCampaignForProof && (
              <Card className="p-3">
                <ProofUploadForm campaignId={selectedCampaignForProof} onSuccess={() => setSelectedCampaignForProof(null)} />
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setSelectedCampaignForProof(null)}>{t("common.cancel")}</Button>
              </Card>
            )}

            {campaigns.length === 0 ? (
              <div className="py-12 text-center">
                <MascotInline mood="waving" size="md" message="Candidate-se a anúncios!" bubblePosition="top" />
                <p className="text-sm text-muted-foreground mt-4">{t("dashboard.noCampaigns")}</p>
              </div>
            ) : isMobile ? (
              <div className="space-y-2">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <h3 className="font-semibold text-sm truncate">{campaign.title}</h3>
                          <VerificationBadge status={(campaign.verification_status as VerificationStatus) || "not_started"} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-success">{formatFromUSD(Number(campaign.price))}</span>
                          <Badge variant={campaign.status === "active" ? "default" : campaign.status === "completed" ? "secondary" : "outline"} className="text-[10px] h-5">
                            {campaign.status}
                          </Badge>
                        </div>
                      </div>
                      {campaign.status === "active" && campaign.verification_status !== "verified" && (
                        <Button size="sm" className="h-8 text-xs shrink-0" onClick={() => setSelectedCampaignForProof(campaign.id)}>
                          <Upload className="h-3 w-3 mr-1" />Prova
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-3">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{campaign.title}</h3>
                          <VerificationBadge status={(campaign.verification_status as VerificationStatus) || "not_started"} />
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{campaign.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-medium text-success">{formatFromUSD(Number(campaign.price))}</span>
                          <Badge variant={campaign.status === "active" ? "default" : campaign.status === "completed" ? "secondary" : "outline"}>{campaign.status}</Badge>
                        </div>
                      </div>
                      {campaign.status === "active" && campaign.verification_status !== "verified" && (
                        <Button size="sm" onClick={() => setSelectedCampaignForProof(campaign.id)}><Upload className="h-4 w-4 mr-2" />{t("dashboard.uploadProof")}</Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "earnings" && <EarningsChart />}
        {activeTab === "academia" && <AcademiaStatusAds />}
        {activeTab === "profile" && <ProfileEditForm />}
      </div>
    </div>
  );
};
