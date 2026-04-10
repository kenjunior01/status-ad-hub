import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedProfileCard } from "@/components/EnhancedProfileCard";
import { MetricsCard } from "@/components/MetricsCard";
import { SearchFilters } from "@/components/SearchFilters";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { CreateCampaignDialog } from "@/components/CreateCampaignForm";
import { NotificationButton } from "@/components/NotificationsPanel";
import { ProofReviewPanel } from "@/components/ProofReviewPanel";
import { VerificationBadge } from "@/components/VerificationBadge";
import { StatusAIMatchmaker } from "@/components/StatusAIMatchmaker";
import { StatusAIROIPredictor } from "@/components/StatusAIROIPredictor";
import { PaymentCheckout } from "@/components/PaymentCheckout";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { AIPricingAssistant } from "@/components/AIPricingAssistant";
import { useProfile } from "@/hooks/useProfile";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useProfiles } from "@/hooks/useProfiles";
import { motion } from "framer-motion";
import {
  Plus, Target, TrendingUp, Eye, DollarSign, Loader2,
  CheckCircle, Bot, CreditCard, ChevronRight,
} from "lucide-react";

export const AdvertiserDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCampaignForReview, setSelectedCampaignForReview] = useState<string | null>(null);
  const [selectedCampaignForPayment, setSelectedCampaignForPayment] = useState<any>(null);
  const { campaigns, loading: campaignsLoading, refetch } = useCampaigns();
  const { profiles, loading: profilesLoading } = useProfiles();
  const { profile } = useProfile();
  const { formatFromUSD } = useLocalizationContext();

  const activeCampaigns = campaigns.filter((c) => c.status === "active" || c.status === "pending");
  const totalSpent = campaigns.filter((c) => c.status === "completed").reduce((sum, c) => sum + Number(c.price), 0);

  if (campaignsLoading || profilesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Compact Header */}
        <motion.div {...fadeUp} className="flex flex-col md:flex-row justify-between items-start gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {t("common.hello")}, {profile?.display_name || t("navigation.advertiser")} 📢
            </h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <CreateCampaignDialog>
              <Button className="bg-gradient-primary hover:opacity-90 shadow-lg gap-2">
                <Plus className="h-4 w-4" />
                {t("dashboard.newCampaign")}
              </Button>
            </CreateCampaignDialog>
            <NotificationButton />
          </div>
        </motion.div>

        {/* Onboarding */}
        <OnboardingFlow
          profile={profile}
          role="advertiser"
          campaignCount={campaigns.length}
          onAction={(action) => {
            if (action === "create_campaign") setActiveTab("campaigns");
            if (action === "find_creator") setActiveTab("statusai");
            if (action === "make_payment") setActiveTab("payments");
            if (action === "review_proof") setActiveTab("verification");
          }}
          onDismiss={() => {}}
        />

        {/* Empty state CTA */}
        {campaigns.length === 0 && (
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{t("dashboard.startFirstCampaign")}</h3>
                <p className="text-sm text-muted-foreground">{t("dashboard.connectWithCreators")}</p>
              </div>
              <CreateCampaignDialog>
                <Button className="bg-gradient-primary hover:opacity-90 shadow-lg gap-2 whitespace-nowrap">
                  <Plus className="h-4 w-4" />
                  {t("dashboard.createFirstCampaign")}
                </Button>
              </CreateCampaignDialog>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats — Scrollable */}
        <motion.div {...fadeUp} className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 scrollbar-hide">
          <div className="min-w-[160px] md:min-w-0">
            <MetricsCard title={t("dashboard.activeCampaigns")} value={activeCampaigns.length} icon={Target} variant="primary" />
          </div>
          <div className="min-w-[160px] md:min-w-0">
            <MetricsCard title={t("dashboard.totalInvested")} value={formatFromUSD(totalSpent)} icon={DollarSign} variant="success" />
          </div>
          <div className="min-w-[160px] md:min-w-0">
            <MetricsCard title={t("dashboard.availableCreators")} value={profiles.length} icon={Eye} variant="warning" />
          </div>
          <div className="min-w-[160px] md:min-w-0">
            <MetricsCard title={t("dashboard.totalCampaigns")} value={campaigns.length} icon={TrendingUp} variant="default" />
          </div>
        </motion.div>

        {/* Tabs — Scrollable on mobile */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-5">
              <TabsTrigger value="overview">📊 {t("dashboard.overview")}</TabsTrigger>
              <TabsTrigger value="campaigns">📋 {t("dashboard.campaigns")}</TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-1">
                <CreditCard className="h-4 w-4" />
                {t("dashboard.payments")}
              </TabsTrigger>
              <TabsTrigger value="creators">👥 {t("navigation.creators")}</TabsTrigger>
              <TabsTrigger value="statusai" className="flex items-center gap-1">
                <Bot className="h-4 w-4" />
                StatusAI
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-5">
            {/* Quick Actions */}
            <motion.div {...fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: t("dashboard.newCampaign"), icon: "🚀", tab: "campaigns", color: "bg-primary/10 text-primary" },
                { label: t("dashboard.payments"), icon: "💳", tab: "payments", color: "bg-success/10 text-success" },
                { label: t("navigation.creators"), icon: "👥", tab: "creators", color: "bg-warning/10 text-warning" },
                { label: "StatusAI", icon: "🤖", tab: "statusai", color: "bg-accent/10 text-accent" },
              ].map((action) => (
                <button
                  key={action.tab}
                  onClick={() => setActiveTab(action.tab)}
                  className={`${action.color} rounded-xl p-4 flex items-center gap-3 hover:scale-[1.02] transition-transform text-left`}
                >
                  <span className="text-2xl">{action.icon}</span>
                  <div>
                    <p className="font-semibold text-sm">{action.label}</p>
                    <ChevronRight className="h-3 w-3 opacity-50 mt-0.5" />
                  </div>
                </button>
              ))}
            </motion.div>

            <div className="grid md:grid-cols-2 gap-5">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-5 w-5" />
                    {t("dashboard.recentCampaigns")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {campaigns.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">{t("dashboard.noCampaigns")}</p>
                  ) : (
                    campaigns.slice(0, 3).map((campaign) => (
                      <div key={campaign.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{campaign.title}</div>
                          <div className="text-xs text-muted-foreground">{formatFromUSD(Number(campaign.price))}</div>
                        </div>
                        <Badge variant={campaign.status === "active" ? "default" : "secondary"}>{campaign.status}</Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <AIPricingAssistant
                mode="advertiser"
                advertiserData={{ budget: totalSpent || 100, creatorsCount: profiles.length, avgPriceMin: 10, avgPriceMax: 100 }}
              />
            </div>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">{t("dashboard.campaigns")}</h2>
              <CreateCampaignDialog>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  {t("dashboard.newCampaign")}
                </Button>
              </CreateCampaignDialog>
            </div>

            {campaigns.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">{t("dashboard.noCampaigns")}</p>
              </Card>
            ) : (
              <div className="grid gap-3">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{campaign.title}</h3>
                          <VerificationBadge status={(campaign.verification_status as any) || "not_started"} />
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-medium text-success">{formatFromUSD(Number(campaign.price))}</span>
                          <Badge variant={campaign.status === "active" ? "default" : "secondary"}>{campaign.status}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {campaign.verification_status === "proof_submitted" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCampaignForReview(campaign.id);
                              setActiveTab("payments");
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {t("dashboard.review")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="payments" className="space-y-5">
            {selectedCampaignForReview ? (
              <div className="space-y-4">
                <Button variant="outline" onClick={() => setSelectedCampaignForReview(null)}>
                  ← {t("common.back")}
                </Button>
                <ProofReviewPanel campaignId={selectedCampaignForReview} isAdvertiser={true} />
              </div>
            ) : selectedCampaignForPayment ? (
              <div className="max-w-lg mx-auto">
                <PaymentCheckout
                  campaignId={selectedCampaignForPayment.id}
                  creatorId={selectedCampaignForPayment.creator_id}
                  amount={Number(selectedCampaignForPayment.price)}
                  campaignTitle={selectedCampaignForPayment.title}
                  onSuccess={() => { setSelectedCampaignForPayment(null); refetch(); }}
                  onCancel={() => setSelectedCampaignForPayment(null)}
                />
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  {t("dashboard.payments")}
                </h2>
                {campaigns.filter((c) => c.status === "pending").length === 0 ? (
                  <Card className="p-8 text-center">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t("dashboard.noPaymentsPending")}</p>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {campaigns
                      .filter((c) => c.status === "pending")
                      .map((campaign) => (
                        <Card
                          key={campaign.id}
                          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedCampaignForPayment(campaign)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-semibold text-sm">{campaign.title}</h3>
                              <p className="text-xs text-muted-foreground">{formatFromUSD(Number(campaign.price))}</p>
                            </div>
                            <Button size="sm" className="bg-gradient-primary hover:opacity-90 gap-1">
                              <CreditCard className="h-4 w-4" />
                              {t("dashboard.pay")}
                            </Button>
                          </div>
                        </Card>
                      ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="creators" className="space-y-5">
            <h2 className="text-lg font-semibold">{t("dashboard.findCreators")}</h2>
            <SearchFilters onFiltersChange={() => {}} showPriceFilter showNicheFilter showRatingFilter showLocationFilter />
            {profiles.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">{t("dashboard.noCreatorsAvailable")}</p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {profiles.map((creator) => (
                  <EnhancedProfileCard
                    key={creator.id}
                    profile={{
                      id: creator.id,
                      display_name: creator.display_name,
                      niche: creator.niche || "",
                      price_range: creator.price_range || "",
                      rating: Number(creator.rating) || 0,
                      total_reviews: creator.total_reviews || 0,
                      total_campaigns: creator.total_campaigns || 0,
                      is_verified: creator.is_verified || false,
                      badge_level: creator.badge_level || "bronze",
                      created_at: creator.created_at || "",
                    }}
                    onSelect={() => {}}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="statusai" className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <StatusAIMatchmaker />
              <StatusAIROIPredictor creatorId="" />
            </div>
            <AnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
