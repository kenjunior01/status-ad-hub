import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Gift, Users, Star, Share2, Loader2, Trophy } from "lucide-react";

interface Referral {
  id: string;
  referred_id: string;
  points_earned: number;
  status: string;
  created_at: string;
  referred_name?: string;
}

export const ReferralInviteSystem = () => {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [applyingCode, setApplyingCode] = useState("");
  const [applying, setApplying] = useState(false);

  const referralCode = profile?.referral_code || "";
  const referralPoints = (profile as any)?.referral_points || 0;
  const shareUrl = `${window.location.origin}/auth?ref=${referralCode}`;

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get referred user names
      const enriched = await Promise.all(
        (data || []).map(async (ref) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", ref.referred_id)
            .maybeSingle();
          return { ...ref, referred_name: profileData?.display_name || "Usuário" };
        })
      );

      setReferrals(enriched);
    } catch (err) {
      console.error("Error fetching referrals:", err);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Link copiado!", description: "Partilhe com amigos para ganhar pontos." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "StatusAds Connect",
          text: `Junte-se ao StatusAds e ganhe pontos! Use meu código: ${referralCode}`,
          url: shareUrl,
        });
      } catch {}
    } else {
      copyCode();
    }
  };

  const applyReferralCode = async () => {
    if (!applyingCode.trim()) return;
    setApplying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase.rpc("process_referral", {
        p_referral_code: applyingCode.trim().toUpperCase(),
        p_referred_user_id: user.id,
      });

      if (error) throw error;
      if (data) {
        toast({ title: "🎉 Código aplicado!", description: "Você ganhou 25 pontos de bónus!" });
        setApplyingCode("");
        fetchReferrals();
      } else {
        toast({ title: "Código inválido", description: "Verifique o código e tente novamente.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  // Reward tiers
  const tiers = [
    { count: 3, reward: "Badge Embaixador 🥉", unlocked: referrals.length >= 3 },
    { count: 10, reward: "Destaque no Marketplace ⭐", unlocked: referrals.length >= 10 },
    { count: 25, reward: "Status Premium 💎", unlocked: referrals.length >= 25 },
  ];

  return (
    <div className="space-y-4">
      {/* Points & Stats Header */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-4 border border-primary/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{referralPoints}</p>
              <p className="text-[10px] text-muted-foreground">Pontos acumulados</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-foreground">{referrals.length}</p>
            <p className="text-[10px] text-muted-foreground">Convidados</p>
          </div>
        </div>

        {/* Reward tiers progress */}
        <div className="flex gap-1">
          {tiers.map((tier, i) => (
            <div key={i} className="flex-1">
              <div className={`h-1.5 rounded-full ${tier.unlocked ? "bg-primary" : "bg-muted"}`} />
              <p className="text-[9px] text-center mt-1 text-muted-foreground">
                {tier.count} = {tier.reward}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Share section */}
      <Card className="border-primary/10">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Convide e ganhe 50 pontos</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Cada amigo que se registar com o seu link ganha 25 pontos e você ganha 50!
          </p>

          {/* Referral code display */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted/60 rounded-lg px-3 py-2 font-mono text-sm font-bold tracking-wider text-center">
              {referralCode || "..."}
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={copyCode}>
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* Share buttons */}
          <div className="flex gap-2">
            <Button className="flex-1 h-9 text-xs gap-1.5" onClick={shareNative}>
              <Share2 className="h-3.5 w-3.5" /> Partilhar link
            </Button>
            <Button
              variant="outline"
              className="h-9 text-xs gap-1.5"
              onClick={() => {
                const text = encodeURIComponent(`Junte-se ao StatusAds! ${shareUrl}`);
                window.open(`https://wa.me/?text=${text}`, "_blank");
              }}
            >
              WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Apply referral code */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" /> Tem um código de convite?
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="CODIGO123"
              value={applyingCode}
              onChange={(e) => setApplyingCode(e.target.value.toUpperCase())}
              className="font-mono text-sm uppercase tracking-wider h-9"
              maxLength={12}
            />
            <Button
              size="sm"
              className="h-9 shrink-0"
              onClick={applyReferralCode}
              disabled={applying || !applyingCode.trim()}
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referral list */}
      <div>
        <p className="text-sm font-semibold mb-2 flex items-center gap-2 px-1">
          <Users className="h-4 w-4 text-primary" /> Seus convidados ({referrals.length})
        </p>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : referrals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Gift className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum convidado ainda</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Partilhe o seu link para começar</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {referrals.map((ref) => (
              <Card key={ref.id} className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {ref.referred_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ref.referred_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(ref.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    +{ref.points_earned} pts
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};