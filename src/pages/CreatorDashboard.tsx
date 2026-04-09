import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressCTA } from "@/components/EnhancedCTA";
import { TrustIndicators } from "@/components/TrustIndicators";
import { MetricsCard } from "@/components/MetricsCard";
import { CampaignCard } from "@/components/CampaignCard";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { EarningsChart } from "@/components/EarningsChart";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import { NotificationButton } from "@/components/NotificationsPanel";
import { ProofUploadForm } from "@/components/ProofUploadForm";
import { VerificationBadge } from "@/components/VerificationBadge";
import { CreatorWallet } from "@/components/CreatorWallet";
import { GamificationProgress } from "@/components/GamificationProgress";
import { GamificationBadge } from "@/components/GamificationBadge";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { SwipeCampaignCards } from "@/components/SwipeCampaignCards";
import { AIPricingAssistant } from "@/components/AIPricingAssistant";
import { useProfile } from "@/hooks/useProfile";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  DollarSign, 
  TrendingUp, 
  Star, 
  Eye,
  Settings,
  Award,
  Target,
  Loader2,
  Upload,
  Wallet
} from "lucide-react";

type VerificationStatus = 'not_started' | 'proof_submitted' | 'under_review' | 'verified' | 'rejected';

export const CreatorDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCampaignForProof, setSelectedCampaignForProof] = useState<string | null>(null);
  const { profile, loading: profileLoading } = useProfile();
  const { campaigns, loading: campaignsLoading } = useCampaigns();
  const isMobile = useIsMobile();
  const { formatFromUSD } = useLocalizationContext();

  const activeCampaigns = campaigns.filter(c => c.status === 'active' || c.status === 'pending');
  const completedCampaigns = campaigns.filter(c => c.status === 'completed');
  
  const totalEarnings = completedCampaigns.reduce((sum, c) => sum + Number(c.price), 0);
  const monthlyEarnings = completedCampaigns
    .filter(c => {
      const completedDate = c.completed_at ? new Date(c.completed_at) : null;
      if (!completedDate) return false;
      const now = new Date();
      return completedDate.getMonth() === now.getMonth() && completedDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, c) => sum + Number(c.price), 0);

  if (profileLoading || campaignsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Painel do Criador</h1>
                <GamificationBadge badgeLevel={profile?.badge_level || 'bronze'} size="md" />
              </div>
              <p className="text-muted-foreground mt-1">Olá, {profile?.display_name || 'Criador'}! Gerencie suas campanhas e monitore seus ganhos</p>
            </div>
          </div>
          <div className="flex gap-2">
            <NotificationButton />
            <Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-2" />Configurações</Button>
          </div>
        </div>

        {/* Onboarding */}
        <OnboardingFlow
          profile={profile}
          role="creator"
          campaignCount={campaigns.length}
          onAction={(action) => {
            if (action === 'name' || action === 'niche' || action === 'avatar') setActiveTab('profile');
            if (action === 'first_campaign') setActiveTab('campaigns');
          }}
          onDismiss={() => {}}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricsCard title="Total Ganho" value={formatFromUSD(totalEarnings)} icon={DollarSign} variant="success" />
          <MetricsCard title="Este Mês" value={formatFromUSD(monthlyEarnings)} icon={TrendingUp} variant="primary" />
          <MetricsCard title="Campanhas Ativas" value={activeCampaigns.length} icon={Target} variant="warning" subtitle="Em andamento" />
          <MetricsCard title="Avaliação Média" value={profile?.rating || 0} icon={Star} variant="default" subtitle={`${profile?.total_reviews || 0} avaliações`} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
            <TabsTrigger value="wallet" className="flex items-center gap-1">
              <Wallet className="h-4 w-4" />
              Carteira
            </TabsTrigger>
            <TabsTrigger value="earnings">Ganhos</TabsTrigger>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Gamification Progress */}
              <GamificationProgress />
              
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" />Performance</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center"><span className="text-sm">Taxa de Conclusão</span><span className="font-semibold text-success">{completedCampaigns.length > 0 ? Math.round((completedCampaigns.length / campaigns.length) * 100) : 0}%</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm">Campanhas Concluídas</span><span className="font-semibold">{completedCampaigns.length}</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm">Visualizações do Perfil</span><span className="font-semibold">{profile?.total_campaigns || 0}</span></div>
                </CardContent>
              </Card>
            </div>

            {/* AI Pricing Assistant */}
            <AIPricingAssistant mode="creator" />

            <TrustIndicators />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">{t('dashboard.campaigns')}</h2>
              <Button><Eye className="h-4 w-4 mr-2" />Ver Disponíveis</Button>
            </div>
            
            {selectedCampaignForProof && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Enviar Comprovante
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ProofUploadForm 
                    campaignId={selectedCampaignForProof} 
                    onSuccess={() => setSelectedCampaignForProof(null)}
                  />
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setSelectedCampaignForProof(null)}
                  >
                    Cancelar
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {campaigns.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Você ainda não tem campanhas. Aguarde propostas de anunciantes!</p>
              </Card>
            ) : isMobile ? (
              <SwipeCampaignCards>
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{campaign.title}</h3>
                        <VerificationBadge status={(campaign.verification_status as VerificationStatus) || 'not_started'} />
                      </div>
                      <p className="text-sm text-muted-foreground">{campaign.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                         <span className="font-medium text-success">{formatFromUSD(Number(campaign.price))}</span>
                        <Badge variant={campaign.status === 'active' ? 'default' : campaign.status === 'completed' ? 'secondary' : 'outline'}>
                          {campaign.status === 'active' ? 'Ativa' : campaign.status === 'completed' ? 'Concluída' : 'Pendente'}
                        </Badge>
                      </div>
                      {campaign.status === 'active' && campaign.verification_status !== 'verified' && (
                        <Button size="sm" className="w-full" onClick={() => setSelectedCampaignForProof(campaign.id)}>
                          <Upload className="h-4 w-4 mr-2" />
                          Enviar Prova
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </SwipeCampaignCards>
            ) : (
              <div className="grid gap-4">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{campaign.title}</h3>
                          <VerificationBadge status={(campaign.verification_status as VerificationStatus) || 'not_started'} />
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
                        {campaign.status === 'active' && campaign.verification_status !== 'verified' && (
                          <Button size="sm" onClick={() => setSelectedCampaignForProof(campaign.id)}>
                            <Upload className="h-4 w-4 mr-2" />
                            Enviar Prova
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="wallet"><CreatorWallet /></TabsContent>

          <TabsContent value="earnings"><EarningsChart /></TabsContent>

          <TabsContent value="profile"><ProfileEditForm /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};