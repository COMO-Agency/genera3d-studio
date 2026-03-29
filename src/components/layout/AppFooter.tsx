import { ExternalLink } from "lucide-react";
import CmykIndicator from "@/components/CmykIndicator";

const AppFooter = () => {
  return (
    <footer className="flex items-center justify-between h-8 border-t border-border bg-card px-6">
      <CmykIndicator />
      <a
        href="https://como.digital"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
      >
        © {new Date().getFullYear()} COMO Digital — Genera3D
        <ExternalLink className="h-3 w-3" />
      </a>
    </footer>
  );
};

export default AppFooter;
