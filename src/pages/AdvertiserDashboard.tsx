import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedProfileCard } from "@/components/EnhancedProfileCard";
import { TrustIndicators } from "@/components/TrustIndicators";
import { MetricsCard } from "@/components/MetricsCard";
import { CampaignCard } from "@/components/CampaignCard";
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
import { Plus, Target, TrendingUp, Eye, Settings, DollarSign, Loader2, CheckCircle, Bot, CreditCard } from "lucide-react";

export const AdvertiserDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCampaignForReview, setSelectedCampaignForReview] = useState<string | null>(null);
  const [selectedCampaignForPayment, setSelectedCampaignForPayment] = useState<any>(null);
  const { campaigns, loading: campaignsLoading, refetch } = useCampaigns();
  const { profiles, loading: profilesLoading } = useProfiles();
  const { profile } = useProfile();
  const { formatFromUSD } = useLocalizationContext();

  const activeCampaigns = campaigns.filter(c => c.status === 'active' || c.status === 'pending');
  const totalSpent = campaigns.filter(c => c.status === 'completed').reduce((sum, c) => sum + Number(c.price), 0);

  const getStatusColor = (status: string) => {
    switch (status) { 
      case 'active': return 'bg-success'; 
      case 'pending': return 'bg-warning'; 
      case 'completed': return 'bg-primary'; 
      default: return 'bg-muted'; 
    }
  };

  if (campaignsLoading || profilesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando seu painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Painel do Anunciante</h1>
            <p className="text-muted-foreground mt-1">Gerencie campanhas e encontre os melhores criadores</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <CreateCampaignDialog>
              <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-lg">
                <Plus className="h-5 w-5 mr-2" />
                Nova Campanha
              </Button>
            </CreateCampaignDialog>
            <NotificationButton />
            <Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-2" />Configurações</Button>
          </div>
        </div>

        {/* Onboarding for advertiser */}
        <OnboardingFlow
          profile={profile}
          role="advertiser"
          campaignCount={campaigns.length}
          onAction={(action) => {
            if (action === 'create_campaign') setActiveTab('campaigns');
            if (action === 'find_creator') setActiveTab('statusai');
            if (action === 'make_payment') setActiveTab('payments');
            if (action === 'review_proof') setActiveTab('verification');
          }}
          onDismiss={() => {}}
        />

        {/* Prominent CTA for empty state */}
        {campaigns.length === 0 && (
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Comece sua primeira campanha!</h3>
                <p className="text-muted-foreground">Conecte-se com criadores e alcance milhares de visualizações no WhatsApp Status</p>
              </div>
              <CreateCampaignDialog>
                <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-lg whitespace-nowrap">
                  <Plus className="h-5 w-5 mr-2" />
                  Criar Minha Primeira Campanha
                </Button>
              </CreateCampaignDialog>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricsCard title="Campanhas Ativas" value={activeCampaigns.length} icon={Target} variant="primary" />
          <MetricsCard title="Total Investido" value={formatFromUSD(totalSpent)} icon={DollarSign} variant="success" />
          <MetricsCard title="Criadores Disponíveis" value={profiles.length} icon={Eye} variant="warning" subtitle="na plataforma" />
          <MetricsCard title="Campanhas Totais" value={campaigns.length} icon={TrendingUp} variant="default" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
            <TabsTrigger value="verification" className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Verificação
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-1">
              <CreditCard className="h-4 w-4" />
              Pagamentos
            </TabsTrigger>
            <TabsTrigger value="creators">Criadores</TabsTrigger>
            <TabsTrigger value="statusai" className="flex items-center gap-1">
              <Bot className="h-4 w-4" />
              StatusAI
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Campanhas Recentes</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {campaigns.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Nenhuma campanha ainda</p>
                  ) : (
                    campaigns.slice(0, 3).map((campaign) => (
                      <div key={campaign.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <div><div className="font-medium">{campaign.title}</div><div className="text-sm text-muted-foreground">{formatFromUSD(Number(campaign.price))}</div></div>
                        <Badge className={getStatusColor(campaign.status || 'pending')}>{campaign.status === 'active' ? 'Ativa' : campaign.status === 'completed' ? 'Concluída' : 'Pendente'}</Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Top Performers</CardTitle></CardHeader><CardContent><TrustIndicators /></CardContent></Card>
            </div>

            {/* AI Campaign Advisor */}
            <AIPricingAssistant mode="advertiser" advertiserData={{
              budget: totalSpent || 100,
              creatorsCount: profiles.length,
              avgPriceMin: 10,
              avgPriceMax: 100,
            }} />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Suas Campanhas</h2>
              <CreateCampaignDialog><Button><Plus className="h-4 w-4 mr-2" />Nova Campanha</Button></CreateCampaignDialog>
            </div>
            {campaigns.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Você ainda não tem campanhas. Crie sua primeira campanha!</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{campaign.title}</h3>
                          <VerificationBadge status={(campaign.verification_status as 'not_started' | 'proof_submitted' | 'under_review' | 'verified' | 'rejected') || 'not_started'} />
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{campaign.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-medium text-success">{formatFromUSD(Number(campaign.price))}</span>
                          <Badge variant={campaign.status === 'active' ? 'default' : campaign.status === 'completed' ? 'secondary' : 'outline'}>
                            {campaign.status === 'active' ? 'Ativa' : campaign.status === 'completed' ? 'Concluída' : 'Pendente'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {campaign.verification_status === 'proof_submitted' && (
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCampaignForReview(campaign.id);
                              setActiveTab('verification');
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Revisar Prova
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="verification" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Verificação de Publicações</h2>
            </div>
            
            {selectedCampaignForReview ? (
              <div className="space-y-4">
                <Button variant="outline" onClick={() => setSelectedCampaignForReview(null)}>
                  ← Voltar para lista
                </Button>
                <ProofReviewPanel 
                  campaignId={selectedCampaignForReview} 
                  isAdvertiser={true}
                />
              </div>
            ) : (
              <>
                {campaigns.filter(c => c.verification_status === 'proof_submitted' || c.verification_status === 'under_review').length === 0 ? (
                  <Card className="p-8 text-center">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhuma prova pendente de verificação.</p>
                    <p className="text-sm text-muted-foreground mt-2">Quando criadores enviarem comprovantes, eles aparecerão aqui.</p>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {campaigns
                      .filter(c => c.verification_status === 'proof_submitted' || c.verification_status === 'under_review')
                      .map((campaign) => (
                        <Card key={campaign.id} className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedCampaignForReview(campaign.id)}>
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-semibold">{campaign.title}</h3>
                              <p className="text-sm text-muted-foreground">{formatFromUSD(Number(campaign.price))}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <VerificationBadge status={(campaign.verification_status as 'not_started' | 'proof_submitted' | 'under_review' | 'verified' | 'rejected') || 'not_started'} />
                              <Button size="sm">Revisar</Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Pagamentos de Campanhas
            </h2>
            {selectedCampaignForPayment ? (
              <div className="max-w-lg mx-auto">
                <PaymentCheckout
                  campaignId={selectedCampaignForPayment.id}
                  creatorId={selectedCampaignForPayment.creator_id}
                  amount={Number(selectedCampaignForPayment.price)}
                  campaignTitle={selectedCampaignForPayment.title}
                  onSuccess={() => {
                    setSelectedCampaignForPayment(null);
                    refetch();
                  }}
                  onCancel={() => setSelectedCampaignForPayment(null)}
                />
              </div>
            ) : (
              <>
                {campaigns.filter(c => c.status === 'pending' && (!('escrow_status' in c) || (c as any).escrow_status === 'pending')).length === 0 ? (
                  <Card className="p-8 text-center">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhuma campanha pendente de pagamento.</p>
                    <p className="text-sm text-muted-foreground mt-2">Crie uma nova campanha para iniciar o processo de pagamento.</p>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {campaigns
                      .filter(c => c.status === 'pending')
                      .map((campaign) => (
                        <Card key={campaign.id} className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedCampaignForPayment(campaign)}>
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-semibold">{campaign.title}</h3>
                              <p className="text-sm text-muted-foreground">{formatFromUSD(Number(campaign.price))}</p>
                            </div>
                            <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                              <CreditCard className="h-4 w-4 mr-2" />
                              Pagar
                            </Button>
                          </div>
                        </Card>
                      ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="creators" className="space-y-6">
            <h2 className="text-xl font-semibold">Encontrar Criadores</h2>
            <SearchFilters onFiltersChange={() => {}} showPriceFilter showNicheFilter showRatingFilter showLocationFilter />
            {profiles.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Nenhum criador disponível no momento.</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profiles.map((creator) => (
                  <EnhancedProfileCard 
                    key={creator.id} 
                    profile={{
                      id: creator.id,
                      display_name: creator.display_name,
                      niche: creator.niche || '',
                      price_range: creator.price_range || '',
                      rating: Number(creator.rating) || 0,
                      total_reviews: creator.total_reviews || 0,
                      total_campaigns: creator.total_campaigns || 0,
                      is_verified: creator.is_verified || false,
                      badge_level: creator.badge_level || 'bronze',
                      created_at: creator.created_at || ''
                    }} 
                    onSelect={() => {}} 
                  />
                ))}
              </div>
            )}
          </TabsContent>


          <TabsContent value="statusai" className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              StatusAI — Inteligência Artificial
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <StatusAIMatchmaker />
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Previsão de ROI por Criador</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">
                      Selecione um criador na aba "Criadores" e use o StatusAI para prever o retorno.
                    </p>
                    {profiles.slice(0, 3).map((creator) => (
                      <div key={creator.id} className="mb-4">
                        <StatusAIROIPredictor 
                          creatorId={creator.profile_id || creator.id} 
                          creatorName={creator.display_name} 
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics"><AnalyticsDashboard /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};