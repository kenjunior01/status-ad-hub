import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useProfile } from "@/hooks/useProfile";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { Loader2, Shield, Lock, Sparkles, ChevronDown, Check } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export const ProfileEditForm = () => {
  const { t } = useTranslation();
  const { profile, loading, saving, updateProfile } = useProfile();
  const { formatFromUSD } = useLocalizationContext();
  const isMobile = useIsMobile();

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

  const [basicInfoOpen, setBasicInfoOpen] = useState(false);
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);

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
    { value: "budget", label: "Econômico ($10-50)" },
    { value: "mid-range", label: "Intermediário ($50-150)" },
    { value: "premium", label: "Premium ($150-500)" },
    { value: "luxury", label: "Luxo ($500+)" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updates: Record<string, any> = {
      display_name: formData.display_name,
      bio: formData.bio,
      niche: formData.niche,
      price_range: formData.price_range,
      avatar_url: formData.avatar_url,
    };
    if (formData.price_per_post) updates.price_per_post = parseFloat(formData.price_per_post);
    if (formData.follower_count) updates.follower_count = parseInt(formData.follower_count);
    if (formData.engagement_rate) updates.engagement_rate = parseFloat(formData.engagement_rate);
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

  const SettingRow = ({ label, children, noBorder }: { label: string; children: React.ReactNode; noBorder?: boolean }) => (
    <div className={`flex items-center justify-between py-3 ${!noBorder ? 'border-b border-border/40' : ''}`}>
      <span className="text-sm text-muted-foreground shrink-0 w-28">{label}</span>
      <div className="flex-1 ml-3">{children}</div>
    </div>
  );

  const SectionToggle = ({ label, icon, open, onToggle, children }: { label: string; icon: string; open: boolean; onToggle: () => void; children: React.ReactNode }) => (
    <Collapsible open={open} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button type="button" className="w-full flex items-center justify-between py-3 border-b border-border/40 group">
          <span className="text-sm font-medium flex items-center gap-2">
            {icon} {label}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
      {/* Completion bar - only if incomplete */}
      {completion < 100 && (
        <div className="mx-4 my-3 flex items-center gap-3">
          <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="flex-1 bg-muted rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${completion}%` }} />
          </div>
          <span className="text-[11px] font-medium text-primary">{completion}%</span>
        </div>
      )}

      {/* All sections collapsible */}
      <div className="px-4">
        {/* Basic Info — collapsible */}
        <SectionToggle label="Informações Básicas" icon="✏️" open={basicInfoOpen} onToggle={() => setBasicInfoOpen(!basicInfoOpen)}>
          <div className="pl-1">
            <SettingRow label={t("profile.displayName")}>
              <Input
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder={t("profile.displayNamePlaceholder")}
                className="border-0 bg-transparent text-right text-sm p-0 h-auto focus-visible:ring-0"
                required
                maxLength={100}
              />
            </SettingRow>

            <SettingRow label={t("profile.biography")}>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value.slice(0, 500) })}
                placeholder={t("profile.bioPlaceholder")}
                className="border-0 bg-transparent text-right text-sm p-0 min-h-0 h-auto resize-none focus-visible:ring-0"
                rows={2}
                maxLength={500}
              />
            </SettingRow>

            <SettingRow label={t("profile.mainNiche")} noBorder>
              <Select value={formData.niche} onValueChange={(v) => setFormData({ ...formData, niche: v })}>
                <SelectTrigger className="border-0 bg-transparent text-right text-sm p-0 h-auto shadow-none focus:ring-0 [&>svg]:ml-1">
                  <SelectValue placeholder={t("profile.selectNiche")} />
                </SelectTrigger>
                <SelectContent>
                  {niches.map((niche) => (
                    <SelectItem key={niche} value={niche}>{niche}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingRow>
          </div>
        </SectionToggle>

        {/* Pricing — collapsible */}
        <SectionToggle label="Preço & CPV" icon="💰" open={pricingOpen} onToggle={() => setPricingOpen(!pricingOpen)}>
          <div className="pl-1">
            {!(profile as any)?.can_set_own_price ? (
              <div className="py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" /> CPV Auto
                  </span>
                  {profile?.cpv_rate && (
                    <span className="text-sm font-bold text-primary">{formatFromUSD(Number(profile.cpv_rate))}/view</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">{t("profile.autoPricingDesc")}</p>
                <p className="text-[11px] text-primary flex items-center gap-1 mt-1">
                  <Sparkles className="h-3 w-3" /> {t("profile.unlockPricing")} — {formatFromUSD(5)}
                </p>
              </div>
            ) : (
              <>
                <SettingRow label={t("profile.priceRange")}>
                  <Select value={formData.price_range} onValueChange={(v) => setFormData({ ...formData, price_range: v })}>
                    <SelectTrigger className="border-0 bg-transparent text-right text-sm p-0 h-auto shadow-none focus:ring-0 [&>svg]:ml-1">
                      <SelectValue placeholder={t("profile.selectRange")} />
                    </SelectTrigger>
                    <SelectContent>
                      {priceRanges.map((range) => (
                        <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SettingRow>
                <SettingRow label={t("profile.pricePerPost")} noBorder>
                  <Input
                    type="number" min="0" step="0.01"
                    value={formData.price_per_post}
                    onChange={(e) => setFormData({ ...formData, price_per_post: e.target.value })}
                    placeholder="50.00"
                    className="border-0 bg-transparent text-right text-sm p-0 h-auto focus-visible:ring-0"
                  />
                </SettingRow>
              </>
            )}
          </div>
        </SectionToggle>

        {/* Audience Data — collapsible */}
        <SectionToggle label={t("profile.audienceData")} icon="📊" open={audienceOpen} onToggle={() => setAudienceOpen(!audienceOpen)}>
          <div className="pl-1">
            <p className="text-[11px] text-muted-foreground py-2">{t("profile.audienceDataDesc")}</p>
            <SettingRow label={t("profile.whatsappFollowers")}>
              <Input
                type="number" min="0"
                value={formData.follower_count}
                onChange={(e) => setFormData({ ...formData, follower_count: e.target.value })}
                placeholder="5000"
                className="border-0 bg-transparent text-right text-sm p-0 h-auto focus-visible:ring-0"
              />
            </SettingRow>
            <SettingRow label={t("profile.engagementRate")} noBorder>
              <Input
                type="number" min="0" max="100" step="0.1"
                value={formData.engagement_rate}
                onChange={(e) => setFormData({ ...formData, engagement_rate: e.target.value })}
                placeholder="5.0"
                className="border-0 bg-transparent text-right text-sm p-0 h-auto focus-visible:ring-0"
              />
            </SettingRow>

            {profile?.cpv_rate && Number(profile.cpv_rate) > 0 && (
              <div className="mt-2 mb-1 p-2.5 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("profile.calculatedCPV")}</span>
                <span className="text-sm font-bold text-primary">{formatFromUSD(Number(profile.cpv_rate))}</span>
              </div>
            )}
          </div>
        </SectionToggle>
      </div>

      {/* Submit */}
      <div className="px-4 py-5">
        <Button
          type="submit"
          className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 font-semibold text-sm"
          disabled={saving}
        >
          {saving ? (
            <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t("profile.saving")}</span>
          ) : (
            t("profile.saveChanges")
          )}
        </Button>
      </div>
    </form>
  );
};
