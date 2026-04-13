import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EnhancedProfileCard } from "@/components/EnhancedProfileCard";
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
import { AcademiaStatusAds } from "@/components/AcademiaStatusAds";
import { CreateListingForm, AdListingCard, ListingApplicationsList } from "@/components/AdListings";
import { useProfile } from "@/hooks/useProfile";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useProfiles } from "@/hooks/useProfiles";
import { useAdListings } from "@/hooks/useAdListings";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import {
  Plus, Target, TrendingUp, Eye, DollarSign, Loader2,
  CheckCircle, Bot, CreditCard, GraduationCap, Megaphone, ArrowLeft,
  Grid3X3, Users, BarChart3, Settings,
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
  const isMobile = useIsMobile();

  const activeCampaigns = campaigns.filter((c) => c.status === "active" || c.status === "pending");
  const totalSpent = campaigns.filter((c) => c.status === "completed").reduce((sum, c) => sum + Number(c.price), 0);
  const openListings = myListings.filter(l => l.status === 'open');

  if (campaignsLoading || profilesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
      </div>
    );
  }

  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

  const mobileNavTabs = [
    { key: "overview", icon: Grid3X3, label: "Geral" },
    { key: "listings", icon: Megaphone, label: "Anúncios" },
    { key: "campaigns", icon: Target, label: "Campanhas" },
    { key: "payments", icon: CreditCard, label: "Pagamentos" },
    { key: "creators", icon: Users, label: "Criadores" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ═══ INSTAGRAM-STYLE HEADER (mobile) ═══ */}
      {isMobile ? (
        <div className="bg-card border-b border-border/30">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2">
            <h1 className="text-base font-bold text-foreground truncate max-w-[180px]">
              {profile?.display_name || "Anunciante"}
            </h1>
            <div className="flex items-center gap-1">
              <CreateListingForm onCreated={refetchListings} />
              <NotificationButton />
            </div>
          </div>

          {/* Profile row */}
          <div className="flex items-center gap-4 px-4 py-3">
            <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 p-[2px]">
              <Avatar className="w-full h-full border-2 border-card">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {profile?.display_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Stats row */}
            <div className="flex-1 flex justify-around text-center">
              <button onClick={() => setActiveTab("campaigns")} className="flex flex-col items-center">
                <span className="text-lg font-bold text-foreground">{campaigns.length}</span>
                <span className="text-[10px] text-muted-foreground">Campanhas</span>
              </button>
              <button onClick={() => setActiveTab("listings")} className="flex flex-col items-center">
                <span className="text-lg font-bold text-foreground">{openListings.length}</span>
                <span className="text-[10px] text-muted-foreground">Anúncios</span>
              </button>
              <button onClick={() => setActiveTab("creators")} className="flex flex-col items-center">
                <span className="text-lg font-bold text-foreground">{profiles.length}</span>
                <span className="text-[10px] text-muted-foreground">Criadores</span>
              </button>
            </div>
          </div>

          {/* Bio / tip */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 bg-primary/5 rounded-lg px-2 py-1.5">
              <MascotInline mood={mascotTip.mood} size="xs" showBubble={false} animate={false} />
              <p className="text-[10px] text-muted-foreground flex-1">{mascotTip.message}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1 px-4 pb-3">
            <CreateCampaignDialog>
              <Button size="sm" className="flex-1 h-8 text-xs font-semibold rounded-lg gap-1">
                <Plus className="h-3 w-3" />Nova Campanha
              </Button>
            </CreateCampaignDialog>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs font-semibold rounded-lg"
              onClick={() => setActiveTab("creators")}
            >
              Encontrar Criadores
            </Button>
          </div>

          {/* Highlights row */}
          <div className="flex gap-3 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {[
              { label: "Investido", value: formatFromUSD(totalSpent), icon: "💰" },
              { label: "Activas", value: activeCampaigns.length, icon: "🎯" },
              { label: "Pendentes", value: campaigns.filter(c => c.status === "pending").length, icon: "⏳" },
              { label: "StatusAI", value: "🤖", icon: "✨" },
            ].map((h, i) => (
              <button
                key={i}
                onClick={() => i === 3 ? setActiveTab("statusai") : undefined}
                className="flex flex-col items-center gap-1 shrink-0"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-border/30 flex items-center justify-center text-lg">
                  {h.icon}
                </div>
                <span className="text-[10px] font-semibold text-foreground">{String(h.value)}</span>
                <span className="text-[9px] text-muted-foreground">{h.label}</span>
              </button>
            ))}
          </div>

          {/* Tab navigation */}
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
            <motion.div {...fadeUp} className="flex flex-row justify-between items-start gap-3">
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
          </div>
        </div>
      )}

      {/* ═══ CONTENT AREA ═══ */}
      <div className={`${isMobile ? 'px-3 py-3' : 'px-6'} max-w-6xl mx-auto space-y-4`}>
        {activeTab === "overview" && (
          <>
            <OnboardingFlow
              profile={profile} role="advertiser" campaignCount={campaigns.length}
              onAction={(action) => {
                if (action === "create_campaign") setActiveTab("listings");
                if (action === "find_creator") setActiveTab("creators");
                if (action === "make_payment") setActiveTab("payments");
              }}
              onDismiss={() => {}}
            />

            {!isMobile && (
              <motion.div {...fadeUp} className="grid grid-cols-4 gap-3">
                {[
                  { title: t("dashboard.activeCampaigns"), value: activeCampaigns.length, icon: Target },
                  { title: "Anúncios Activos", value: openListings.length, icon: Megaphone },
                  { title: t("dashboard.availableCreators"), value: profiles.length, icon: Eye },
                  { title: t("dashboard.totalInvested"), value: formatFromUSD(totalSpent), icon: DollarSign },
                ].map((m, i) => (
                  <Card key={i} className="glass">
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
                ))}
              </motion.div>
            )}

            {!isMobile && (
              <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border/30">
                {mobileNavTabs.concat([
                  { key: "statusai", icon: Bot, label: "StatusAI" },
                  { key: "academia", icon: GraduationCap, label: "Academia" },
                ]).map((tab) => {
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
            )}

            <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'} gap-4`}>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Megaphone className="h-4 w-4" />Anúncios Recentes</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {myListings.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4 text-sm">Publique seu primeiro anúncio</p>
                  ) : myListings.slice(0, 3).map((listing) => (
                    <div key={listing.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                      <div><div className="font-medium text-xs">{listing.title}</div><div className="text-[10px] text-muted-foreground">{formatFromUSD(Number(listing.budget))}</div></div>
                      <Badge variant={listing.status === "open" ? "default" : "secondary"} className="text-[10px]">{listing.status}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <AIPricingAssistant mode="advertiser" advertiserData={{ budget: totalSpent || 100, creatorsCount: profiles.length, avgPriceMin: 10, avgPriceMax: 100 }} />
            </div>
          </>
        )}

        {activeTab === "listings" && (
          <div className="space-y-3">
            {selectedListingForApps ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setSelectedListingForApps(null)} className="gap-1 text-xs h-8">
                  <ArrowLeft className="h-3 w-3" /> Voltar
                </Button>
                <ListingApplicationsList listingId={selectedListingForApps} />
              </>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-primary" /> Meus Anúncios
                  </h2>
                  <CreateListingForm onCreated={refetchListings} />
                </div>
                {myListings.length === 0 ? (
                  <div className="py-12 text-center">
                    <MascotInline mood="excited" size="md" message="Publique seu primeiro anúncio!" bubblePosition="top" />
                    <p className="text-sm text-muted-foreground mt-4">Criadores se candidatarão</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myListings.map((listing) => (
                      <div key={listing.id} className="space-y-1">
                        <AdListingCard listing={listing} isCreator={false} onManage={(id) => setSelectedListingForApps(id)} />
                        {listing.status === 'open' && (
                          <div className="flex justify-end">
                            <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={() => closeListing(listing.id)}>Encerrar</Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "campaigns" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-semibold">{t("dashboard.campaigns")}</h2>
              <CreateCampaignDialog><Button size="sm" className="gap-1 text-xs h-8"><Plus className="h-3 w-3" />Nova</Button></CreateCampaignDialog>
            </div>
            {campaigns.length === 0 ? (
              <div className="py-12 text-center">
                <MascotInline mood="waving" size="md" message="Crie sua primeira campanha!" bubblePosition="top" />
                <p className="text-sm text-muted-foreground mt-4">{t("dashboard.noCampaigns")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <h3 className="font-semibold text-sm truncate">{campaign.title}</h3>
                          <VerificationBadge status={(campaign.verification_status as any) || "not_started"} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-success">{formatFromUSD(Number(campaign.price))}</span>
                          <Badge variant={campaign.status === "active" ? "default" : "secondary"} className="text-[10px] h-5">{campaign.status}</Badge>
                        </div>
                      </div>
                      {campaign.verification_status === "proof_submitted" && (
                        <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={() => { setSelectedCampaignForReview(campaign.id); setActiveTab("payments"); }}>
                          <CheckCircle className="h-3 w-3 mr-1" />Revisar
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "payments" && (
          <div className="space-y-3">
            {selectedCampaignForReview ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setSelectedCampaignForReview(null)} className="gap-1 text-xs h-8">
                  <ArrowLeft className="h-3 w-3" />Voltar
                </Button>
                <ProofReviewPanel campaignId={selectedCampaignForReview} isAdvertiser={true} />
              </>
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
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />{t("dashboard.payments")}
                </h2>
                {campaigns.filter((c) => c.status === "pending").length === 0 ? (
                  <div className="py-12 text-center">
                    <MascotInline mood="happy" size="md" message="Sem pagamentos pendentes! ✅" bubblePosition="top" />
                    <p className="text-sm text-muted-foreground mt-4">{t("dashboard.noPaymentsPending")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {campaigns.filter((c) => c.status === "pending").map((campaign) => (
                      <Card key={campaign.id} className="p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedCampaignForPayment(campaign)}>
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold text-sm">{campaign.title}</h3>
                            <p className="text-xs text-muted-foreground">{formatFromUSD(Number(campaign.price))}</p>
                          </div>
                          <Button size="sm" className="h-8 text-xs gap-1"><CreditCard className="h-3 w-3" />Pagar</Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "creators" && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold">{t("dashboard.findCreators")}</h2>
            <SearchFilters onFiltersChange={() => {}} showPriceFilter showNicheFilter showRatingFilter showLocationFilter />
            {profiles.length === 0 ? (
              <div className="py-12 text-center">
                <MascotInline mood="thinking" size="md" message="Nenhum criador disponível" bubblePosition="top" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {profiles.map((creator) => (
                  <EnhancedProfileCard key={creator.id} profile={{ id: creator.id, display_name: creator.display_name, niche: creator.niche || "", price_range: creator.price_range || "", rating: Number(creator.rating) || 0, total_reviews: creator.total_reviews || 0, total_campaigns: creator.total_campaigns || 0, is_verified: creator.is_verified || false, badge_level: creator.badge_level || "bronze", created_at: creator.created_at || "" }} onSelect={() => {}} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "statusai" && (
          <div className="space-y-4">
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'} gap-4`}>
              <StatusAIMatchmaker />
              <StatusAIROIPredictor creatorId="" />
            </div>
            <AnalyticsDashboard />
          </div>
        )}

        {activeTab === "academia" && <AcademiaStatusAds />}
      </div>
    </div>
  );
};
