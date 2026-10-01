"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api-client";
import { notificationLink } from "@/lib/notification-links";
import { AppNotification } from "@/lib/types";
import { useRole } from "./role-context";

export type LiveNotification = AppNotification & { createdAt?: string };
type ListResponse = { items: LiveNotification[]; total: number; unread: number };
type NotificationsContextValue = {
  items: LiveNotification[];
  unread: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  connected: boolean;
  loadMore: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const PAGE_SIZE = 20;
const RECONNECT_DELAY = 10_000;

const NotificationsContext = createContext<NotificationsContextValue>({
  items: [],
  unread: 0,
  loading: false,
  loadingMore: false,
  hasMore: false,
  connected: false,
  loadMore: async () => {},
  markRead: async () => {},
  markAllRead: async () => {},
});

const emit = (name: string, detail: unknown) =>
  window.dispatchEvent(new CustomEvent(name, { detail }));

const playNotificationSound = (context: AudioContext) => {
  if (context.state !== "running") return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, now);
  oscillator.frequency.setValueAtTime(1174.66, now + 0.12);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.015);
  gain.gain.setValueAtTime(0.12, now + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.32);
};

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, mustChangePassword } = useRole();
  const userId = user && !mustChangePassword ? user.id : null;
  const [items, setItems] = useState<LiveNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [connected, setConnected] = useState(false);
  const seen = useRef(new Set<string>());
  const audioContext = useRef<AudioContext | null>(null);
  const router = useRouter();
  const openRef = useRef<(href: string, id: string) => void>(() => {});

  const refresh = useCallback(async () => {
    try {
      const result = await apiRequest<ListResponse>(`notifications?page=1&limit=${PAGE_SIZE}`);
      seen.current = new Set(result.items.map((item) => item.id));
      setItems(result.items);
      setTotal(result.total);
      setUnread(result.unread);
      setPage(1);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      seen.current.clear();
      setItems([]);
      setUnread(0);
      setTotal(0);
      setConnected(false);
      return;
    }
    setLoading(true);
    void refresh();

    const unlockAudio = () => {
      if (!("AudioContext" in window)) return;
      const context = audioContext.current ?? new AudioContext();
      audioContext.current = context;
      if (context.state === "suspended") void context.resume().catch(() => {});
    };
    document.addEventListener("pointerdown", unlockAudio, { once: true });
    document.addEventListener("keydown", unlockAudio, { once: true });

    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    let opened = false;

    const connect = () => {
      source = new EventSource("/api/bff/notifications/stream");
      source.onopen = () => {
        setConnected(true);
        if (opened) void refresh();
        opened = true;
      };
      source.addEventListener("notification", (event) => {
        let notification: LiveNotification;
        try {
          notification = JSON.parse((event as MessageEvent<string>).data);
        } catch {
          return;
        }
        if (seen.current.has(notification.id)) return;
        seen.current.add(notification.id);
        if (audioContext.current) playNotificationSound(audioContext.current);
        setItems((current) => [notification, ...current]);
        setTotal((current) => current + 1);
        if (!notification.read) setUnread((current) => current + 1);
        const link = notificationLink(notification);
        toast.info(notification.type, {
          description: notification.message,
          ...(link && {
            action: {
              label: link.label,
              onClick: () => openRef.current(link.href, notification.id),
            },
          }),
        });
        emit("biman:notification", notification);
      });
      source.onerror = () => {
        setConnected(false);
        if (source?.readyState === EventSource.CLOSED && !disposed) {
          source.close();
          retry = setTimeout(connect, RECONNECT_DELAY);
        }
      };
    };
    connect();

    return () => {
      disposed = true;
      clearTimeout(retry);
      source?.close();
      document.removeEventListener("pointerdown", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
    };
  }, [userId, refresh]);

  const latest = useRef({ items, total, page, loadingMore });
  latest.current = { items, total, page, loadingMore };

  const loadMore = useCallback(async () => {
    const { items, total, page, loadingMore } = latest.current;
    if (loadingMore || items.length >= total) return;
    latest.current.loadingMore = true;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const result = await apiRequest<ListResponse>(
        `notifications?page=${next}&limit=${PAGE_SIZE}`,
      );
      const fresh = result.items.filter((item) => !seen.current.has(item.id));
      fresh.forEach((item) => seen.current.add(item.id));
      setItems((current) => [...current, ...fresh]);
      setTotal(result.total);
      setUnread(result.unread);
      setPage(next);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to load notifications.");
    } finally {
      setLoadingMore(false);
    }
  }, []);

  const markRead = useCallback(
    async (id: string) => {
      const target = latest.current.items.find((item) => item.id === id);
      if (target?.read) return;
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
      setUnread((current) => Math.max(0, current - 1));
      try {
        await apiRequest(`notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" });
        emit("biman:notification-read", id);
      } catch (cause) {
        toast.error(cause instanceof Error ? cause.message : "Unable to update notification.");
        void refresh();
      }
    },
    [refresh],
  );
  openRef.current = (href, id) => {
    router.push(href);
    void markRead(id);
  };

  const markAllRead = useCallback(async () => {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    setUnread(0);
    try {
      await apiRequest("notifications/read-all", { method: "PATCH" });
      emit("biman:notification-read", null);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to update notifications.");
      void refresh();
    }
  }, [refresh]);

  const value = useMemo(
    () => ({
      items,
      unread,
      loading,
      loadingMore,
      hasMore: items.length < total,
      connected,
      loadMore,
      markRead,
      markAllRead,
    }),
    [items, unread, loading, loadingMore, total, connected, loadMore, markRead, markAllRead],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export const useNotifications = () => useContext(NotificationsContext);
