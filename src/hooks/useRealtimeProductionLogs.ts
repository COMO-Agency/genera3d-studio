import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";

/**
 * Global Realtime subscription for production_logs scoped to the user's org.
 * Mount once in AppLayout so all pages receive live updates.
 * Includes fallback polling when realtime fails.
 */
export const useRealtimeProductionLogs = () => {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const orgId = profile?.org_id;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;
  const pollInterval = 30000; // 30 seconds fallback polling

  // Fallback polling when realtime fails
  const startFallbackPolling = useCallback(() => {
    if (pollIntervalRef.current) return; // Already polling

    pollIntervalRef.current = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["production_logs_all"] });
      queryClient.invalidateQueries({ queryKey: ["gtin-pool-count"] });
    }, pollInterval);
  }, [queryClient]);

  const stopFallbackPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!orgId) return;

    let currentChannel: ReturnType<typeof supabase.channel> | null = null;

    const setupChannel = () => {
      if (currentChannel) {
        supabase.removeChannel(currentChannel);
        currentChannel = null;
      }

      const channel = supabase
        .channel(`production_logs_realtime_${orgId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "production_logs",
            filter: `org_id=eq.${orgId}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["production_logs_all"] });
            queryClient.invalidateQueries({ queryKey: ["gtin-pool-count"] });
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            reconnectAttemptsRef.current = 0;
            // Stop fallback polling when realtime is working
            stopFallbackPolling();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            if (reconnectAttemptsRef.current < maxReconnectAttempts) {
              reconnectAttemptsRef.current++;
              reconnectTimeoutRef.current = setTimeout(() => {
                setupChannel();
              }, reconnectDelay * reconnectAttemptsRef.current);
            } else {
              // CRITICAL FIX: Start fallback polling when realtime fails permanently
              startFallbackPolling();
              toast({
                title: "Verbindungsproblem",
                description: "Echtzeit-Updates sind vorübergehend nicht verfügbar. Daten werden alle 30 Sekunden aktualisiert.",
                variant: "destructive",
              });
            }
          }
        });

      currentChannel = channel;
      return channel;
    };

    setupChannel();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (currentChannel) {
        supabase.removeChannel(currentChannel);
      }
      // Always stop polling on cleanup
      stopFallbackPolling();
    };
  }, [queryClient, orgId, startFallbackPolling, stopFallbackPolling]);
};
