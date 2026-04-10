import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useProfile } from "@/hooks/useProfile";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { Camera, Save, User, Loader2, Upload, Shield, Star, Lock, Sparkles } from "lucide-react";

export const ProfileEditForm = () => {
  const { t } = useTranslation();
  const { profile, loading, saving, uploading, updateProfile, uploadAvatar } = useProfile();
  const { formatFromUSD } = useLocalizationContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    display_name: "",
    bio: "",
    niche: "",
    price_range: "",
    price_per_post: "",
    avatar_url: "",
    follower_count: "",
    engagement_rate: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || "",
        bio: profile.bio || "",
        niche: profile.niche || "",
        price_range: profile.price_range || "",
        price_per_post: profile.price_per_post?.toString() || "",
        avatar_url: profile.avatar_url || "",
        follower_count: profile.follower_count?.toString() || "",
        engagement_rate: profile.engagement_rate?.toString() || "",
      });
    }
  }, [profile]);

  const niches = [
    "Beleza", "Fitness", "Tecnologia", "Gastronomia", "Viagens",
    "Moda", "Lifestyle", "Negócios", "Educação", "Entretenimento",
    "Games", "Música", "Saúde", "Arte & Design", "Finanças",
  ];

  const priceRanges = [
    { value: "budget", label: "Econômico (R$ 10-50)" },
    { value: "mid-range", label: "Intermediário (R$ 50-150)" },
    { value: "premium", label: "Premium (R$ 150-500)" },
    { value: "luxury", label: "Luxo (R$ 500+)" },
  ];

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadAvatar(file);
    if (url) {
      setFormData(prev => ({ ...prev, avatar_url: url }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updates: Record<string, any> = {
      display_name: formData.display_name,
      bio: formData.bio,
      niche: formData.niche,
      price_range: formData.price_range,
      avatar_url: formData.avatar_url,
    };
    if (formData.price_per_post) {
      updates.price_per_post = parseFloat(formData.price_per_post);
    }
    if (formData.follower_count) {
      updates.follower_count = parseInt(formData.follower_count);
    }
    if (formData.engagement_rate) {
      updates.engagement_rate = parseFloat(formData.engagement_rate);
    }
    await updateProfile(updates);
  };

  const completionPercentage = () => {
    const fields = [formData.display_name, formData.bio, formData.niche, formData.price_range, formData.avatar_url];
    const filled = fields.filter(f => f && f.trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const completion = completionPercentage();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profile Completion */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">Completude do Perfil</span>
            </div>
            <Badge variant={completion === 100 ? "default" : "secondary"}>
              {completion}%
            </Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-gradient-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${completion}%` }}
            />
          </div>
          {completion < 100 && (
            <p className="text-xs text-muted-foreground mt-2">
              Perfis completos recebem até 3x mais propostas!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Foto de Perfil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="h-28 w-28 border-4 border-background shadow-lg">
                <AvatarImage src={formData.avatar_url} />
                <AvatarFallback className="bg-primary/10">
                  <User className="h-14 w-14 text-primary" />
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </button>
            </div>
            <div className="space-y-3 flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Enviando..." : "Enviar Foto"}
              </Button>
              <p className="text-xs text-muted-foreground">
                JPG, PNG ou WebP. Máximo 5MB.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="display_name">Nome de Exibição *</Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              placeholder="Como você quer ser conhecido"
              required
              maxLength={100}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bio">Biografia</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value.slice(0, 500) })}
              placeholder="Conte sobre você, seu conteúdo e seus diferenciais..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.bio.length}/500
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="niche">Nicho Principal</Label>
              <Select
                value={formData.niche}
                onValueChange={(value) => setFormData({ ...formData, niche: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione seu nicho" />
                </SelectTrigger>
                <SelectContent>
                  {niches.map((niche) => (
                    <SelectItem key={niche} value={niche}>{niche}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          {/* Price Section - Locked unless can_set_own_price */}
          {!(profile as any)?.can_set_own_price ? (
            <Alert className="border-primary/20 bg-primary/5">
              <Lock className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="text-sm font-medium">{t("profile.autoPricing")}</p>
                <p className="text-xs text-muted-foreground">{t("profile.autoPricingDesc")}</p>
                {profile?.cpv_rate && (
                  <div className="p-2 bg-background rounded-lg border mt-2">
                    <p className="text-sm">CPV: <span className="font-bold text-primary">{formatFromUSD(Number(profile.cpv_rate))}</span>/view</p>
                    <p className="text-xs text-muted-foreground">≈ 0.70 MZN/view</p>
                  </div>
                )}
                <p className="text-xs text-primary flex items-center gap-1 mt-1">
                  <Sparkles className="h-3 w-3" /> {t("profile.unlockPricing")} — {formatFromUSD(5)}
                </p>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="price_range">Faixa de Preço</Label>
                <Select
                  value={formData.price_range}
                  onValueChange={(value) => setFormData({ ...formData, price_range: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a faixa" />
                  </SelectTrigger>
                  <SelectContent>
                    {priceRanges.map((range) => (
                      <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price_per_post">Preço por Post (USD)</Label>
                <Input
                  id="price_per_post"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price_per_post}
                  onChange={(e) => setFormData({ ...formData, price_per_post: e.target.value })}
                  placeholder="Ex: 50.00"
                />
              </div>
            </>
          )}

          {/* CPV Fields */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold">📊 Dados de Audiência (CPV)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Esses dados são usados para calcular automaticamente seu CPV (Custo por Visualização).
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="follower_count">Seguidores no WhatsApp</Label>
                  <Input
                    id="follower_count"
                    type="number"
                    min="0"
                    value={formData.follower_count}
                    onChange={(e) => setFormData({ ...formData, follower_count: e.target.value })}
                    placeholder="Ex: 5000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="engagement_rate">Taxa de Engajamento (%)</Label>
                  <Input
                    id="engagement_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.engagement_rate}
                    onChange={(e) => setFormData({ ...formData, engagement_rate: e.target.value })}
                    placeholder="Ex: 5.0"
                  />
                </div>
              </div>
              {profile?.cpv_rate && Number(profile.cpv_rate) > 0 && (
                <div className="p-3 bg-background rounded-lg border">
                  <p className="text-sm font-medium">Seu CPV calculado: <span className="text-primary font-bold">R$ {Number(profile.cpv_rate).toFixed(4)}</span></p>
                  <p className="text-xs text-muted-foreground mt-1">Baseado nos seus seguidores, engajamento e nicho</p>
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Profile Stats (read-only) */}
      {profile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Estatísticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-foreground">{profile.rating || 0}</p>
                <p className="text-xs text-muted-foreground">Avaliação</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-foreground">{profile.total_reviews || 0}</p>
                <p className="text-xs text-muted-foreground">Avaliações</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-foreground">{profile.total_campaigns || 0}</p>
                <p className="text-xs text-muted-foreground">Campanhas</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-foreground">
                  <Badge variant={profile.is_verified ? "default" : "secondary"}>
                    {profile.is_verified ? "Verificado" : "Pendente"}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground">Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      <Button type="submit" className="w-full h-12 bg-gradient-primary hover:opacity-90" disabled={saving}>
        {saving ? (
          <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Salvando...</span>
        ) : (
          <span className="flex items-center gap-2"><Save className="h-4 w-4" />Salvar Alterações</span>
        )}
      </Button>
    </form>
  );
};
