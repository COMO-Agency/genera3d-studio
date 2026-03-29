import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import NeonRing from "@/components/NeonRing";

const NotFound = () => {
  useDocumentTitle("Seite nicht gefunden");
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="text-center max-w-md relative">
        {/* Neon ring behind 404 */}
        <div className="relative w-64 h-64 mx-auto mb-8">
          <NeonRing blur={30} opacity={0.4} />
          <img
            src="/404.png"
            alt="404 - Seite nicht gefunden"
            className="relative z-10 w-full h-auto"
          />
        </div>
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-neon-cyan to-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">G3</span>
          </div>
          <span className="font-semibold text-foreground">Genera3D</span>
        </div>
        <h1 className="mb-2 text-5xl font-light text-foreground tracking-tight">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">
          Diese Seite wurde nicht gefunden. Vielleicht wurde sie verlegt — wie eine Brille auf dem Kopf.
        </p>
        <Button asChild size="lg">
          <Link to="/dashboard">Zurück zum Dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
