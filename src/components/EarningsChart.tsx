import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { DollarSign, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const chartConfig = {
  earnings: { label: "Ganhos", color: "hsl(var(--primary))" },
  campaigns: { label: "Campanhas", color: "hsl(var(--success))" },
};

const CATEGORY_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--accent))",
];

type TimeRange = '7d' | '30d' | '90d' | 'all';

export const EarningsChart = () => {
  const { campaigns, loading } = useCampaigns();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const { monthlyData, categoryData, totalEarnings, monthlyGrowth } = useMemo(() => {
    const completed = campaigns.filter(c => c.status === 'completed');
    const total = completed.reduce((sum, c) => sum + Number(c.price), 0);

    const byMonth: Record<string, { earnings: number; campaigns: number }> = {};
    completed.forEach(c => {
      const date = c.completed_at ? new Date(c.completed_at) : c.created_at ? new Date(c.created_at) : new Date();
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { earnings: 0, campaigns: 0 };
      byMonth[key].earnings += Number(c.price);
      byMonth[key].campaigns += 1;
    });

    const months = Object.keys(byMonth).sort();
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const data = months.map(key => {
      const [, m] = key.split('-');
      return { month: monthNames[parseInt(m) - 1], earnings: byMonth[key].earnings, campaigns: byMonth[key].campaigns };
    });

    let growth = 0;
    if (data.length >= 2) {
      const last = data[data.length - 1].earnings;
      const prev = data[data.length - 2].earnings;
      growth = prev > 0 ? ((last - prev) / prev) * 100 : 0;
    }

    const categories: Record<string, number> = {};
    campaigns.forEach(c => {
      const text = `${c.title} ${c.description || ''}`.toLowerCase();
      if (text.match(/beleza|beauty|moda|fashion/)) categories['Beleza'] = (categories['Beleza'] || 0) + 1;
      else if (text.match(/fitness|saúde|health|gym/)) categories['Fitness'] = (categories['Fitness'] || 0) + 1;
      else if (text.match(/tech|tecnologia|app|software/)) categories['Tech'] = (categories['Tech'] || 0) + 1;
      else categories['Outros'] = (categories['Outros'] || 0) + 1;
    });
    const totalCats = Object.values(categories).reduce((a, b) => a + b, 0) || 1;
    const catData = Object.entries(categories).map(([name, count], i) => ({
      name, value: Math.round((count / totalCats) * 100), color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));

    return {
      monthlyData: data,
      categoryData: catData.length > 0 ? catData : [{ name: 'Sem dados', value: 100, color: CATEGORY_COLORS[0] }],
      totalEarnings: total,
      monthlyGrowth: Math.round(growth * 10) / 10,
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

  const isPositiveGrowth = monthlyGrowth > 0;

  return (
    <div className="space-y-4">
      {/* Instagram Insights style header */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Visão Geral</h3>
          <span className="text-xs text-primary font-medium flex items-center gap-0.5">
            Últimos 30 dias <ChevronRight className="h-3 w-3" />
          </span>
        </div>

        {/* Time range pills */}
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none">
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
      </div>

      {/* Summary metrics - horizontal scroll like IG insights */}
      <div className="flex gap-3 overflow-x-auto scrollbar-none px-1 pb-1">
        <div className="min-w-[140px] p-4 rounded-2xl bg-muted/50 border border-border/30">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <span className="text-[11px] text-muted-foreground">Total Ganho</span>
          </div>
          <p className="text-xl font-bold">R$ {totalEarnings.toLocaleString('pt-BR')}</p>
        </div>

        <div className="min-w-[140px] p-4 rounded-2xl bg-muted/50 border border-border/30">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-success/10 p-1.5 rounded-lg">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <span className="text-[11px] text-muted-foreground">Crescimento</span>
          </div>
          <div className="flex items-center gap-1.5">
            <p className="text-xl font-bold">{Math.abs(monthlyGrowth)}%</p>
            {monthlyData.length >= 2 && (
              isPositiveGrowth
                ? <ArrowUpRight className="h-4 w-4 text-success" />
                : <ArrowDownRight className="h-4 w-4 text-destructive" />
            )}
          </div>
        </div>

        <div className="min-w-[140px] p-4 rounded-2xl bg-muted/50 border border-border/30">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-warning/10 p-1.5 rounded-lg">
              <Calendar className="h-4 w-4 text-warning" />
            </div>
            <span className="text-[11px] text-muted-foreground">Campanhas</span>
          </div>
          <p className="text-xl font-bold">{campaigns.length}</p>
        </div>
      </div>

      {/* Main chart - clean, borderless like IG */}
      {monthlyData.length > 0 ? (
        <div className="px-1">
          <p className="text-sm font-semibold mb-3">Ganhos ao longo do tempo</p>
          <div className="rounded-2xl bg-muted/30 border border-border/20 p-3">
            <ChartContainer config={chartConfig} className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="earnings" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorEarnings)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>
      ) : (
        <div className="mx-1 rounded-2xl bg-muted/30 border border-border/20 p-8 text-center">
          <p className="text-sm text-muted-foreground">Complete campanhas para ver o histórico</p>
        </div>
      )}

      {/* Campaigns bar chart */}
      {monthlyData.length > 0 && (
        <div className="px-1">
          <p className="text-sm font-semibold mb-3">Campanhas por Mês</p>
          <div className="rounded-2xl bg-muted/30 border border-border/20 p-3">
            <ChartContainer config={chartConfig} className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="campaigns" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>
      )}

      {/* Category distribution - horizontal bars like IG */}
      <div className="px-1">
        <p className="text-sm font-semibold mb-3">Categorias</p>
        <div className="space-y-3">
          {categoryData.map((cat) => (
            <div key={cat.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{cat.name}</span>
                <span className="text-xs text-muted-foreground">{cat.value}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ width: `${cat.value}%`, backgroundColor: cat.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
