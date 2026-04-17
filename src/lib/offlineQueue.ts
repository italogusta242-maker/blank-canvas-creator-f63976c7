/**
 * Fila offline para posts e check-ins.
 * Salva ações no IndexedDB quando o usuário está offline e tenta reenviar
 * automaticamente quando a rede volta.
 */
import { get, set } from "idb-keyval";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const QUEUE_KEY = "anaac-offline-queue-v1";

export type QueuedAction =
  | {
      id: string;
      type: "community_post";
      userId: string;
      content: string;
      imageBlob?: Blob;
      imageType?: string;
      createdAt: number;
      attempts: number;
    }
  | {
      id: string;
      type: "daily_habit";
      userId: string;
      date: string;
      payload: Record<string, any>;
      createdAt: number;
      attempts: number;
    };

async function getQueue(): Promise<QueuedAction[]> {
  try {
    return ((await get(QUEUE_KEY)) as QueuedAction[]) ?? [];
  } catch {
    return [];
  }
}

async function saveQueue(q: QueuedAction[]) {
  try {
    await set(QUEUE_KEY, q);
  } catch (e) {
    console.warn("[offlineQueue] save failed", e);
  }
}

export async function enqueue(action: Omit<QueuedAction, "id" | "createdAt" | "attempts">) {
  const queue = await getQueue();
  const newAction = {
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    attempts: 0,
  } as QueuedAction;
  queue.push(newAction);
  await saveQueue(queue);
  return newAction.id;
}

export async function getQueueSize(): Promise<number> {
  const q = await getQueue();
  return q.length;
}

async function processAction(action: QueuedAction): Promise<boolean> {
  try {
    if (action.type === "community_post") {
      let imageUrl: string | null = null;
      if (action.imageBlob) {
        const path = `${action.userId}/${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("community_media")
          .upload(path, action.imageBlob, {
            contentType: action.imageType || "image/jpeg",
          });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("community_media").getPublicUrl(path);
        imageUrl = data.publicUrl;
      }
      const { error } = await (supabase as any).from("community_posts").insert({
        user_id: action.userId,
        content: action.content,
        image_url: imageUrl,
        // Backdate to when the user actually posted
        created_at: new Date(action.createdAt).toISOString(),
      });
      if (error) throw error;
    } else if (action.type === "daily_habit") {
      const { error } = await (supabase as any)
        .from("daily_habits")
        .upsert(
          { user_id: action.userId, date: action.date, ...action.payload },
          { onConflict: "user_id,date" }
        );
      if (error) throw error;
    }
    return true;
  } catch (e: any) {
    console.warn("[offlineQueue] action failed", action.id, e?.message);
    return false;
  }
}

let isProcessing = false;

export async function processQueue(): Promise<{ sent: number; failed: number }> {
  if (isProcessing) return { sent: 0, failed: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) return { sent: 0, failed: 0 };

  isProcessing = true;
  let sent = 0;
  let failed = 0;
  try {
    const queue = await getQueue();
    if (queue.length === 0) return { sent: 0, failed: 0 };

    const remaining: QueuedAction[] = [];
    for (const action of queue) {
      const ok = await processAction(action);
      if (ok) {
        sent++;
      } else {
        action.attempts++;
        // Drop after 10 failed attempts to avoid infinite loop
        if (action.attempts < 10) remaining.push(action);
        else failed++;
      }
    }
    await saveQueue(remaining);
    if (sent > 0) {
      toast.success(`${sent} ação${sent > 1 ? "ões" : ""} sincronizada${sent > 1 ? "s" : ""}!`, {
        description: "Suas atualizações foram enviadas.",
      });
    }
  } finally {
    isProcessing = false;
  }
  return { sent, failed };
}

/**
 * Inicia o sync automático: tenta enviar ao voltar online + a cada 60s.
 * Idempotente — pode ser chamado múltiplas vezes sem problema.
 */
let listenersAttached = false;
let pollInterval: ReturnType<typeof setInterval> | null = null;

export function startQueueSync() {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;

  window.addEventListener("online", () => {
    void processQueue();
  });

  // Tenta a cada 60s caso a rede esteja inconstante
  pollInterval = setInterval(() => {
    if (navigator.onLine) void processQueue();
  }, 60_000);

  // Ao montar: se já está online, tenta processar fila pendente
  if (navigator.onLine) {
    setTimeout(() => void processQueue(), 2000);
  }
}

export function stopQueueSync() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
