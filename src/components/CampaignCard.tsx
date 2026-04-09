import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLocalizationContext } from "@/contexts/LocalizationContext";
import { 
  CalendarDays, 
  MessageCircle, 
  BarChart3, 
  Eye,
  TrendingUp,
  Timer
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Campaign {
  id: string | number;
  title: string;
  creator?: string;
  advertiser?: string;
  price?: number;
  budget?: number;
  spent?: number;
  status: "active" | "pending" | "completed" | "paused";
  deadline: string;
  progress: number;
  reach?: number;
  engagement?: number;
}

interface CampaignCardProps {
  campaign: Campaign;
  viewType?: "creator" | "advertiser";
  onViewDetails?: (campaign: Campaign) => void;
  onOpenChat?: (campaign: Campaign) => void;
  onViewAnalytics?: (campaign: Campaign) => void;
  className?: string;
}

const statusConfig = {
  active: { 
    color: "bg-success text-success-foreground", 
    label: "Ativa",
    indicator: "bg-success"
  },
  pending: { 
    color: "bg-warning text-warning-foreground", 
    label: "Pendente",
    indicator: "bg-warning"
  },
  completed: { 
    color: "bg-primary text-primary-foreground", 
    label: "Concluída",
    indicator: "bg-primary"
  },
  paused: { 
    color: "bg-muted text-muted-foreground", 
    label: "Pausada",
    indicator: "bg-muted"
  }
};

export const CampaignCard = ({ 
  campaign, 
  viewType = "creator",
  onViewDetails,
  onOpenChat,
  onViewAnalytics,
  className 
}: CampaignCardProps) => {
  const { formatFromUSD } = useLocalizationContext();
  const status = statusConfig[campaign.status];
  const isActive = campaign.status === "active";
  const partner = viewType === "creator" ? campaign.advertiser : campaign.creator;

  const formatCurrency = (value?: number) => {
    if (!value) return formatFromUSD(0);
    return formatFromUSD(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getDaysLeft = (deadline: string) => {
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const daysLeft = getDaysLeft(campaign.deadline);

  return (
    <Card className={cn(
      "glass hover:shadow-glow transition-all duration-300 group",
      isActive && "ring-1 ring-success/20 glow-success",
      className
    )}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors truncate">
              {campaign.title}
            </h3>
            {partner && (
              <p className="text-muted-foreground text-sm">
                {viewType === "creator" ? "por" : "com"} {partner}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={cn("w-2 h-2 rounded-full", status.indicator)} />
            <Badge className={status.color}>
              {status.label}
            </Badge>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-foreground">
              {viewType === "creator" 
                ? formatCurrency(campaign.price)
                : formatCurrency(campaign.spent)} 
            </div>
            <div className="text-xs text-muted-foreground">
              {viewType === "creator" 
                ? "Valor do projeto"
                : `de ${formatCurrency(campaign.budget)}`}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold text-primary">
              {campaign.progress}%
            </div>
            <div className="text-xs text-muted-foreground">
              Progresso
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <Progress 
            value={campaign.progress} 
            className="h-2"
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-4 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {daysLeft > 0 ? `${daysLeft} dias` : "Vencido"}
            </div>
          </div>
          
          {campaign.reach && (
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <Eye className="h-3 w-3" />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {campaign.reach > 999 
                  ? `${(campaign.reach / 1000).toFixed(1)}k`
                  : campaign.reach} views
              </div>
            </div>
          )}
          
          {campaign.engagement && (
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {campaign.engagement}% eng.
              </div>
            </div>
          )}
        </div>

        {/* Deadline Warning */}
        {daysLeft <= 3 && daysLeft > 0 && (
          <div className="mb-4 p-2 bg-warning/10 border border-warning/20 rounded-md">
            <div className="flex items-center gap-2 text-warning">
              <Timer className="h-4 w-4" />
              <span className="text-xs font-medium">
                Prazo próximo: {formatDate(campaign.deadline)}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onOpenChat?.(campaign)}
            className="flex-1"
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            Chat
          </Button>
          
          {viewType === "advertiser" && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onViewAnalytics?.(campaign)}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Analytics
            </Button>
          )}
          
          <Button 
            size="sm"
            onClick={() => onViewDetails?.(campaign)}
            className="bg-gradient-primary hover:bg-gradient-primary/90"
          >
            Ver Detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};