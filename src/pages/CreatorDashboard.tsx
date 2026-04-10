import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricsCard } from "@/components/MetricsCard";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { EarningsChart } from "@/components/EarningsChart";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import { NotificationButton } from "@/components/NotificationsPanel";
import { ProofUploadForm } from "@/components/ProofUploadForm";
import { VerificationBadge } from "@/components/VerificationBadge";
import { GamificationProgress } from "@/components/GamificationProgress";
import { GamificationBadge } from "@/components/GamificationBadge";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { GuidedTour } from "@/components/GuidedTour";
import { SwipeCampaignCards } from "@/components/SwipeCampaignCards";
import { AIPricingAssistant } from "@/components/AIPricingAssistant";
import { AcademiaStatusAds } from "@/components/AcademiaStatusAds";
import { useProfile } from "@/hooks/useProfile";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, Star, Target, Award, Upload, ChevronRight, Eye, GraduationCap,
} from "lucide-react";

type VerificationStatus = "not_started" | "proof_submitted" | "under_review" | "verified" | "rejected";

export const CreatorDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCampaignForProof, setSelectedCampaignForProof] = useState<string | null>(null);
  const { profile, loading: profileLoading } = useProfile();
  const { campaigns, loading: campaignsLoading } = useCampaigns();
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <motion.div {...fadeUp} className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {t("common.hello")}, {profile?.display_name || t("navigation.creators")} 👋
                </h1>
                <GamificationBadge badgeLevel={profile?.badge_level || "bronze"} size="md" />
              </div>
            </div>
          </div>
          <div className="flex gap-2"><NotificationButton /></div>
        </motion.div>

        <GuidedTour role="creator" onNavigate={setActiveTab} onComplete={() => {}} />

        <OnboardingFlow
          profile={profile} role="creator" campaignCount={campaigns.length}
          onAction={(action) => {
            if (action === "name" || action === "niche" || action === "avatar") setActiveTab("profile");
            if (action === "first_campaign") setActiveTab("campaigns");
          }}
          onDismiss={() => {}}
        />

        <motion.div {...fadeUp} className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 scrollbar-hide">
          {[
            { title: t("dashboard.totalEarnings"), value: formatFromUSD(totalEarnings), icon: DollarSign, variant: "success" as const },
            { title: t("dashboard.thisMonth"), value: formatFromUSD(monthlyEarnings), icon: TrendingUp, variant: "primary" as const },
            { title: t("dashboard.activeCampaigns"), value: activeCampaigns.length, icon: Target, variant: "warning" as const },
            { title: t("dashboard.rating"), value: profile?.rating || 0, icon: Star, variant: "default" as const, subtitle: `${profile?.total_reviews || 0} reviews` },
          ].map((m, i) => (
            <div key={i} className="min-w-[160px] md:min-w-0">
              <MetricsCard {...m} />
            </div>
          ))}
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-5">
              <TabsTrigger value="overview">📊 {t("dashboard.overview")}</TabsTrigger>
              <TabsTrigger value="campaigns">📋 {t("dashboard.campaigns")}</TabsTrigger>
              <TabsTrigger value="earnings">💰 {t("dashboard.earnings")}</TabsTrigger>
              <TabsTrigger value="academia"><GraduationCap className="h-4 w-4 mr-1" />Academia</TabsTrigger>
              <TabsTrigger value="profile">👤 {t("dashboard.profile")}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-5">
            <motion.div {...fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: t("dashboard.campaigns"), icon: "📋", tab: "campaigns", color: "bg-primary/10 text-primary" },
                { label: t("dashboard.earnings"), icon: "📈", tab: "earnings", color: "bg-success/10 text-success" },
                { label: "Academia", icon: "🎓", tab: "academia", color: "bg-warning/10 text-warning" },
                { label: t("dashboard.profile"), icon: "⚙️", tab: "profile", color: "bg-accent/10 text-accent" },
              ].map((action) => (
                <button key={action.tab} onClick={() => setActiveTab(action.tab)} className={`${action.color} rounded-xl p-4 flex items-center gap-3 hover:scale-[1.02] transition-transform text-left`}>
                  <span className="text-2xl">{action.icon}</span>
                  <div><p className="font-semibold text-sm">{action.label}</p><ChevronRight className="h-3 w-3 opacity-50 mt-0.5" /></div>
                </button>
              ))}
            </motion.div>

            <div className="grid md:grid-cols-2 gap-5">
              <GamificationProgress />
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Award className="h-5 w-5" />Performance</CardTitle></CardHeader>
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
            </div>
            <AIPricingAssistant mode="creator" />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">{t("dashboard.campaigns")}</h2>
              <Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-2" />{t("dashboard.viewAvailable")}</Button>
            </div>

            {selectedCampaignForProof && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Upload className="h-5 w-5" />{t("dashboard.uploadProof")}</CardTitle></CardHeader>
                <CardContent>
                  <ProofUploadForm campaignId={selectedCampaignForProof} onSuccess={() => setSelectedCampaignForProof(null)} />
                  <Button variant="outline" className="mt-4" onClick={() => setSelectedCampaignForProof(null)}>{t("common.cancel")}</Button>
                </CardContent>
              </Card>
            )}

            {campaigns.length === 0 ? (
              <Card className="p-8 text-center"><p className="text-muted-foreground">{t("dashboard.noCampaigns")}</p></Card>
            ) : isMobile ? (
              <SwipeCampaignCards>
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{campaign.title}</h3>
                        <VerificationBadge status={(campaign.verification_status as VerificationStatus) || "not_started"} />
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{campaign.description}</p>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-medium text-success">{formatFromUSD(Number(campaign.price))}</span>
                        <Badge variant={campaign.status === "active" ? "default" : campaign.status === "completed" ? "secondary" : "outline"}>{campaign.status}</Badge>
                      </div>
                      {campaign.status === "active" && campaign.verification_status !== "verified" && (
                        <Button size="sm" className="w-full" onClick={() => setSelectedCampaignForProof(campaign.id)}><Upload className="h-4 w-4 mr-2" />{t("dashboard.uploadProof")}</Button>
                      )}
                    </div>
                  </Card>
                ))}
              </SwipeCampaignCards>
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
          </TabsContent>

          <TabsContent value="earnings"><EarningsChart /></TabsContent>
          <TabsContent value="academia"><AcademiaStatusAds /></TabsContent>
          <TabsContent value="profile"><ProfileEditForm /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
