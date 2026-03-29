import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
}

const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
}: EmptyStateProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-neon-cyan/20 to-neon-pink/10 blur-xl scale-150 animate-neon-pulse" />
        <div className="relative h-16 w-16 rounded-full bg-card flex items-center justify-center border border-primary/20 animate-glow-breath">
          <Icon className="h-8 w-8 text-primary" />
        </div>
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      {actionLabel && actionTo && (
        <Button
          variant="outline"
          size="sm"
          className="mt-5"
          onClick={() => navigate(actionTo)}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
