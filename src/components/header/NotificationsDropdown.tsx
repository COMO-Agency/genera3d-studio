import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useAllProductionLogs } from "@/hooks/useAllProductionLogs";

interface NotificationsDropdownProps {
  org?: { settings?: import("@/integrations/supabase/types").Json | null } | null;
}

const NotificationsDropdown = ({ org }: NotificationsDropdownProps) => {
  const { data } = useAllProductionLogs();
  const logs = data?.logs?.slice(0, 20);
  const navigate = useNavigate();

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("genera3d_read_notifications");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  const notifications = useMemo(() => {
    const warnings: { id: string; text: string; type: "info" | "warning"; timestamp?: string }[] = [];
    const logItems: typeof warnings = [];


    const material = (org?.settings as Record<string, unknown> | null)?.material as { capacity_kg: number; remaining_kg: number } | undefined;
    if (material && material.capacity_kg > 0) {
      const pct = (material.remaining_kg / material.capacity_kg) * 100;
      if (pct < 20) {
        warnings.push({ id: "low-material", text: `Material niedrig: ${Math.round(pct)}%`, type: "warning" });
      }
    }

    if (logs) {
      logs.slice(0, 5).forEach((log) => {
        const designName = log.design_name ?? "Design";
        const statusMap: Record<string, string> = {
          qc_pending: "QC ausstehend",
          qc_passed: "QC bestanden",
          qc_failed: "QC fehlgeschlagen",
          cancelled: "storniert",
          printed: "gedruckt",
        };
        const statusLabel = statusMap[log.status ?? ""] ?? log.status ?? "unbekannt";
        const isOk = ["qc_passed", "qc_pending", "printed"].includes(log.status ?? "");
        logItems.push({
          id: log.id,
          text: `${designName} — ${statusLabel}`,
          type: isOk ? "info" : "warning",
          timestamp: log.created_at ?? undefined,
        });
      });
    }

    return [...warnings, ...logItems];
  }, [org, logs]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAllRead = useCallback(() => {
    const newIds = new Set([...readIds, ...notifications.map((n) => n.id)]);
    // Keep only the most recent 100 IDs to prevent unbounded growth
    const trimmed = [...newIds].slice(-100);
    setReadIds(new Set(trimmed));
    try { localStorage.setItem("genera3d_read_notifications", JSON.stringify(trimmed)); } catch { /* storage blocked */ }
  }, [notifications, readIds]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative" aria-label="Benachrichtigungen">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="flex items-center justify-between px-2">
          <DropdownMenuLabel className="px-0">Benachrichtigungen</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="link" size="sm" onClick={markAllRead} className="text-[10px] text-primary h-auto p-0">
              Alle gelesen
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length > 0 ? (
          notifications.slice(0, 7).map((n) => (
            <DropdownMenuItem key={n.id} className={`text-xs py-2 cursor-pointer ${readIds.has(n.id) ? "opacity-50" : ""}`} onClick={() => navigate(n.id === "low-material" ? "/settings" : "/register")}>
              <div className={`h-2 w-2 rounded-full mr-2 flex-shrink-0 ${n.type === "warning" ? "bg-warning" : "bg-success"}`} />
              <div className="flex flex-col gap-0.5">
                <span>{n.text}</span>
                {n.timestamp && <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(n.timestamp), { addSuffix: true, locale: de })}</span>}
              </div>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="px-2 py-3 text-xs text-muted-foreground text-center">Keine Benachrichtigungen</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationsDropdown;
