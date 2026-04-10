import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Bell, Check, CheckCheck, MessageSquare, DollarSign, Target, Star, AlertCircle, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: 'message' | 'campaign' | 'payment' | 'review' | 'alert';
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'message': return MessageSquare;
    case 'campaign': return Target;
    case 'payment': return DollarSign;
    case 'review': return Star;
    default: return AlertCircle;
  }
};

const formatTime = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

export const NotificationsPanel = () => {
  const { profile } = useProfile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  // Build real notifications from actual data
  useEffect(() => {
    if (!profile?.user_id) return;

    const loadNotifications = async () => {
      const realNotifs: Notification[] = [];

      // Check for recent messages
      const { data: convos } = await supabase
        .from('conversations')
        .select('id, last_message_at')
        .or(`participant_1.eq.${profile.user_id},participant_2.eq.${profile.user_id}`)
        .order('last_message_at', { ascending: false })
        .limit(3);

      if (convos) {
        for (const c of convos) {
          const { data: msgs } = await supabase
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('conversation_id', c.id)
            .neq('sender_id', profile.user_id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (msgs?.[0]) {
            const msgDate = new Date(msgs[0].created_at);
            const hoursDiff = (Date.now() - msgDate.getTime()) / 3600000;
            if (hoursDiff < 48) {
              realNotifs.push({
                id: `msg-${c.id}`,
                type: 'message',
                title: 'Nova mensagem',
                description: msgs[0].content.substring(0, 60) + (msgs[0].content.length > 60 ? '...' : ''),
                timestamp: msgDate,
                read: hoursDiff > 1,
              });
            }
          }
        }
      }

      // Check for recent campaigns
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, title, status, created_at')
        .or(`creator_id.eq.${profile.user_id},advertiser_id.eq.${profile.user_id}`)
        .order('created_at', { ascending: false })
        .limit(3);

      if (campaigns) {
        for (const c of campaigns) {
          const campDate = new Date(c.created_at!);
          const hoursDiff = (Date.now() - campDate.getTime()) / 3600000;
          if (hoursDiff < 72) {
            realNotifs.push({
              id: `camp-${c.id}`,
              type: 'campaign',
              title: c.status === 'pending' ? 'Campanha pendente' : `Campanha ${c.status}`,
              description: c.title,
              timestamp: campDate,
              read: hoursDiff > 2,
            });
          }
        }
      }

      setNotifications(realNotifs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
    };

    loadNotifications();
  }, [profile?.user_id]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border/40">
          <h4 className="text-sm font-semibold">Notificações</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={markAllRead}>
              <CheckCheck className="h-3 w-3" /> Marcar lidas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-72">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Sem notificações
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {notifications.map(n => {
                const Icon = getIcon(n.type);
                return (
                  <div key={n.id} className={cn("flex items-start gap-3 p-3 transition-colors", !n.read && "bg-primary/5")}>
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      n.type === 'message' ? "bg-blue-500/10 text-blue-500" :
                      n.type === 'campaign' ? "bg-emerald-500/10 text-emerald-500" :
                      n.type === 'payment' ? "bg-amber-500/10 text-amber-500" :
                      "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-foreground">{n.title}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatTime(n.timestamp)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.description}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export const NotificationButton = () => <NotificationsPanel />;
