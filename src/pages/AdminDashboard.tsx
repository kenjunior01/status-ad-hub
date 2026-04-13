import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { AdminPaymentSettings } from "@/components/AdminPaymentSettings";
import { AdminOfflinePayments } from "@/components/AdminOfflinePayments";
import { motion } from "framer-motion";
import {
  Users, Shield, TrendingUp, DollarSign, Eye, UserCheck, Settings,
  CreditCard, Search, ChevronRight, MessageSquare, FileText,
  AlertTriangle, CheckCircle, XCircle, Loader2, RefreshCw, Ban,
  UserPlus, Activity, BarChart3, Wallet, Globe,
} from "lucide-react";

export const AdminDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({ totalUsers: 0, totalCreators: 0, totalAdvertisers: 0, totalCampaigns: 0, totalRevenue: 0, pendingDisputes: 0, totalTransactions: 0, totalInvoices: 0, totalReferrals: 0, totalMessages: 0, pendingWithdrawals: 0, activeCampaigns: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [recentProfiles, setRecentProfiles] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
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
      const [rolesRes, campaignsRes, txRes, disputesRes, invoicesRes, withdrawalsRes, profilesRes, referralsRes, convsRes] = await Promise.all([
        supabase.from("user_roles").select("user_id, role, created_at, profiles:user_id (display_name, is_verified, rating, niche, country, badge_level, total_campaigns, account_status, referral_points, created_at)"),
        supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
        supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("disputes").select("*, campaigns:campaign_id (title)").order("created_at", { ascending: false }),
        supabase.from("chat_invoices").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("profiles").select("display_name, country, created_at, niche, account_status, user_id, avatar_url").order("created_at", { ascending: false }).limit(10),
        supabase.from("referrals").select("*", { count: 'exact', head: true }),
        supabase.from("conversations").select("*").order("last_message_at", { ascending: false }).limit(50),
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
      setRecentProfiles(profilesRes.data || []);
      setConversations(convsRes.data || []);

      setStats({
        totalUsers: roles.length,
        totalCreators: roles.filter((r: any) => r.role === "creator").length,
        totalAdvertisers: roles.filter((r: any) => r.role === "advertiser").length,
        totalCampaigns: camps.length,
        activeCampaigns: camps.filter((c: any) => c.status === "active").length,
        totalRevenue: camps.filter((c: any) => c.status === "completed").reduce((s: number, c: any) => s + Number(c.price || 0), 0),
        pendingDisputes: disps.filter((d: any) => d.status === "open").length,
        totalTransactions: txs.length,
        totalInvoices: invs.length,
        totalReferrals: referralsRes.count || 0,
        totalMessages: convsRes.data?.length || 0,
        pendingWithdrawals: wds.filter((w: any) => w.status === "pending").length,
      });
    } catch (error) {
      console.error(error);
      toast({ title: t("common.error"), description: t("admin.loadError"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId: string, action: 'activate' | 'suspend') => {
    try {
      const newStatus = action === 'activate' ? 'active' : 'suspended';
      const { error } = await supabase.from('profiles').update({ account_status: newStatus }).eq('user_id', userId);
      if (error) throw error;
      toast({ title: action === 'activate' ? "✅ Conta activada" : "⛔ Conta suspensa" });
      fetchAll();
    } catch {
      toast({ title: "Erro", variant: "destructive" });
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
      active: { variant: "default", label: t("admin.statusActive") },
      pending: { variant: "secondary", label: t("admin.statusPending") },
      completed: { variant: "outline", label: t("admin.statusCompleted") },
      open: { variant: "destructive", label: t("admin.statusOpen") },
      resolved: { variant: "default", label: t("admin.statusResolved") },
      paid: { variant: "default", label: t("admin.statusPaid") },
      suspended: { variant: "destructive", label: "Suspenso" },
    };
    const cfg = map[status] || { variant: "outline" as const, label: status };
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  // Mobile nav tabs for admin
  const navTabs = [
    { key: "overview", icon: BarChart3, label: "Resumo" },
    { key: "users", icon: Users, label: "Utilizadores" },
    { key: "campaigns", icon: Eye, label: "Campanhas" },
    { key: "messages", icon: MessageSquare, label: "Mensagens" },
    { key: "transactions", icon: CreditCard, label: "Financeiro" },
    { key: "disputes", icon: AlertTriangle, label: "Disputas" },
    { key: "settings", icon: Settings, label: "Sistema" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      {/* Header */}
      <div className="bg-card border-b border-border/30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-base md:text-xl font-bold text-foreground">Admin</h1>
              <p className="text-[10px] text-muted-foreground hidden md:block">Painel de controlo em tempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats.pendingDisputes > 0 && (
              <button onClick={() => setActiveTab("disputes")} className="bg-destructive/10 text-destructive text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {stats.pendingDisputes}
              </button>
            )}
            <Button variant="ghost" size="sm" onClick={fetchAll} className="h-8 w-8 p-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation — horizontal scroll */}
      <div className="bg-card border-b border-border/20 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 space-y-4">

        {/* ═══ OVERVIEW ═══ */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Primary Stats */}
            <motion.div {...fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: "Utilizadores", value: stats.totalUsers, icon: Users, color: "text-primary" },
                { label: "Criadores", value: stats.totalCreators, icon: UserCheck, color: "text-emerald-500" },
                { label: "Anunciantes", value: stats.totalAdvertisers, icon: TrendingUp, color: "text-amber-500" },
                { label: "Receita Total", value: formatFromUSD(stats.totalRevenue), icon: DollarSign, color: "text-primary" },
              ].map((s) => (
                <Card key={s.label} className="border-border/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg bg-muted/50`}>
                        <s.icon className={`h-4 w-4 ${s.color}`} />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                        <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {[
                { label: "Campanhas", value: stats.totalCampaigns, icon: Eye },
                { label: "Activas", value: stats.activeCampaigns, icon: Activity },
                { label: "Transacções", value: stats.totalTransactions, icon: CreditCard },
                { label: "Conversas", value: stats.totalMessages, icon: MessageSquare },
                { label: "Convites", value: stats.totalReferrals, icon: UserPlus },
                { label: "Saques Pend.", value: stats.pendingWithdrawals, icon: Wallet, alert: stats.pendingWithdrawals > 0 },
              ].map((s) => (
                <button key={s.label} onClick={() => {
                  if (s.label === "Conversas") setActiveTab("messages");
                  else if (s.label === "Transacções" || s.label === "Saques Pend.") setActiveTab("transactions");
                  else if (s.label.includes("Campanha") || s.label === "Activas") setActiveTab("campaigns");
                }} className={`p-2 rounded-xl border text-left transition-colors hover:bg-muted/50 ${s.alert ? 'border-destructive/30 bg-destructive/5' : 'border-border/30'}`}>
                  <s.icon className={`h-3 w-3 mb-1 ${s.alert ? 'text-destructive' : 'text-muted-foreground'}`} />
                  <p className="font-bold text-sm">{s.value}</p>
                  <p className="text-[9px] text-muted-foreground">{s.label}</p>
                </button>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-border/30">
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Registos Recentes</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-1.5">
                  {recentProfiles.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Sem registos</p>
                  ) : recentProfiles.slice(0, 5).map((p: any, i: number) => (
                    <div key={p.user_id + i} className="flex justify-between items-center p-2 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-[10px]">
                          {(p.display_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-xs">{p.display_name || "Sem nome"}</p>
                          <p className="text-[9px] text-muted-foreground">{p.country} • {p.niche || "—"}</p>
                        </div>
                      </div>
                      <span className="text-[9px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/30">
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> Campanhas Recentes</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-1.5">
                  {campaigns.slice(0, 5).map((c: any) => (
                    <div key={c.id} className="flex justify-between items-center p-2 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium text-xs">{c.title}</p>
                        <p className="text-[9px] text-muted-foreground">{formatFromUSD(Number(c.price))}</p>
                      </div>
                      <StatusBadge status={c.status || "pending"} />
                    </div>
                  ))}
                  {campaigns.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Sem campanhas</p>}
                </CardContent>
              </Card>
            </div>

            {/* Withdrawals + Transactions preview */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-border/30">
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-sm flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Últimas Transacções</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-1.5">
                  {transactions.slice(0, 4).map((tx: any) => (
                    <div key={tx.id} className="flex justify-between items-center p-2 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium text-xs">{tx.type}</p>
                        <p className="text-[9px] text-muted-foreground">{tx.description || "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-xs text-emerald-500">{formatFromUSD(Number(tx.amount))}</p>
                        <StatusBadge status={tx.status || "pending"} />
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Sem transacções</p>}
                </CardContent>
              </Card>

              <Card className="border-border/30">
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Saques Pendentes</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-1.5">
                  {withdrawals.filter((w: any) => w.status === "pending").length === 0 ? (
                    <div className="flex flex-col items-center py-4">
                      <CheckCircle className="h-8 w-8 text-emerald-500 mb-2" />
                      <p className="text-xs text-muted-foreground">Nenhum saque pendente</p>
                    </div>
                  ) : (
                    withdrawals.filter((w: any) => w.status === "pending").slice(0, 4).map((w: any) => (
                      <div key={w.id} className="flex justify-between items-center p-2 border rounded-lg border-border/30">
                        <div>
                          <p className="font-medium text-xs">{formatFromUSD(Number(w.amount))}</p>
                          <p className="text-[9px] text-muted-foreground">PIX: {w.pix_key || "—"}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">Pendente</Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ═══ USERS ═══ */}
        {activeTab === "users" && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Pesquisar utilizadores..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-9" />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full sm:w-[140px] h-9"><SelectValue placeholder="Papel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="creator">Criador</SelectItem>
                  <SelectItem value="advertiser">Anunciante</SelectItem>
                  <SelectItem value="user">Utilizador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">{filteredUsers.length} utilizadores encontrados</p>

            <div className="space-y-1.5">
              {filteredUsers.map((user: any, i: number) => (
                <Card key={user.user_id + i} className="p-3 border-border/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-sm">
                        {(user.profiles?.display_name || "?").charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-xs">{user.profiles?.display_name || "Sem nome"}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <Badge variant={user.role === "admin" ? "destructive" : user.role === "creator" ? "default" : "secondary"} className="text-[9px] px-1.5 py-0">
                            {user.role}
                          </Badge>
                          {user.profiles?.is_verified && <Badge variant="outline" className="text-[9px] px-1 py-0 text-primary">✓</Badge>}
                          {user.profiles?.country && <span className="text-[9px] text-muted-foreground">{user.profiles.country}</span>}
                          {user.profiles?.niche && <span className="text-[9px] text-muted-foreground">• {user.profiles.niche}</span>}
                          {user.profiles?.account_status === 'suspended' && <StatusBadge status="suspended" />}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {user.profiles?.rating > 0 && <span className="text-[10px] text-muted-foreground">⭐{user.profiles.rating}</span>}
                      {user.profiles?.account_status === 'active' ? (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleUserAction(user.user_id, 'suspend')}>
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-500 hover:bg-emerald-500/10" onClick={() => handleUserAction(user.user_id, 'activate')}>
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ═══ CAMPAIGNS ═══ */}
        {activeTab === "campaigns" && (
          <div className="space-y-3">
            <div className="flex gap-2 items-center">
              <Select value={filterCampaignStatus} onValueChange={setFilterCampaignStatus}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{filteredCampaigns.length} campanhas</p>
            </div>

            <div className="space-y-1.5">
              {filteredCampaigns.map((c: any) => (
                <Card key={c.id} className="p-3 border-border/30">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">{c.title}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{c.description || "—"}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span>💰 {formatFromUSD(Number(c.price))}</span>
                        <span>📅 {new Date(c.created_at).toLocaleDateString()}</span>
                        {c.escrow_status && c.escrow_status !== 'pending' && <span>🔒 {c.escrow_status}</span>}
                      </div>
                    </div>
                    <StatusBadge status={c.status || "pending"} />
                  </div>
                </Card>
              ))}
              {filteredCampaigns.length === 0 && (
                <Card className="p-8 text-center border-border/30"><p className="text-xs text-muted-foreground">Sem campanhas</p></Card>
              )}
            </div>
          </div>
        )}

        {/* ═══ MESSAGES ═══ */}
        {activeTab === "messages" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" /> Conversas da Plataforma
              </h2>
              <Badge variant="outline" className="text-[10px]">{conversations.length} conversas</Badge>
            </div>

            {conversations.length === 0 ? (
              <Card className="p-8 text-center border-border/30">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Nenhuma conversa registada</p>
              </Card>
            ) : (
              <div className="space-y-1.5">
                {conversations.map((conv: any) => (
                  <Card key={conv.id} className="p-3 border-border/30">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-xs">Conversa #{conv.id.slice(0, 8)}</p>
                          <p className="text-[9px] text-muted-foreground">
                            {conv.campaign_id ? "Campanha vinculada" : "Conversa directa"} • {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString() : "—"}
                          </p>
                        </div>
                      </div>
                      <Badge variant={conv.campaign_id ? "default" : "secondary"} className="text-[9px]">
                        {conv.campaign_id ? "Negócio" : "Directa"}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ TRANSACTIONS ═══ */}
        {activeTab === "transactions" && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> Financeiro
            </h2>

            <div className="space-y-1.5">
              {transactions.map((tx: any) => (
                <Card key={tx.id} className="p-3 border-border/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-xs">{tx.type}</p>
                      <p className="text-[9px] text-muted-foreground">{tx.description || "—"}</p>
                      <div className="flex gap-2 mt-0.5 text-[9px] text-muted-foreground">
                        <span>Taxa: {formatFromUSD(Number(tx.platform_fee || 0))}</span>
                        <span>Líq: {formatFromUSD(Number(tx.net_amount || 0))}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xs text-emerald-500">{formatFromUSD(Number(tx.amount))}</p>
                      <StatusBadge status={tx.status || "pending"} />
                    </div>
                  </div>
                </Card>
              ))}
              {transactions.length === 0 && (
                <Card className="p-8 text-center border-border/30"><p className="text-xs text-muted-foreground">Sem transacções</p></Card>
              )}
            </div>

            {/* Invoices */}
            <h3 className="text-sm font-semibold flex items-center gap-2 pt-2">
              <FileText className="h-4 w-4 text-primary" /> Facturas ({invoices.length})
            </h3>
            <div className="space-y-1.5">
              {invoices.slice(0, 20).map((inv: any) => (
                <Card key={inv.id} className="p-3 border-border/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-xs">#{inv.invoice_number}</p>
                      <p className="text-[9px] text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xs">{inv.currency} {Number(inv.total).toFixed(2)}</p>
                      <StatusBadge status={inv.status || "pending"} />
                    </div>
                  </div>
                </Card>
              ))}
              {invoices.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Sem facturas</p>}
            </div>

            {/* Withdrawals */}
            <h3 className="text-sm font-semibold flex items-center gap-2 pt-2">
              💸 Saques ({withdrawals.length})
            </h3>
            <div className="space-y-1.5">
              {withdrawals.map((w: any) => (
                <Card key={w.id} className="p-3 border-border/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-xs">{formatFromUSD(Number(w.amount))}</p>
                      <p className="text-[9px] text-muted-foreground">PIX: {w.pix_key || "—"} • {new Date(w.created_at).toLocaleDateString()}</p>
                    </div>
                    <StatusBadge status={w.status || "pending"} />
                  </div>
                </Card>
              ))}
              {withdrawals.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Sem saques</p>}
            </div>

            {/* Offline Payments */}
            <AdminOfflinePayments />
          </div>
        )}

        {/* ═══ DISPUTES ═══ */}
        {activeTab === "disputes" && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Gestão de Disputas
            </h2>
            {disputes.length === 0 ? (
              <Card className="p-8 text-center border-border/30">
                <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Nenhuma disputa registada 🎉</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {disputes.map((d: any) => (
                  <Card key={d.id} className={`p-3 border-border/30 ${d.status === "open" ? "border-destructive/30" : ""}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {d.status === "open" ? <XCircle className="h-3.5 w-3.5 text-destructive" /> : <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
                          <p className="font-semibold text-xs">{d.reason}</p>
                          <StatusBadge status={d.status || "open"} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-1">{d.description || "Sem descrição"}</p>
                        <div className="flex gap-2 text-[9px] text-muted-foreground">
                          <span>Campanha: {(d.campaigns as any)?.title || "—"}</span>
                          <span>{new Date(d.created_at).toLocaleDateString()}</span>
                        </div>
                        {d.resolution && (
                          <div className="mt-2 p-2 bg-emerald-500/10 rounded-lg text-[10px]">
                            <strong>Resolução:</strong> {d.resolution}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ SETTINGS ═══ */}
        {activeTab === "settings" && (
          <div className="space-y-4">
            <Card className="border-border/30">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-sm">⚙️ Configurações da Plataforma</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 border rounded-lg border-border/30 text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">Comissão</p>
                    <p className="text-lg font-bold text-primary">18%</p>
                  </div>
                  <div className="p-3 border rounded-lg border-border/30 text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">CPV Base</p>
                    <p className="text-lg font-bold text-primary">0.70</p>
                    <p className="text-[9px] text-muted-foreground">MZN</p>
                  </div>
                  <div className="p-3 border rounded-lg border-border/30 text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">Anúncios/Dia</p>
                    <p className="text-lg font-bold text-primary">3</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <AdminPaymentSettings />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;