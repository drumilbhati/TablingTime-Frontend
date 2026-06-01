import React, { useState, useRef, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";

const formatTime = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleString();
};

const BellNotifications: React.FC = () => {
  const { notifications, clear, markAllSeen } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const unseenCount = notifications.filter((n) => !n.seen).length;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((s) => {
            const next = !s;
            if (next) markAllSeen();
            return next;
          });
        }}
        className="p-2 rounded hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <div className="relative">
          <Bell className="h-5 w-5 text-gray-700" />
          {unseenCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] px-1.5 py-0.5">{unseenCount}</span>
          )}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="text-sm font-semibold">Notifications</div>
            <div className="flex items-center gap-2">
              <button onClick={clear} className="text-xs text-gray-500">Clear</button>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
          <div className="p-2">
            {notifications.length === 0 ? (
              <div className="text-sm text-gray-500 p-3">No notifications</div>
            ) : (
              notifications.map((n) => {
                const color = n.type === "success" ? "bg-green-500" : n.type === "error" ? "bg-red-500" : n.type === "info" ? "bg-blue-500" : "bg-gray-400";
                return (
                  <div key={n.id} className="flex items-start gap-3 p-2 rounded hover:bg-gray-50">
                    <div className={`w-1 h-10 rounded ${color} flex-shrink-0`} />
                    <div className="min-w-0">
                      <div className="text-sm text-gray-900">{n.message}</div>
                      <div className="text-xs text-gray-400 mt-1">{formatTime(n.timestamp)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BellNotifications;
