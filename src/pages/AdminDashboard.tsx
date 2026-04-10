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
import { AdminOfflinePayments } from "@/components/AdminOfflinePayments";
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
      toast({ title: t("common.error"), description: t("admin.loadError"), variant: "destructive" });
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
      active: { variant: "default", label: t("admin.statusActive") },
      pending: { variant: "secondary", label: t("admin.statusPending") },
      completed: { variant: "outline", label: t("admin.statusCompleted") },
      open: { variant: "destructive", label: t("admin.statusOpen") },
      resolved: { variant: "default", label: t("admin.statusResolved") },
      paid: { variant: "default", label: t("admin.statusPaid") },
    };
    const cfg = map[status] || { variant: "outline" as const, label: status };
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  const greetings = [
    t("admin.greeting1", "Cada decisão sua impacta milhares de vidas. Continue fazendo a diferença! 🚀"),
    t("admin.greeting2", "Liderar é servir. A plataforma cresce porque você cuida dela. 💪"),
    t("admin.greeting3", "O sucesso da comunidade é o seu sucesso. Obrigado por estar aqui! 🌟"),
    t("admin.greeting4", "Grandes plataformas começam com grandes administradores. Você é um deles! ⭐"),
  ];
  const dailyGreeting = greetings[new Date().getDay() % greetings.length];

  return (
    <div className="min-h-screen bg-background/80 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <motion.div {...fadeUp} className="flex flex-col md:flex-row justify-between items-start gap-3">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("common.hello")}, Admin 👋</h1>
              <p className="text-sm text-muted-foreground italic">{dailyGreeting}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-2">
            <RefreshCw className="h-4 w-4" /> {t("admin.refresh")}
          </Button>
        </motion.div>

        {(stats.pendingDisputes > 0) && (
          <Alert className="border-warning/30 bg-warning/5">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription>
              <strong>{stats.pendingDisputes}</strong> {t("admin.disputesPending")}
              <Button variant="link" className="p-0 ml-2 h-auto" onClick={() => setActiveTab("disputes")}>{t("admin.viewDisputes")} →</Button>
            </AlertDescription>
          </Alert>
        )}

        <motion.div {...fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t("admin.users"), value: stats.totalUsers, icon: Users, color: "text-primary" },
            { label: t("admin.creators"), value: stats.totalCreators, icon: UserCheck, color: "text-success" },
            { label: t("admin.advertisers"), value: stats.totalAdvertisers, icon: TrendingUp, color: "text-warning" },
            { label: t("admin.totalRevenue"), value: formatFromUSD(stats.totalRevenue), icon: DollarSign, color: "text-primary" },
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t("admin.campaigns"), value: stats.totalCampaigns, icon: Eye },
            { label: t("admin.transactions"), value: stats.totalTransactions, icon: CreditCard },
            { label: t("admin.invoices"), value: stats.totalInvoices, icon: FileText },
            { label: t("admin.openDisputes"), value: stats.pendingDisputes, icon: AlertTriangle, alert: stats.pendingDisputes > 0 },
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-8">
              <TabsTrigger value="overview">📊 {t("admin.summary")}</TabsTrigger>
              <TabsTrigger value="users">👥 {t("admin.users")}</TabsTrigger>
              <TabsTrigger value="campaigns">📋 {t("admin.campaigns")}</TabsTrigger>
              <TabsTrigger value="transactions">💳 {t("admin.transactions")}</TabsTrigger>
              <TabsTrigger value="offline">📄 {t("admin.offlinePayments")}</TabsTrigger>
              <TabsTrigger value="disputes">⚠️ {t("admin.disputes")}</TabsTrigger>
              <TabsTrigger value="payments">⚙️ {t("admin.payments")}</TabsTrigger>
              <TabsTrigger value="settings">🔧 {t("admin.system")}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-5">
            <motion.div {...fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: t("admin.users"), icon: "👥", tab: "users", color: "bg-primary/10 text-primary" },
                { label: t("admin.campaigns"), icon: "📋", tab: "campaigns", color: "bg-success/10 text-success" },
                { label: t("admin.transactions"), icon: "💳", tab: "transactions", color: "bg-warning/10 text-warning" },
                { label: t("admin.disputes"), icon: "⚠️", tab: "disputes", color: "bg-destructive/10 text-destructive" },
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
              <Card>
                <CardHeader><CardTitle className="text-base">{t("admin.recentCampaigns")}</CardTitle></CardHeader>
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
                  {campaigns.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t("admin.noCampaigns")}</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">{t("admin.lastTransactions")}</CardTitle></CardHeader>
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
                  {transactions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t("admin.noTransactions")}</p>}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">{t("admin.pendingWithdrawals")}</CardTitle></CardHeader>
              <CardContent>
                {withdrawals.filter((w: any) => w.status === "pending").length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{t("admin.noPendingWithdrawals")}</p>
                ) : (
                  <div className="space-y-2">
                    {withdrawals.filter((w: any) => w.status === "pending").map((w: any) => (
                      <div key={w.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{formatFromUSD(Number(w.amount))}</p>
                          <p className="text-xs text-muted-foreground">PIX: {w.pix_key || "—"}</p>
                        </div>
                        <Badge variant="secondary">{t("admin.statusPending")}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-5">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t("admin.searchUsers")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder={t("admin.filterRole")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.allRoles")}</SelectItem>
                  <SelectItem value="admin">{t("admin.admin")}</SelectItem>
                  <SelectItem value="creator">{t("admin.creator")}</SelectItem>
                  <SelectItem value="advertiser">{t("admin.advertiser")}</SelectItem>
                  <SelectItem value="user">{t("admin.user")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-muted-foreground">{filteredUsers.length} {t("admin.usersFound")}</p>

            <div className="space-y-2">
              {filteredUsers.map((user: any, i: number) => (
                <Card key={user.user_id + i} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
                        {(user.profiles?.display_name || "?").charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.profiles?.display_name || t("admin.noName")}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant={user.role === "admin" ? "destructive" : user.role === "creator" ? "default" : "secondary"} className="text-[10px]">
                            {user.role}
                          </Badge>
                          {user.profiles?.is_verified && <Badge variant="outline" className="text-[10px] text-primary">✓ {t("admin.verified")}</Badge>}
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

          <TabsContent value="campaigns" className="space-y-5">
            <div className="flex gap-3">
              <Select value={filterCampaignStatus} onValueChange={setFilterCampaignStatus}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.allRoles")}</SelectItem>
                  <SelectItem value="pending">{t("admin.statusPending")}</SelectItem>
                  <SelectItem value="active">{t("admin.statusActive")}</SelectItem>
                  <SelectItem value="completed">{t("admin.statusCompleted")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground self-center">{filteredCampaigns.length} {t("admin.campaigns").toLowerCase()}</p>
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
                    <StatusBadge status={c.status || "pending"} />
                  </div>
                </Card>
              ))}
              {filteredCampaigns.length === 0 && (
                <Card className="p-8 text-center"><p className="text-muted-foreground">{t("admin.noCampaigns")}</p></Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> {t("admin.allTransactions")}
            </h2>
            <div className="space-y-2">
              {transactions.map((tx: any) => (
                <Card key={tx.id} className="p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{tx.type}</p>
                      <p className="text-xs text-muted-foreground">{tx.description || "—"}</p>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{t("admin.fee")}: {formatFromUSD(Number(tx.platform_fee || 0))}</span>
                        <span>{t("admin.net")}: {formatFromUSD(Number(tx.net_amount || 0))}</span>
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
                <Card className="p-8 text-center"><p className="text-muted-foreground">{t("admin.noTransactions")}</p></Card>
              )}
            </div>

            <h3 className="text-base font-semibold flex items-center gap-2 pt-4">
              <FileText className="h-4 w-4 text-primary" /> {t("admin.invoices")} ({invoices.length})
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
              {invoices.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t("admin.noInvoices")}</p>}
            </div>

            <h3 className="text-base font-semibold flex items-center gap-2 pt-4">
              💸 {t("admin.withdrawals")} ({withdrawals.length})
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
              {withdrawals.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t("admin.noWithdrawals")}</p>}
            </div>
          </TabsContent>

          <TabsContent value="disputes" className="space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" /> {t("admin.disputeManagement")}
            </h2>
            {disputes.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
                <p className="text-muted-foreground">{t("admin.noDisputes")}</p>
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
                        <p className="text-xs text-muted-foreground mb-1">{d.description || t("admin.noDescription")}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>{t("admin.campaign")}: {(d.campaigns as any)?.title || "—"}</span>
                          <span>{new Date(d.created_at).toLocaleDateString()}</span>
                        </div>
                        {d.resolution && (
                          <div className="mt-2 p-2 bg-success/10 rounded-lg text-xs">
                            <strong>{t("admin.resolution")}:</strong> {d.resolution}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="offline">
            <AdminOfflinePayments />
          </TabsContent>

          <TabsContent value="payments">
            <AdminPaymentSettings />
          </TabsContent>

          <TabsContent value="settings" className="space-y-5">
            <Card>
              <CardHeader><CardTitle className="text-base">⚙️ {t("admin.platformSettings")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="font-medium text-sm mb-1">{t("admin.platformCommission")}</p>
                    <p className="text-2xl font-bold text-primary">18%</p>
                    <p className="text-xs text-muted-foreground">{t("admin.perTransaction")}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="font-medium text-sm mb-1">{t("admin.baseCPV")}</p>
                    <p className="text-2xl font-bold text-primary">0.70 MZN</p>
                    <p className="text-xs text-muted-foreground">≈ $0.011 USD {t("admin.costPerView")}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="font-medium text-sm mb-1">{t("admin.adsPerDay")}</p>
                    <p className="text-2xl font-bold text-primary">3</p>
                    <p className="text-xs text-muted-foreground">{t("admin.maxAdsPerDay")}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="font-medium text-sm mb-1">{t("admin.sponsorAd")}</p>
                    <p className="text-2xl font-bold text-primary">$50/mês</p>
                    <p className="text-xs text-muted-foreground">{t("admin.homepageAd")}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="font-medium text-sm mb-1">Preço para definir preço próprio</p>
                    <p className="text-2xl font-bold text-primary">$5</p>
                    <p className="text-xs text-muted-foreground">Equivalente em moeda local</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="font-medium text-sm mb-1">Publicação em destaque</p>
                    <p className="text-2xl font-bold text-primary">$2/dia</p>
                    <p className="text-xs text-muted-foreground">Destacar perfil ou campanha</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <AdminPaymentSettings />

            <Card>
              <CardHeader><CardTitle className="text-base">{t("admin.systemSummary")}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div><span className="text-muted-foreground">{t("admin.languages")}:</span> PT, EN, ES, FR</div>
                  <div><span className="text-muted-foreground">{t("admin.baseCurrency")}:</span> USD</div>
                  <div><span className="text-muted-foreground">{t("admin.gateways")}:</span> Stripe, PayPal, PaySuite, Multicaixa, M.Pago</div>
                  <div><span className="text-muted-foreground">{t("admin.storage")}:</span> 3 buckets</div>
                  <div><span className="text-muted-foreground">{t("admin.auth")}:</span> Email, Google</div>
                  <div><span className="text-muted-foreground">{t("admin.aiLabel")}:</span> StatusAI (Gemini)</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};