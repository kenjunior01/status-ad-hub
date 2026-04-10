import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { FavoriteButton } from "@/components/FavoriteButton";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/integrations/supabase/client";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { 
  Star, Verified, MessageCircle, Eye, TrendingUp, Clock,
  Calendar, MapPin, Users, Award, Check, ArrowLeft, Share2,
  Flag, Zap, ImageIcon, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CreatorProfileProps {
  profile: {
    id: string;
    user_id?: string;
    display_name: string;
    niche: string | null;
    price_range: string | null;
    price_per_post?: number | null;
    rating: number;
    total_reviews: number;
    total_campaigns: number;
    is_verified: boolean;
    badge_level: string;
    created_at: string;
    avatar_url?: string | null;
    bio?: string | null;
    country?: string | null;
    age_range?: string | null;
    gender?: string | null;
    ai_selected_niches?: string[] | null;
    whatsapp_views_min?: number | null;
    whatsapp_views_max?: number | null;
  };
  onBack?: () => void;
  onContact?: () => void;
}

const badgeConfig = {
  bronze: { color: "bg-amber-600", label: "Novo Talento", textColor: "text-amber-600" },
  silver: { color: "bg-slate-400", label: "Em Crescimento", textColor: "text-slate-500" },
  gold: { color: "bg-amber-400", label: "Top Performer", textColor: "text-amber-500" },
  platinum: { color: "bg-purple-500", label: "Elite", textColor: "text-purple-600" }
};

