import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useWallet } from "@/hooks/useWallet";
import { WithdrawalCelebration } from "@/components/WithdrawalCelebration";
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, DollarSign, TrendingUp, Loader2, CreditCard } from "lucide-react";

export const CreatorWallet = () => {
  const { t } = useTranslation();
  const { wallet, transactions, loading, requestWithdrawal } = useWallet();
  const { formatFromUSD } = useLocalizationContext();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationAmount, setCelebrationAmount] = useState(0);

  const handleWithdraw = async () => {
    setWithdrawing(true);
    const amount = Number(withdrawAmount);
    const success = await requestWithdrawal(amount, pixKey);
    setWithdrawing(false);
    if (success) {
      setCelebrationAmount(amount);
      setWithdrawAmount("");
      setPixKey("");
      setDialogOpen(false);
      setShowCelebration(true);
    }
  };

  const handleCelebrationComplete = useCallback(() => { setShowCelebration(false); }, []);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'escrow_release': return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'withdrawal': return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'escrow_hold': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <DollarSign className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'escrow_release': return t("wallet.paymentReceived");
      case 'escrow_hold': return t("wallet.inEscrow");
      case 'withdrawal': return t("wallet.withdrawal");
      case 'refund': return t("wallet.refund");
      case 'penalty': return t("wallet.penalty");
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("wallet.completed")}</Badge>;
      case 'pending': return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">{t("wallet.pending")}</Badge>;
      case 'failed': return <Badge variant="destructive">{t("wallet.failed")}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const available = Number(wallet?.available_balance || 0);
  const pending = Number(wallet?.pending_balance || 0);
  const totalEarned = Number(wallet?.total_earned || 0);

  return (
    <div className="space-y-6">
      <WithdrawalCelebration show={showCelebration} amount={celebrationAmount} onComplete={handleCelebrationComplete} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10"><Wallet className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{t("wallet.availableBalance")}</p>
                <p className="text-2xl font-bold text-green-600">{formatFromUSD(available)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-500/10"><Clock className="h-5 w-5 text-yellow-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{t("wallet.pendingBalance")}</p>
                <p className="text-2xl font-bold text-yellow-600">{formatFromUSD(pending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{t("wallet.totalEarned")}</p>
                <p className="text-2xl font-bold text-primary">{formatFromUSD(totalEarned)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button size="lg" disabled={available < 50} className="w-full md:w-auto">
            <CreditCard className="h-4 w-4 mr-2" />
            {t("wallet.requestWithdrawal")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("wallet.requestWithdrawal")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("wallet.availableBalanceLabel")}: <span className="font-semibold text-green-600">{formatFromUSD(available)}</span>
            </p>
            <p className="text-xs text-muted-foreground">{t("wallet.minWithdrawal")}</p>
            <div>
              <Label>{t("wallet.withdrawalAmount")}</Label>
              <Input type="number" min={50} max={available} value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="50.00" className="mt-1" />
            </div>
            <div>
              <Label>{t("wallet.pixKey")}</Label>
              <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder={t("wallet.pixKeyPlaceholder")} className="mt-1" />
            </div>
            <Button onClick={handleWithdraw} disabled={withdrawing || !withdrawAmount || Number(withdrawAmount) < 50 || !pixKey} className="w-full">
              {withdrawing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("wallet.confirmWithdrawal")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t("wallet.transactionHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t("wallet.noTransactions")}</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(tx.type)}
                    <div>
                      <p className="font-medium text-sm">{getTransactionLabel(tx.type)}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.description || ''} • {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-semibold ${tx.type === 'escrow_release' ? 'text-green-600' : tx.type === 'withdrawal' ? 'text-red-500' : ''}`}>
                      {tx.type === 'withdrawal' ? '-' : '+'}{formatFromUSD(Number(tx.net_amount || tx.amount))}
                    </span>
                    {getStatusBadge(tx.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};