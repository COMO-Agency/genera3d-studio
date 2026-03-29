import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { KeyRound, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyLabelMemberships } from "@/hooks/useLabelMembers";
import { useIsPlatformAdmin } from "@/hooks/useUserRole";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";

const Onboarding = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: memberships, isLoading: membershipsLoading } = useMyLabelMemberships();
  const { isPlatformAdmin, isLoading: roleLoading } = useIsPlatformAdmin();
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);

  const isLoading = profileLoading || membershipsLoading || roleLoading;
  const alreadySetUp = isPlatformAdmin || !!profile?.org_id || (memberships?.length ?? 0) > 0;
  if (!isLoading && alreadySetUp) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleJoin = async () => {
    if (!licenseKey.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("join_organization", {
        p_license_key: licenseKey.trim(),
      });
      if (error) throw error;
      const result = data as unknown as { success: boolean; org_id: string; org_name: string };
      toast({
        title: "Organisation beigetreten!",
        description: `Du bist jetzt Mitglied von „${result.org_name}".`,
      });
      // Consistent cache invalidation - wait for all to complete before navigation
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["organization"] }),
        queryClient.invalidateQueries({ queryKey: ["org_colors"] }),
        queryClient.invalidateQueries({ queryKey: ["org_designs"] }),
        queryClient.invalidateQueries({ queryKey: ["materials"] }),
        queryClient.invalidateQueries({ queryKey: ["production_logs_all"] }),
        queryClient.invalidateQueries({ queryKey: ["production_logs"] }),
        queryClient.invalidateQueries({ queryKey: ["label_subscriptions"] }),
        queryClient.invalidateQueries({ queryKey: ["favorites"] }),
      ]);
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      toast({ title: "Fehler", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-neon-cyan to-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="text-primary-foreground font-bold text-sm">G3</span>
        </div>
        <span className="text-2xl font-bold text-foreground tracking-tight">Genera3D</span>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Willkommen bei Genera3D
          </CardTitle>
          <CardDescription>
            Um loszulegen, tritt einer Organisation bei. Du benötigst den Lizenzschlüssel deiner Organisation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="licenseKey">Lizenzschlüssel</Label>
            <Input
              id="licenseKey"
              placeholder="z.B. G3D-XXXX-XXXX-XXXX"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              className="font-mono"
              onKeyDown={(e) => {
                if (e.key === "Enter" && licenseKey.trim()) handleJoin();
              }}
            />
            <p className="text-xs text-muted-foreground">
              Frage deinen Organisationsadmin nach dem Lizenzschlüssel.
            </p>
          </div>
          <Button
            className="w-full"
            onClick={handleJoin}
            disabled={!licenseKey.trim() || loading}
          >
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Beitreten…</> : "Organisation beitreten"}
          </Button>

          <Separator className="my-4" />

          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-3">
              Angemeldet als {user?.email}
            </p>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={signOut}>
              <LogOut className="h-3.5 w-3.5" /> Abmelden
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
