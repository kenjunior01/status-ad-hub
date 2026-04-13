import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, AreaChart, Area, ComposedChart } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Eye, TrendingUp, Target, MousePointerClick, Share2, ChevronRight } from "lucide-react";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const chartConfig = {
  impressions: { label: "Visualizações", color: "hsl(var(--primary))" },
  clicks: { label: "Campanhas", color: "hsl(var(--success))" },
  engagement: { label: "Engajamento", color: "hsl(var(--warning))" },
  conversions: { label: "Concluídas", color: "hsl(var(--accent))" },
};

type TimeRange = '7d' | '30d' | '90d' | 'all';

export const AnalyticsDashboard = () => {
  const { campaigns, loading } = useCampaigns();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const { timelineData, campaignPerformance, kpis } = useMemo(() => {
    const byWeek: Record<string, { total: number; completed: number; value: number }> = {};
    campaigns.forEach(c => {
      const date = c.created_at ? new Date(c.created_at) : new Date();
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().split('T')[0];
      if (!byWeek[key]) byWeek[key] = { total: 0, completed: 0, value: 0 };
      byWeek[key].total += 1;
      if (c.status === 'completed') byWeek[key].completed += 1;
      byWeek[key].value += Number(c.price);
    });

    const weeks = Object.keys(byWeek).sort();
    const timeline = weeks.map(key => ({
      date: new Date(key).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      impressions: byWeek[key].value,
      clicks: byWeek[key].total,
      engagement: byWeek[key].total > 0 ? Math.round((byWeek[key].completed / byWeek[key].total) * 100) : 0,
      conversions: byWeek[key].completed,
    }));

    const perf = campaigns
      .filter(c => c.status === 'completed' || c.status === 'active')
      .slice(0, 5)
      .map(c => ({ name: c.title, reach: 0, engagement: 0, cost: Number(c.price), roi: 0 }));

    const totalValue = campaigns.reduce((s, c) => s + Number(c.price), 0);
    const totalCompleted = campaigns.filter(c => c.status === 'completed').length;
    const completionRate = campaigns.length > 0 ? ((totalCompleted / campaigns.length) * 100).toFixed(1) : '0';

    return {
      timelineData: timeline,
      campaignPerformance: perf,
      kpis: { totalValue, totalCampaigns: campaigns.length, completionRate, totalCompleted },
    };
  }, [campaigns]);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-[200px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="px-1 flex items-center justify-between">
        <h3 className="text-base font-semibold">Insights</h3>
        <span className="text-xs text-primary font-medium flex items-center gap-0.5">
          Últimos 30 dias <ChevronRight className="h-3 w-3" />
        </span>
      </div>

      {/* Time range pills */}
      <div className="flex gap-2 px-1 overflow-x-auto scrollbar-none">
        {([['7d', '7 dias'], ['30d', '30 dias'], ['90d', '90 dias'], ['all', 'Tudo']] as [TimeRange, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTimeRange(key)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              timeRange === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* KPI cards - horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto scrollbar-none px-1 pb-1">
        {[
          { icon: Eye, label: 'Volume Total', value: `R$ ${kpis.totalValue.toLocaleString('pt-BR')}`, color: 'primary' },
          { icon: MousePointerClick, label: 'Campanhas', value: kpis.totalCampaigns.toString(), color: 'success' },
          { icon: Share2, label: 'Taxa Conclusão', value: `${kpis.completionRate}%`, color: 'warning' },
          { icon: Target, label: 'Concluídas', value: kpis.totalCompleted.toString(), color: 'accent' },
        ].map((kpi) => (
          <div key={kpi.label} className="min-w-[130px] p-3.5 rounded-2xl bg-muted/50 border border-border/30">
            <div className={`bg-${kpi.color}/10 p-1.5 rounded-lg w-fit mb-2`}>
              <kpi.icon className={`h-4 w-4 text-${kpi.color}`} />
            </div>
            <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
            <p className="text-lg font-bold mt-0.5">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Performance chart */}
      {timelineData.length > 0 ? (
        <div className="px-1">
          <p className="text-sm font-semibold mb-3">Performance Geral</p>
          <div className="rounded-2xl bg-muted/30 border border-border/20 p-3">
            <ChartContainer config={chartConfig} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={timelineData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorImpIG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area yAxisId="left" type="monotone" dataKey="impressions" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorImpIG)" />
                  <Line yAxisId="right" type="monotone" dataKey="clicks" stroke="hsl(var(--success))" strokeWidth={2} dot={{ fill: "hsl(var(--success))", strokeWidth: 2, r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>
      ) : (
        <div className="mx-1 rounded-2xl bg-muted/30 border border-border/20 p-8 text-center">
          <p className="text-sm text-muted-foreground">Crie campanhas para ver a performance</p>
        </div>
      )}

      {/* Campaign performance list - IG style */}
      {campaignPerformance.length > 0 && (
        <div className="px-1">
          <p className="text-sm font-semibold mb-3">Top Campanhas</p>
          <div className="space-y-2">
            {campaignPerformance.map((campaign, index) => (
              <div key={campaign.name} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border/20">
                <div className="bg-primary/10 text-primary font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{campaign.name}</p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                    <span>{campaign.reach.toLocaleString('pt-BR')} views</span>
                    <span>{campaign.engagement}% eng.</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-success">ROI {campaign.roi}%</p>
                  <p className="text-[11px] text-muted-foreground">R$ {campaign.cost}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Secondary charts */}
      {timelineData.length > 0 && (
        <div className="space-y-4 px-1">
          <div>
            <p className="text-sm font-semibold mb-3">Taxa de Conclusão</p>
            <div className="rounded-2xl bg-muted/30 border border-border/20 p-3">
              <ChartContainer config={chartConfig} className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timelineData}>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="engagement" fill="hsl(var(--warning))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-3">Campanhas Concluídas</p>
            <div className="rounded-2xl bg-muted/30 border border-border/20 p-3">
              <ChartContainer config={chartConfig} className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData}>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="conversions" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
