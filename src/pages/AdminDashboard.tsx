import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { AdminPaymentSettings } from "@/components/AdminPaymentSettings";
import { Users, Shield, TrendingUp, DollarSign, Eye, UserCheck, Settings, CreditCard } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCreators: 0,
    totalAdvertisers: 0,
    totalCampaigns: 0,
    totalRevenue: 0,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { formatFromUSD } = useLocalizationContext();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          created_at,
          profiles:user_id (display_name, is_verified, rating)
        `);

      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('*');

      if (rolesData) {
        const creators = rolesData.filter(r => r.role === 'creator').length;
        const advertisers = rolesData.filter(r => r.role === 'advertiser').length;
        
        setStats({
          totalUsers: rolesData.length,
          totalCreators: creators,
          totalAdvertisers: advertisers,
          totalCampaigns: campaignsData?.length || 0,
          totalRevenue: campaignsData?.reduce((sum, c) => sum + (c.price || 0), 0) || 0,
        });

        setUsers(rolesData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({ title: "Erro", description: "Falha ao carregar dados do dashboard", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Painel de Administração</h1>
          </div>
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Bem-vindo ao painel administrativo. Você tem controle total sobre a plataforma.
            </AlertDescription>
          </Alert>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">usuários registrados</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Criadores</CardTitle>
              <UserCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalCreators}</div>
              <p className="text-xs text-muted-foreground">criadores ativos</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Anunciantes</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalAdvertisers}</div>
              <p className="text-xs text-muted-foreground">anunciantes ativos</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Campanhas</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
              <p className="text-xs text-muted-foreground">campanhas criadas</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatFromUSD(stats.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">receita total</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="creators">Criadores</TabsTrigger>
            <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> Pagamentos
            </TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Usuários</CardTitle>
                <CardDescription>Visualize e gerencie todos os usuários da plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user, index) => (
                    <div key={user.user_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                          {(user.profiles?.display_name || `User ${index + 1}`).charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{user.profiles?.display_name || `User ${index + 1}`}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              user.role === 'admin' ? 'destructive' :
                              user.role === 'creator' ? 'default' :
                              user.role === 'advertiser' ? 'secondary' : 'outline'
                            }>
                              {user.role}
                            </Badge>
                            {user.profiles?.is_verified && (
                              <Badge variant="outline" className="text-primary">Verificado</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.profiles?.rating && (
                          <div className="text-sm text-muted-foreground">⭐ {user.profiles.rating}</div>
                        )}
                        <Button variant="outline" size="sm"><Settings className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="creators">
            <Card>
              <CardHeader><CardTitle>Gerenciar Criadores</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground">Funcionalidade de gerenciamento de criadores será implementada aqui.</p></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns">
            <Card>
              <CardHeader><CardTitle>Gerenciar Campanhas</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground">Funcionalidade de gerenciamento de campanhas será implementada aqui.</p></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <AdminPaymentSettings />
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader><CardTitle>Configurações do Sistema</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground">Configurações globais da plataforma serão implementadas aqui.</p></CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
