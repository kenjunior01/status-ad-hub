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
import { GuidedTour } from "@/components/GuidedTour";
import { AIPricingAssistant } from "@/components/AIPricingAssistant";
import { AcademiaStatusAds } from "@/components/AcademiaStatusAds";
import { CreateListingForm, AdListingCard, ListingApplicationsList } from "@/components/AdListings";
import { useProfile } from "@/hooks/useProfile";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useProfiles } from "@/hooks/useProfiles";
import { useAdListings } from "@/hooks/useAdListings";
import { motion } from "framer-motion";
import {
  Plus, Target, TrendingUp, Eye, DollarSign, Loader2,
  CheckCircle, Bot, CreditCard, ChevronRight, GraduationCap, Megaphone, ArrowLeft,
} from "lucide-react";
import { MascotInline } from "@/components/MascotInline";
import { useMascotContext } from "@/hooks/useMascotContext";

export const AdvertiserDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const mascotTip = useMascotContext("advertiser-dashboard");
  const [selectedCampaignForReview, setSelectedCampaignForReview] = useState<string | null>(null);
  const [selectedCampaignForPayment, setSelectedCampaignForPayment] = useState<any>(null);
  const [selectedListingForApps, setSelectedListingForApps] = useState<string | null>(null);
  const { campaigns, loading: campaignsLoading, refetch } = useCampaigns();
  const { profiles, loading: profilesLoading } = useProfiles();
  const { profile } = useProfile();
  const { formatFromUSD } = useLocalizationContext();
  const { myListings, loading: listingsLoading, refetch: refetchListings, closeListing } = useAdListings();

  const activeCampaigns = campaigns.filter((c) => c.status === "active" || c.status === "pending");
  const totalSpent = campaigns.filter((c) => c.status === "completed").reduce((sum, c) => sum + Number(c.price), 0);

  if (campaignsLoading || profilesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
      </div>
    );
  }

  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <motion.div {...fadeUp} className="flex flex-col md:flex-row justify-between items-start gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              {t("common.hello")}, {profile?.display_name || t("navigation.advertiser")} 📢
              <MascotInline mood={mascotTip.mood} size="sm" message={mascotTip.message} bubblePosition="right" />
            </h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <CreateListingForm onCreated={refetchListings} />
            <CreateCampaignDialog>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />{t("dashboard.newCampaign")}
              </Button>
            </CreateCampaignDialog>
            <NotificationButton />
          </div>
        </motion.div>

        <GuidedTour role="advertiser" onNavigate={setActiveTab} onComplete={() => {}} />
        <OnboardingFlow
          profile={profile} role="advertiser" campaignCount={campaigns.length}
          onAction={(action) => {
            if (action === "create_campaign") setActiveTab("listings");
            if (action === "find_creator") setActiveTab("statusai");
            if (action === "make_payment") setActiveTab("payments");
          }}
          onDismiss={() => {}}
        />

        <motion.div {...fadeUp} className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 scrollbar-hide">
          {[
            { title: t("dashboard.activeCampaigns"), value: activeCampaigns.length, icon: Target, variant: "primary" as const },
            { title: "Anúncios Activos", value: myListings.filter(l => l.status === 'open').length, icon: Megaphone, variant: "success" as const },
            { title: t("dashboard.availableCreators"), value: profiles.length, icon: Eye, variant: "warning" as const },
            { title: t("dashboard.totalInvested"), value: formatFromUSD(totalSpent), icon: DollarSign, variant: "default" as const },
          ].map((m, i) => (
            <div key={i} className="min-w-[160px] md:min-w-0"><MetricsCard {...m} /></div>
          ))}
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-7">
              <TabsTrigger value="overview">📊 {t("dashboard.overview")}</TabsTrigger>
              <TabsTrigger value="listings">📢 Anúncios</TabsTrigger>
              <TabsTrigger value="campaigns">📋 {t("dashboard.campaigns")}</TabsTrigger>
              <TabsTrigger value="payments"><CreditCard className="h-4 w-4 mr-1" />{t("dashboard.payments")}</TabsTrigger>
              <TabsTrigger value="creators">👥 {t("navigation.creators")}</TabsTrigger>
              <TabsTrigger value="statusai"><Bot className="h-4 w-4 mr-1" />StatusAI</TabsTrigger>
              <TabsTrigger value="academia"><GraduationCap className="h-4 w-4 mr-1" />Academia</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-5">
            <motion.div {...fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Publicar Anúncio", icon: "📢", tab: "listings", color: "bg-primary/10 text-primary" },
                { label: t("dashboard.newCampaign"), icon: "🚀", tab: "campaigns", color: "bg-success/10 text-success" },
                { label: t("navigation.creators"), icon: "👥", tab: "creators", color: "bg-warning/10 text-warning" },
                { label: "StatusAI", icon: "🤖", tab: "statusai", color: "bg-accent/10 text-accent" },
              ].map((action) => (
                <button key={action.tab} onClick={() => setActiveTab(action.tab)} className={`${action.color} rounded-xl p-4 flex items-center gap-3 hover:scale-[1.02] transition-transform text-left`}>
                  <span className="text-2xl">{action.icon}</span>
                  <div><p className="font-semibold text-sm">{action.label}</p><ChevronRight className="h-3 w-3 opacity-50 mt-0.5" /></div>
                </button>
              ))}
            </motion.div>
            <div className="grid md:grid-cols-2 gap-5">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-5 w-5" />Meus Anúncios Recentes</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {myListings.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Publique seu primeiro anúncio</p>
                  ) : myListings.slice(0, 3).map((listing) => (
                    <div key={listing.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div><div className="font-medium text-sm">{listing.title}</div><div className="text-xs text-muted-foreground">{formatFromUSD(Number(listing.budget))}</div></div>
                      <Badge variant={listing.status === "open" ? "default" : "secondary"}>{listing.status}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <AIPricingAssistant mode="advertiser" advertiserData={{ budget: totalSpent || 100, creatorsCount: profiles.length, avgPriceMin: 10, avgPriceMax: 100 }} />
            </div>
          </TabsContent>

          {/* ═══ LISTINGS TAB ═══ */}
          <TabsContent value="listings" className="space-y-5">
            {selectedListingForApps ? (
              <div className="space-y-4">
                <Button variant="outline" size="sm" onClick={() => setSelectedListingForApps(null)} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Voltar aos Anúncios
                </Button>
                <ListingApplicationsList listingId={selectedListingForApps} />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-primary" /> Meus Anúncios
                  </h2>
                  <CreateListingForm onCreated={refetchListings} />
                </div>
                {myListings.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="font-medium">Nenhum anúncio publicado</p>
                    <p className="text-sm text-muted-foreground mt-1">Publique um anúncio para que criadores se candidatem.</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {myListings.map((listing) => (
                      <div key={listing.id} className="space-y-2">
                        <AdListingCard
                          listing={listing}
                          isCreator={false}
                          onManage={(id) => setSelectedListingForApps(id)}
                        />
                        {listing.status === 'open' && (
                          <div className="flex justify-end">
                            <Button variant="outline" size="sm" className="text-xs" onClick={() => closeListing(listing.id)}>
                              Encerrar Anúncio
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">{t("dashboard.campaigns")}</h2>
              <CreateCampaignDialog><Button size="sm" className="gap-1"><Plus className="h-4 w-4" />{t("dashboard.newCampaign")}</Button></CreateCampaignDialog>
            </div>
            {campaigns.length === 0 ? (
              <Card className="p-8 text-center"><p className="text-muted-foreground">{t("dashboard.noCampaigns")}</p></Card>
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
                      {campaign.verification_status === "proof_submitted" && (
                        <Button size="sm" variant="outline" onClick={() => { setSelectedCampaignForReview(campaign.id); setActiveTab("payments"); }}>
                          <CheckCircle className="h-4 w-4 mr-1" />{t("dashboard.review")}
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="payments" className="space-y-5">
            {selectedCampaignForReview ? (
              <div className="space-y-4">
                <Button variant="outline" onClick={() => setSelectedCampaignForReview(null)}>← {t("common.back")}</Button>
                <ProofReviewPanel campaignId={selectedCampaignForReview} isAdvertiser={true} />
              </div>
            ) : selectedCampaignForPayment ? (
              <div className="max-w-lg mx-auto">
                <PaymentCheckout campaignId={selectedCampaignForPayment.id} creatorId={selectedCampaignForPayment.creator_id} amount={Number(selectedCampaignForPayment.price)} campaignTitle={selectedCampaignForPayment.title} onSuccess={() => { setSelectedCampaignForPayment(null); refetch(); }} onCancel={() => setSelectedCampaignForPayment(null)} />
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" />{t("dashboard.payments")}</h2>
                {campaigns.filter((c) => c.status === "pending").length === 0 ? (
                  <Card className="p-8 text-center"><CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">{t("dashboard.noPaymentsPending")}</p></Card>
                ) : (
                  <div className="grid gap-3">
                    {campaigns.filter((c) => c.status === "pending").map((campaign) => (
                      <Card key={campaign.id} className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedCampaignForPayment(campaign)}>
                        <div className="flex justify-between items-center">
                          <div><h3 className="font-semibold text-sm">{campaign.title}</h3><p className="text-xs text-muted-foreground">{formatFromUSD(Number(campaign.price))}</p></div>
                          <Button size="sm" className="bg-gradient-primary hover:opacity-90 gap-1"><CreditCard className="h-4 w-4" />{t("dashboard.pay")}</Button>
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
              <Card className="p-8 text-center"><p className="text-muted-foreground">{t("dashboard.noCreatorsAvailable")}</p></Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {profiles.map((creator) => (
                  <EnhancedProfileCard key={creator.id} profile={{ id: creator.id, display_name: creator.display_name, niche: creator.niche || "", price_range: creator.price_range || "", rating: Number(creator.rating) || 0, total_reviews: creator.total_reviews || 0, total_campaigns: creator.total_campaigns || 0, is_verified: creator.is_verified || false, badge_level: creator.badge_level || "bronze", created_at: creator.created_at || "" }} onSelect={() => {}} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="statusai" className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5"><StatusAIMatchmaker /><StatusAIROIPredictor creatorId="" /></div>
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="academia"><AcademiaStatusAds /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
