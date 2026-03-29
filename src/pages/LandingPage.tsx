import { Link } from "react-router-dom";
import { Glasses, ScanBarcode, Layers, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import NeonRing from "@/components/NeonRing";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const features = [
  {
    icon: Glasses,
    title: "Individuelle Fassungen",
    description: "Jede Brille wird einzeln aus Digital Acetate 3D-gedruckt — massgeschneidert fuer den Traeger.",
    glow: "neon-glow",
    color: "text-neon-cyan",
  },
  {
    icon: ScanBarcode,
    title: "UDI-Rueckverfolgung",
    description: "Lueckenlose Rueckverfolgbarkeit jeder Fassung gemaess MDR 2017/745 mit eindeutiger UDI-Kennzeichnung.",
    glow: "neon-glow-pink",
    color: "text-neon-pink",
  },
  {
    icon: Layers,
    title: "3D-Acetat-Druck",
    description: "Additive Fertigung mit Digital Acetate — das gleiche Material wie klassische Brillen, nur praeziser.",
    glow: "",
    color: "text-neon-purple",
  },
];

const LandingPage = () => {
  useDocumentTitle("Genera3D — 3D-gedruckte Acetat-Brillen");

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Background effects */}
      <div className="absolute -top-60 -left-60 h-[500px] w-[500px] rounded-full bg-neon-cyan/5 blur-3xl animate-neon-pulse pointer-events-none" />
      <div className="absolute -bottom-60 -right-60 h-[500px] w-[500px] rounded-full bg-neon-pink/5 blur-3xl animate-neon-pulse pointer-events-none" style={{ animationDelay: "1.5s" }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 sm:px-12">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-neon-cyan to-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-bold text-sm">G3</span>
          </div>
          <span className="font-semibold text-foreground tracking-tight text-lg">Genera3D</span>
        </div>
        <Link to="/login">
          <Button variant="outline" size="sm">Anmelden</Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-16 pb-24 sm:pt-28 sm:pb-32">
        {/* Neon ring behind hero */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] sm:w-[550px] sm:h-[550px] opacity-30 pointer-events-none">
          <NeonRing blur={30} opacity={0.4} />
        </div>

        <h1 className="relative text-4xl sm:text-6xl font-light tracking-tight text-foreground mb-4">
          Genera<span className="font-bold bg-gradient-to-r from-neon-cyan via-primary to-neon-purple bg-clip-text text-transparent">3D</span>
        </h1>
        <p className="relative text-lg sm:text-xl text-muted-foreground max-w-2xl mb-3">
          Praezise Brillenfertigung aus Digital Acetate — angetrieben durch additive Produktion und MDR-konforme UDI-Rueckverfolgung.
        </p>
        <p className="relative text-sm text-muted-foreground/70 mb-8">
          Kein Metall. Kein Spritzguss. 100% 3D-gedrucktes Acetat.
        </p>
        <Link to="/login" className="relative">
          <Button size="lg" className="gap-2 text-base px-8 shadow-lg shadow-primary/30">
            Jetzt anmelden
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 pb-24 sm:px-12">
        <div className="mx-auto max-w-5xl grid gap-6 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, description, glow, color }) => (
            <div
              key={title}
              className={`glass-dark rounded-2xl p-6 border border-border/50 transition-transform hover:scale-[1.02] ${glow}`}
            >
              <Icon className={`h-8 w-8 ${color} mb-4`} aria-hidden="true" />
              <h3 className="text-foreground font-medium text-lg mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 border-t border-border/30">
        <p className="text-xs text-muted-foreground">
          <a href="https://como.digital" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
            Powered by COMO Digital
          </a>
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