export const CreatorProfile = ({ profile, onBack, onContact }: CreatorProfileProps) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { formatFromUSD } = useLocalizationContext();
  const [reviews, setReviews] = useState<any[]>([]);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  
  const badge = badgeConfig[profile.badge_level as keyof typeof badgeConfig] || badgeConfig.bronze;
  const memberSince = new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Fetch real reviews
  useEffect(() => {
    const fetchData = async () => {
      if (profile.user_id) {
        const { data } = await supabase
          .from('reviews')
          .select('*')
          .eq('creator_id', profile.user_id)
          .order('created_at', { ascending: false });
        if (data) setReviews(data);

        // Fetch screenshots from campaign-proofs
        const { data: proofFiles } = await supabase.storage
          .from('campaign-proofs')
          .list(profile.user_id, { limit: 10 });
        if (proofFiles && proofFiles.length > 0) {
          const urls = await Promise.all(
            proofFiles.map(async (f) => {
              const { data: signedData } = await supabase.storage
                .from('campaign-proofs')
                .createSignedUrl(`${profile.user_id}/${f.name}`, 3600);
              return signedData?.signedUrl || '';
            })
          );
          setScreenshots(urls.filter(Boolean));
        }
      }
    };
    fetchData();
  }, [profile.user_id]);

  const gradients = [
    "from-blue-500 to-purple-600", "from-emerald-500 to-teal-600",
    "from-orange-500 to-rose-600", "from-violet-500 to-indigo-600",
    "from-pink-500 to-rose-600", "from-cyan-500 to-blue-600",
  ];
  const avatarGradient = gradients[profile.display_name.charCodeAt(0) % gradients.length];
  const niches = profile.ai_selected_niches || (profile.niche ? [profile.niche] : []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon"><Share2 className="h-4 w-4" /></Button>
            <FavoriteButton
              isFavorite={isFavorite(profile.id)}
              onClick={(e) => { e.stopPropagation(); toggleFavorite(profile); }}
              variant="default"
            />
            <Button variant="ghost" size="icon"><Flag className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Profile Header Card */}
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row gap-5">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.display_name} className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover" />
                    ) : (
                      <div className={cn("w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-gradient-to-br flex items-center justify-center", avatarGradient)}>
                        <span className="text-4xl font-bold text-white">{profile.display_name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    {profile.is_verified && (
                      <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md">
                        <Verified className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 space-y-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground">{profile.display_name}</h1>
                        <Badge className={cn("text-xs", badge.textColor)} variant="outline">{badge.label}</Badge>
                      </div>
                      {profile.bio && <p className="text-sm text-muted-foreground line-clamp-2">{profile.bio}</p>}
                    </div>

                    {/* 2-column stats on mobile */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {profile.total_reviews > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-warning fill-warning" />
                          <span className="font-semibold">{profile.rating.toFixed(1)}</span>
                          <span className="text-muted-foreground text-xs">({profile.total_reviews})</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Eye className="h-3.5 w-3.5" />
                        <span className="text-xs">{profile.total_campaigns} campanhas</span>
                      </div>
                      {profile.country && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="text-xs">{profile.country}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="text-xs">{memberSince}</span>
                      </div>
                    </div>

                    {/* Niches */}
                    {niches.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {niches.map((n: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">{n}</Badge>
                        ))}
                      </div>
                    )}

                    {/* Views range */}
                    {(profile.whatsapp_views_min || profile.whatsapp_views_max) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md w-fit">
                        <Eye className="h-3 w-3" />
                        <span>{profile.whatsapp_views_min?.toLocaleString()} - {profile.whatsapp_views_max?.toLocaleString()} views</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="screenshots" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="screenshots" className="gap-1">
                  <ImageIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Provas</span>
                </TabsTrigger>
                <TabsTrigger value="stats" className="gap-1">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Detalhes</span>
                </TabsTrigger>
                <TabsTrigger value="reviews" className="gap-1">
                  <Star className="h-4 w-4" />
                  <span className="hidden sm:inline">Avaliações</span>
                </TabsTrigger>
              </TabsList>

              {/* Screenshots Tab */}
              <TabsContent value="screenshots" className="mt-4">
                {screenshots.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {screenshots.map((url, i) => (
                      <div key={i} className="aspect-[9/16] rounded-xl overflow-hidden bg-muted">
                        <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhuma prova de visualizações disponível</p>
                  </Card>
                )}
              </TabsContent>

              {/* Stats/Details Tab - 2 columns on mobile */}
              <TabsContent value="stats" className="mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Preço sugerido</p>
                      <p className="text-lg font-bold text-foreground">
                        {profile.price_per_post ? formatFromUSD(profile.price_per_post) : profile.price_range || "—"}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Nível</p>
                      <p className="text-lg font-bold text-foreground">{badge.label}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Campanhas</p>
                      <p className="text-lg font-bold text-foreground">{profile.total_campaigns}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Avaliação</p>
                      <p className="text-lg font-bold text-foreground">
                        {profile.total_reviews > 0 ? `⭐ ${profile.rating.toFixed(1)}` : "Novo"}
                      </p>
                    </CardContent>
                  </Card>
                  {profile.age_range && (
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Idade</p>
                        <p className="text-lg font-bold text-foreground">{profile.age_range}</p>
                      </CardContent>
                    </Card>
                  )}
                  {profile.gender && (
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Género</p>
                        <p className="text-lg font-bold text-foreground capitalize">{profile.gender === 'male' ? 'Masculino' : profile.gender === 'female' ? 'Feminino' : profile.gender}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="mt-4 space-y-3">
                {reviews.length > 0 ? (
                  reviews.map((review: any) => (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={cn("h-3.5 w-3.5", i < review.rating ? "text-warning fill-warning" : "text-muted")} />
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</p>
                        </div>
                        {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="p-8 text-center">
                    <Star className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Ainda sem avaliações</p>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - CTA */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <Card className="border-primary/20">
                <CardContent className="p-5 space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Preço por publicação</p>
                    <p className="text-3xl font-bold text-foreground">
                      {profile.price_per_post ? formatFromUSD(profile.price_per_post) : profile.price_range || "A combinar"}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Button className="w-full gap-2" size="lg" onClick={onContact}>
                      <MessageCircle className="h-4 w-4" />
                      Iniciar Conversa
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground">
                      Converse primeiro, depois negocie e envie propostas
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => toggleFavorite(profile)}
                  >
                    <FavoriteButton
                      isFavorite={isFavorite(profile.id)}
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(profile); }}
                      size="sm"
                      className="h-4 w-4 min-h-0 min-w-0"
                    />
                    {isFavorite(profile.id) ? "Nos Favoritos" : "Adicionar aos Favoritos"}
                  </Button>

                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="h-4 w-4 text-warning" />
                      <span className="text-muted-foreground text-xs">Negocie antes de enviar proposta</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Award className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground text-xs">Pagamento seguro via escrow</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3 text-sm">Por que contratar?</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-success shrink-0" />
                      <span>{profile.total_campaigns}+ campanhas</span>
                    </div>
                    {profile.is_verified && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-success shrink-0" />
                        <span>Verificado</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-success shrink-0" />
                      <span>Entrega garantida</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
