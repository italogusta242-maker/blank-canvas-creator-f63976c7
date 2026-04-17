/**
 * Persiste o cache do React Query no IndexedDB.
 * Permite que o app abra com a última versão dos dados mesmo offline ou
 * com 4G ruim — depois revalida em background (stale-while-revalidate).
 */
import { get, set, del } from "idb-keyval";
import type { Persister } from "@tanstack/react-query-persist-client";

const STORAGE_KEY = "anaac-rq-cache-v1";

export const idbPersister: Persister = {
  persistClient: async (client) => {
    try {
      await set(STORAGE_KEY, client);
    } catch (e) {
      // IndexedDB pode falhar em modo privado iOS — não quebrar o app
      console.warn("[queryPersister] persist failed", e);
    }
  },
  restoreClient: async () => {
    try {
      return (await get(STORAGE_KEY)) as any;
    } catch {
      return undefined;
    }
  },
  removeClient: async () => {
    try {
      await del(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};

/**
 * Decide quais queries valem a pena persistir. Evita persistir mutations,
 * coisas sensíveis, ou queries com erro.
 */
export const shouldDehydrateQuery = (query: any) => {
  if (query.state.status !== "success") return false;
  const key = String(query.queryKey?.[0] ?? "");
  // Lista de prefixos que cacheamos no disco
  const allowed = [
    "training-plan",
    "diet-plan",
    "profile",
    "community-posts",
    "flame-state",
    "streak",
    "week-activity",
    "daily-habits",
    "performance",
    "challenge",
    "announcements",
  ];
  return allowed.some((p) => key.startsWith(p));
};
