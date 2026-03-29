import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { UserCheck, X } from "lucide-react";
import { useCustomerSession } from "@/hooks/useCustomerSession";

const CustomerSessionBanner = () => {
  const { active, customerName, startedAt, endSession } = useCustomerSession();
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!active || !startedAt) return;
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(`${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, startedAt]);

  if (!active) return null;

  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-primary/10 border-b border-primary/20 text-sm animate-slide-down">
      <div className="flex items-center gap-2">
        <UserCheck className="h-4 w-4 text-primary" />
        <span className="font-medium">Beratung für:</span>
        <span className="text-primary font-semibold">{customerName}</span>
        <span className="text-muted-foreground text-xs">({elapsed})</span>
      </div>
      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={endSession}>
        <X className="h-3 w-3 mr-1" /> Beenden
      </Button>
    </div>
  );
};

export default CustomerSessionBanner;
