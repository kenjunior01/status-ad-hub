import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useLocalizationContext } from '@/contexts/LocalizationContext';
import { Sparkles, Loader2, Bot, RefreshCw } from 'lucide-react';

interface AIPricingAssistantProps {
  mode: 'creator' | 'advertiser';
  advertiserData?: {
    budget?: number;
    targetNiche?: string;
    targetCountry?: string;
    campaignGoal?: string;
    expectedViews?: number;
    creatorsCount?: number;
    avgPriceMin?: number;
    avgPriceMax?: number;
  };
}

export const AIPricingAssistant = ({ mode, advertiserData }: AIPricingAssistantProps) => {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { currency } = useLocalizationContext();
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askAI = useCallback(async () => {
    setLoading(true);
    setResponse('');
    setError(null);

    const action = mode === 'creator' ? 'suggest_price' : 'find_creator';
    const creatorData = mode === 'creator' ? {
      displayName: profile?.display_name,
      followers: profile?.follower_count,
      engagementRate: profile?.engagement_rate,
      niche: profile?.niche,
      country: profile?.country,
      viewsMin: profile?.whatsapp_views_min,
      viewsMax: profile?.whatsapp_views_max,
      currentPrice: profile?.price_per_post,
      totalCampaigns: profile?.total_campaigns,
      rating: profile?.rating,
    } : advertiserData;

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-pricing-assistant`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ creatorData, action }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: 'AI service unavailable' }));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setResponse(fullText);
            }
          } catch { /* partial */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [mode, profile, advertiserData]);

  return (
    <Card className="glass border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span>StatusAI — {mode === 'creator' ? t("ai.pricingAssistant") : t("ai.campaignConsultant")}</span>
          <Sparkles className="h-3 w-3 text-warning" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!response && !loading && !error && (
          <p className="text-sm text-muted-foreground">
            {mode === 'creator' ? t("ai.creatorDesc") : t("ai.advertiserDesc")}
          </p>
        )}

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</div>
        )}

        {response && (
          <div className="text-sm text-foreground bg-muted/50 p-4 rounded-lg whitespace-pre-wrap leading-relaxed">{response}</div>
        )}

        <Button onClick={askAI} disabled={loading} size="sm" className="w-full" variant={response ? 'outline' : 'default'}>
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("ai.analyzing")}</>
          ) : response ? (
            <><RefreshCw className="h-4 w-4 mr-2" />{t("ai.newAnalysis")}</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" />{t("ai.getAISuggestion")}</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};