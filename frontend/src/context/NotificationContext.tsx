import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast as sonnerToast } from "sonner";

type NotificationType = "success" | "error" | "info" | "loading";

export type Notification = {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: number;
  seen?: boolean;
};

type NotificationContextValue = {
  notifications: Notification[];
  add: (n: Omit<Notification, "id" | "timestamp">) => void;
  clear: () => void;
  markAllSeen: () => void;
};

const STORAGE_KEY = "tablingtime_notifications_v1";

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as Notification[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

  const sanitizeMessage = useCallback((msg: string) => {
    try {
      // remove the awkward shortform 'SUC' if present
      let out = msg.replace(/\bSUC\b/g, "");
      // collapse multiple spaces and stray punctuation
      out = out.replace(/\s+/g, " ").replace(/\s+,/g, ",").trim();
      return out;
    } catch {
      return msg;
    }
  }, []);

  const add = useCallback((n: Omit<Notification, "id" | "timestamp">) => {
    const next: Notification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      seen: false,
      ...n,
      message: sanitizeMessage(n.message),
    };
    setNotifications((prev) => [next, ...prev].slice(0, 200));
  }, [sanitizeMessage]);

  const markAllSeen = useCallback(() => {
    setNotifications((prev) => prev.map((p) => ({ ...p, seen: true })));
  }, []);

  const clear = useCallback(() => setNotifications([]), []);

  // Patch sonner toast methods to also push to our notification log
  useEffect(() => {
    const origSuccess = sonnerToast.success;
    const origError = sonnerToast.error;
    const orig = sonnerToast as any;

    orig.success = (message: any, opts?: any) => {
      try {
        const text = typeof message === "string" ? message : String(message);
        add({ type: "success", message: text });
      } catch {}
      return origSuccess(message, opts);
    };

    orig.error = (message: any, opts?: any) => {
      try {
        const text = typeof message === "string" ? message : String(message);
        add({ type: "error", message: text });
      } catch {}
      return origError(message, opts);
    };

    return () => {
      orig.success = origSuccess;
      orig.error = origError;
    };
  }, [add]);

  return (
    <NotificationContext.Provider value={{ notifications, add, clear, markAllSeen }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextValue => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};

export default NotificationContext;
