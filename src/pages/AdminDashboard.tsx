import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { AdminPaymentSettings } from "@/components/AdminPaymentSettings";
import { motion } from "framer-motion";
import {
  Users, Shield, TrendingUp, DollarSign, Eye, UserCheck, Settings,
  CreditCard, Search, ChevronRight, MessageSquare, FileText,
  AlertTriangle, CheckCircle, XCircle, Loader2, RefreshCw, Ban,
} from "lucide-react";

export const AdminDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({ totalUsers: 0, totalCreators: 0, totalAdvertisers: 0, totalCampaigns: 0, totalRevenue: 0, pendingDisputes: 0, totalTransactions: 0, totalInvoices: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterCampaignStatus, setFilterCampaignStatus] = useState("all");
  const { toast } = useToast();
  const { formatFromUSD } = useLocalizationContext();

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [rolesRes, campaignsRes, txRes, disputesRes, invoicesRes, withdrawalsRes] = await Promise.all([
        supabase.from("user_roles").select("user_id, role, created_at, profiles:user_id (display_name, is_verified, rating, niche, country, badge_level, total_campaigns)"),
        supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
        supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("disputes").select("*, campaigns:campaign_id (title)").order("created_at", { ascending: false }),
        supabase.from("chat_invoices").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).limit(100),
      ]);

      const roles = rolesRes.data || [];
      const camps = campaignsRes.data || [];
      const txs = txRes.data || [];
      const disps = disputesRes.data || [];
      const invs = invoicesRes.data || [];
      const wds = withdrawalsRes.data || [];

      setUsers(roles);
      setCampaigns(camps);
      setTransactions(txs);
      setDisputes(disps);
      setInvoices(invs);
      setWithdrawals(wds);

      setStats({
        totalUsers: roles.length,
        totalCreators: roles.filter((r: any) => r.role === "creator").length,
        totalAdvertisers: roles.filter((r: any) => r.role === "advertiser").length,
        totalCampaigns: camps.length,
        totalRevenue: camps.filter((c: any) => c.status === "completed").reduce((s: number, c: any) => s + Number(c.price || 0), 0),
        pendingDisputes: disps.filter((d: any) => d.status === "open").length,
        totalTransactions: txs.length,
        totalInvoices: invs.length,
      });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao carregar dados", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u: any) => {
    const matchesSearch = !searchQuery || u.profiles?.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const filteredCampaigns = campaigns.filter((c: any) => {
    return filterCampaignStatus === "all" || c.status === filterCampaignStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      active: { variant: "default", label: "Ativa" },
      pending: { variant: "secondary", label: "Pendente" },
      completed: { variant: "outline", label: "Concluída" },
      open: { variant: "destructive", label: "Aberta" },
      resolved: { variant: "default", label: "Resolvida" },
      paid: { variant: "default", label: "Pago" },
    };
    const cfg = map[status] || { variant: "outline" as const, label: status };
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background/80 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <motion.div {...fadeUp} className="flex flex-col md:flex-row justify-between items-start gap-3">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Painel de Administração</h1>
              <p className="text-sm text-muted-foreground">Controlo total da plataforma StatusAds</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
        </motion.div>

        {/* Alert for pending items */}
        {(stats.pendingDisputes > 0) && (
          <Alert className="border-warning/30 bg-warning/5">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription>
              <strong>{stats.pendingDisputes}</strong> disputa(s) aberta(s) aguardando resolução.
              <Button variant="link" className="p-0 ml-2 h-auto" onClick={() => setActiveTab("disputes")}>Ver disputas →</Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Stats */}
        <motion.div {...fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Usuários", value: stats.totalUsers, icon: Users, color: "text-primary" },
            { label: "Criadores", value: stats.totalCreators, icon: UserCheck, color: "text-success" },
            { label: "Anunciantes", value: stats.totalAdvertisers, icon: TrendingUp, color: "text-warning" },
            { label: "Receita Total", value: formatFromUSD(stats.totalRevenue), icon: DollarSign, color: "text-primary" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                  <s.icon className={`h-5 w-5 ${s.color} opacity-50`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Campanhas", value: stats.totalCampaigns, icon: Eye },
            { label: "Transações", value: stats.totalTransactions, icon: CreditCard },
            { label: "Faturas", value: stats.totalInvoices, icon: FileText },
            { label: "Disputas Abertas", value: stats.pendingDisputes, icon: AlertTriangle, alert: stats.pendingDisputes > 0 },
          ].map((s) => (
            <Card key={s.label} className={s.alert ? "border-destructive/30" : ""}>
              <CardContent className="p-3 flex items-center gap-3">
                <s.icon className={`h-4 w-4 ${s.alert ? "text-destructive" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-7">
              <TabsTrigger value="overview">📊 Resumo</TabsTrigger>
              <TabsTrigger value="users">👥 Usuários</TabsTrigger>
              <TabsTrigger value="campaigns">📋 Campanhas</TabsTrigger>
              <TabsTrigger value="transactions">💳 Transações</TabsTrigger>
              <TabsTrigger value="disputes">⚠️ Disputas</TabsTrigger>
              <TabsTrigger value="payments">⚙️ Pagamentos</TabsTrigger>
              <TabsTrigger value="settings">🔧 Sistema</TabsTrigger>
            </TabsList>
          </div>

          {/* === OVERVIEW === */}
          <TabsContent value="overview" className="space-y-5">
            <motion.div {...fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Usuários", icon: "👥", tab: "users", color: "bg-primary/10 text-primary" },
                { label: "Campanhas", icon: "📋", tab: "campaigns", color: "bg-success/10 text-success" },
                { label: "Transações", icon: "💳", tab: "transactions", color: "bg-warning/10 text-warning" },
                { label: "Disputas", icon: "⚠️", tab: "disputes", color: "bg-destructive/10 text-destructive" },
              ].map((a) => (
                <button key={a.tab} onClick={() => setActiveTab(a.tab)} className={`${a.color} rounded-xl p-4 flex items-center gap-3 hover:scale-[1.02] transition-transform text-left`}>
                  <span className="text-2xl">{a.icon}</span>
                  <div>
                    <p className="font-semibold text-sm">{a.label}</p>
                    <ChevronRight className="h-3 w-3 opacity-50 mt-0.5" />
                  </div>
                </button>
              ))}
            </motion.div>

            <div className="grid md:grid-cols-2 gap-5">
              {/* Recent campaigns */}
              <Card>
                <CardHeader><CardTitle className="text-base">Campanhas Recentes</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {campaigns.slice(0, 5).map((c: any) => (
                    <div key={c.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg text-sm">
                      <div>
                        <p className="font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{formatFromUSD(Number(c.price))}</p>
                      </div>
                      <StatusBadge status={c.status || "pending"} />
                    </div>
                  ))}
                  {campaigns.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sem campanhas</p>}
                </CardContent>
              </Card>

              {/* Recent transactions */}
              <Card>
                <CardHeader><CardTitle className="text-base">Últimas Transações</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {transactions.slice(0, 5).map((tx: any) => (
                    <div key={tx.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg text-sm">
                      <div>
                        <p className="font-medium">{tx.type}</p>
                        <p className="text-xs text-muted-foreground">{tx.description || "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-success">{formatFromUSD(Number(tx.amount))}</p>
                        <StatusBadge status={tx.status || "pending"} />
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sem transações</p>}
                </CardContent>
              </Card>
            </div>

            {/* Withdrawals */}
            <Card>
              <CardHeader><CardTitle className="text-base">Saques Pendentes</CardTitle></CardHeader>
              <CardContent>
                {withdrawals.filter((w: any) => w.status === "pending").length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum saque pendente</p>
                ) : (
                  <div className="space-y-2">
                    {withdrawals.filter((w: any) => w.status === "pending").map((w: any) => (
                      <div key={w.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{formatFromUSD(Number(w.amount))}</p>
                          <p className="text-xs text-muted-foreground">PIX: {w.pix_key || "—"}</p>
                        </div>
                        <Badge variant="secondary">Pendente</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* === USERS === */}
          <TabsContent value="users" className="space-y-5">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar usuários..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filtrar role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="creator">Criador</SelectItem>
                  <SelectItem value="advertiser">Anunciante</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-muted-foreground">{filteredUsers.length} usuários encontrados</p>

            <div className="space-y-2">
              {filteredUsers.map((user: any, i: number) => (
                <Card key={user.user_id + i} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
                        {(user.profiles?.display_name || "?").charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.profiles?.display_name || "Sem nome"}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant={user.role === "admin" ? "destructive" : user.role === "creator" ? "default" : "secondary"} className="text-[10px]">
                            {user.role}
                          </Badge>
                          {user.profiles?.is_verified && <Badge variant="outline" className="text-[10px] text-primary">✓ Verificado</Badge>}
                          {user.profiles?.country && <span className="text-[10px] text-muted-foreground">{user.profiles.country}</span>}
                          {user.profiles?.niche && <span className="text-[10px] text-muted-foreground">{user.profiles.niche}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {user.profiles?.rating > 0 && <span className="text-muted-foreground">⭐ {user.profiles.rating}</span>}
                      {user.profiles?.total_campaigns > 0 && <span className="text-muted-foreground text-xs">{user.profiles.total_campaigns} camp.</span>}
                      <Button variant="outline" size="sm"><Settings className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* === CAMPAIGNS === */}
          <TabsContent value="campaigns" className="space-y-5">
            <div className="flex gap-3">
              <Select value={filterCampaignStatus} onValueChange={setFilterCampaignStatus}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground self-center">{filteredCampaigns.length} campanhas</p>
            </div>

            <div className="space-y-2">
              {filteredCampaigns.map((c: any) => (
                <Card key={c.id} className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{c.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{c.description || "—"}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>💰 {formatFromUSD(Number(c.price))}</span>
                        <span>📅 {new Date(c.created_at).toLocaleDateString()}</span>
                        {c.escrow_status && <span>🔒 Escrow: {c.escrow_status}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={c.status || "pending"} />
                    </div>
                  </div>
                </Card>
              ))}
              {filteredCampaigns.length === 0 && (
                <Card className="p-8 text-center"><p className="text-muted-foreground">Sem campanhas</p></Card>
              )}
            </div>
          </TabsContent>

          {/* === TRANSACTIONS === */}
          <TabsContent value="transactions" className="space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Todas as Transações
            </h2>
            <div className="space-y-2">
              {transactions.map((tx: any) => (
                <Card key={tx.id} className="p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{tx.type}</p>
                      <p className="text-xs text-muted-foreground">{tx.description || "—"}</p>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Taxa: {formatFromUSD(Number(tx.platform_fee || 0))}</span>
                        <span>Líquido: {formatFromUSD(Number(tx.net_amount || 0))}</span>
                        <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">{formatFromUSD(Number(tx.amount))}</p>
                      <StatusBadge status={tx.status || "pending"} />
                    </div>
                  </div>
                </Card>
              ))}
              {transactions.length === 0 && (
                <Card className="p-8 text-center"><p className="text-muted-foreground">Sem transações</p></Card>
              )}
            </div>

            {/* Invoices section */}
            <h3 className="text-base font-semibold flex items-center gap-2 pt-4">
              <FileText className="h-4 w-4 text-primary" /> Faturas ({invoices.length})
            </h3>
            <div className="space-y-2">
              {invoices.slice(0, 20).map((inv: any) => (
                <Card key={inv.id} className="p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">#{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{inv.currency} {Number(inv.total).toFixed(2)}</p>
                      <StatusBadge status={inv.status || "pending"} />
                    </div>
                  </div>
                </Card>
              ))}
              {invoices.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sem faturas</p>}
            </div>

            {/* Withdrawals */}
            <h3 className="text-base font-semibold flex items-center gap-2 pt-4">
              💸 Saques ({withdrawals.length})
            </h3>
            <div className="space-y-2">
              {withdrawals.map((w: any) => (
                <Card key={w.id} className="p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{formatFromUSD(Number(w.amount))}</p>
                      <p className="text-xs text-muted-foreground">PIX: {w.pix_key || "—"} • {new Date(w.created_at).toLocaleDateString()}</p>
                    </div>
                    <StatusBadge status={w.status || "pending"} />
                  </div>
                </Card>
              ))}
              {withdrawals.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sem saques</p>}
            </div>
          </TabsContent>

          {/* === DISPUTES === */}
          <TabsContent value="disputes" className="space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" /> Gestão de Disputas
            </h2>
            {disputes.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma disputa registada 🎉</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {disputes.map((d: any) => (
                  <Card key={d.id} className={`p-4 ${d.status === "open" ? "border-destructive/30" : ""}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {d.status === "open" ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-success" />}
                          <p className="font-semibold text-sm">{d.reason}</p>
                          <StatusBadge status={d.status || "open"} />
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{d.description || "Sem descrição"}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Campanha: {(d.campaigns as any)?.title || "—"}</span>
                          <span>{new Date(d.created_at).toLocaleDateString()}</span>
                        </div>
                        {d.resolution && (
                          <div className="mt-2 p-2 bg-success/10 rounded-lg text-xs">
                            <strong>Resolução:</strong> {d.resolution}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* === PAYMENTS === */}
          <TabsContent value="payments">
            <AdminPaymentSettings />
          </TabsContent>

          {/* === SETTINGS === */}
          <TabsContent value="settings" className="space-y-5">
            <Card>
              <CardHeader><CardTitle className="text-base">Configurações da Plataforma</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="font-medium text-sm mb-1">Comissão da Plataforma</p>
                    <p className="text-2xl font-bold text-primary">18%</p>
                    <p className="text-xs text-muted-foreground">por transação concluída</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="font-medium text-sm mb-1">CPV Base</p>
                    <p className="text-2xl font-bold text-primary">$0.65</p>
                    <p className="text-xs text-muted-foreground">custo por visualização</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="font-medium text-sm mb-1">Saque Mínimo</p>
                    <p className="text-2xl font-bold text-primary">$50</p>
                    <p className="text-xs text-muted-foreground">valor mínimo para saque</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="font-medium text-sm mb-1">Ads por Dia (Criador)</p>
                    <p className="text-2xl font-bold text-primary">3</p>
                    <p className="text-xs text-muted-foreground">limite máximo de anúncios/dia</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="font-medium text-sm mb-1">Sponsor Ad Mensal</p>
                    <p className="text-2xl font-bold text-primary">$50/mês</p>
                    <p className="text-xs text-muted-foreground">custo de anúncio na homepage</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="font-medium text-sm mb-1">Processamento de Saques</p>
                    <p className="text-2xl font-bold text-primary">Semanal</p>
                    <p className="text-xs text-muted-foreground">às segundas-feiras</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Resumo do Sistema</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Idiomas:</span> PT, EN, FR</div>
                  <div><span className="text-muted-foreground">Moeda base:</span> USD</div>
                  <div><span className="text-muted-foreground">Gateways:</span> Stripe, PayPal, PaySuite</div>
                  <div><span className="text-muted-foreground">Storage:</span> 3 buckets</div>
                  <div><span className="text-muted-foreground">Auth:</span> Email, Google, Apple</div>
                  <div><span className="text-muted-foreground">AI:</span> StatusAI (Gemini)</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
