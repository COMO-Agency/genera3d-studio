import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  className?: string;
}

const FavoriteButton = ({
  isFavorite,
  onToggle,
  className,
}: FavoriteButtonProps) => {
  const [bouncing, setBouncing] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBouncing(true);
    onToggle();
  };

  useEffect(() => {
    if (bouncing) {
      const t = setTimeout(() => setBouncing(false), 400);
      return () => clearTimeout(t);
    }
  }, [bouncing]);

  return (
    <button
      onClick={handleClick}
      className={cn(
        "p-1 rounded-full transition-colors duration-200 hover:scale-110",
        bouncing && "animate-heart-bounce",
        isFavorite
          ? "text-accent"
          : "text-muted-foreground/50 hover:text-accent/70",
        className,
      )}
      aria-label={
        isFavorite ? "Von Merkliste entfernen" : "Zur Merkliste hinzufügen"
      }
    >
      <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
    </button>
  );
};

export default FavoriteButton;
