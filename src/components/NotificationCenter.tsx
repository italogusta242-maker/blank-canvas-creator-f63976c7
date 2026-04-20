import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, X, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { SFX } from "@/hooks/useSoundEffects";
import ReactMarkdown from "react-markdown";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NotificationCenter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [prevCount, setPrevCount] = useState(0);

  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      try {
        const { data: direct, error: e1 } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(50);
          
        const { data: broadcasts, error: e2 } = await supabase
          .from("broadcast_notifications")
          .select(`
            id, title, body, markdown_content, created_at,
            user_notifications_read ( user_id )
          `)
          .order("created_at", { ascending: false })
          .limit(20);

        if (e1 || e2) console.warn("Notifications fetch warning:", e1 || e2);

        const mappedBroadcasts = (broadcasts || []).map((b: any) => ({
          id: b.id,
          type: "broadcast",
          title: b.title,
          body: b.body,
          markdown_content: b.markdown_content,
          created_at: b.created_at,
          read: b.user_notifications_read && b.user_notifications_read.length > 0,
        }));

        const merged = [...(direct || []), ...mappedBroadcasts];
        merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        return merged;
      } catch (e) {
        console.warn("Notifications fetch failed:", e);
        return [];
      }
    },
    enabled: !!user,
    retry: false,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          try { SFX.notification(); } catch {}
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const unreadCount = (notifications ?? []).filter((n) => !n.read).length;

  // Play sound when new notifications arrive
  useEffect(() => {
    if (unreadCount > prevCount && prevCount > 0) {
      try { SFX.notification(); } catch {}
    }
    setPrevCount(unreadCount);
  }, [unreadCount]);

  const markAllRead = useMutation({
    mutationFn: async () => {
      const allNotifs = notifications ?? [];
      const unreadDirect = allNotifs.filter(n => !n.read && n.type !== 'broadcast').map(n => n.id);
      const unreadBroadcast = allNotifs.filter(n => !n.read && n.type === 'broadcast').map(n => n.id);

      const promises = [];
      if (unreadDirect.length > 0) {
        promises.push(supabase.from("notifications").update({ read: true }).in("id", unreadDirect));
      }
      if (unreadBroadcast.length > 0) {
        const inserts = unreadBroadcast.map(id => ({ user_id: user!.id, notification_id: id }));
        promises.push(supabase.from("user_notifications_read").upsert(inserts, { onConflict: "user_id,notification_id" }));
      }
      await Promise.all(promises);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markOneRead = useMutation({
    mutationFn: async (n: any) => {
      if (n.type === "broadcast") {
        await supabase.from("user_notifications_read").upsert({ user_id: user!.id, notification_id: n.id });
      } else {
        await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "stale_plan": return "📋";
      case "new_plan": return "🎯";
      case "chat": return "💬";
      case "achievement": return "🏆";
      case "flame": return "🔥";
      case "broadcast": return "📢";
      case "social_like": return "❤️";
      case "social_comment": return "💬";
      default: return "🔔";
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-[hsl(var(--glass-highlight))] text-muted-foreground hover:text-foreground transition-colors">
          <Bell size={18} />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-1"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-96 p-0 bg-background border-border">
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-foreground font-cinzel">Notificações</SheetTitle>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
              >
                <CheckCheck size={14} />
                Marcar todas como lidas
              </button>
            )}
          </div>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {unreadCount} {unreadCount === 1 ? "nova" : "novas"}
            </p>
          )}
        </SheetHeader>

        <div className="overflow-y-auto max-h-[calc(100vh-80px)]">
          {(notifications ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Nenhuma notificação</p>
              <p className="text-xs mt-1">Suas atualizações aparecerão aqui</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(notifications ?? []).map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    "p-4 transition-colors hover:bg-[hsl(var(--glass-highlight))] cursor-pointer",
                    !n.read && "bg-accent/5 border-l-2 border-l-accent"
                  )}
                  onClick={() => {
                     if (!n.read) markOneRead.mutate(n);
                     // Navigate to conversation if chat notification
                     if (n.type === "chat" && (n as any).metadata) {
                       const meta = (n as any).metadata as any;
                       if (meta.conversation_id) {
                        setOpen(false);
                        navigate(`/chat/${meta.conversation_id}`);
                      }
                    }
                     // Navigate to community post on like/comment
                     if ((n.type === "social_like" || n.type === "social_comment") && (n as any).metadata) {
                       const meta = (n as any).metadata as any;
                       if (meta.post_id) {
                         setOpen(false);
                         navigate(`/comunidade?post=${meta.post_id}`);
                       }
                     }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{getTypeIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm",
                        !n.read ? "font-semibold text-foreground" : "text-foreground/80"
                      )}>
                        {n.title}
                      </p>
                       {(n as any).markdown_content ? (
                         <div className="text-xs text-muted-foreground mt-1 markdown-content overflow-hidden">
                            <ReactMarkdown>{(n as any).markdown_content}</ReactMarkdown>
                        </div>
                      ) : n.body && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-accent mt-2 shrink-0 animate-pulse" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationCenter;
