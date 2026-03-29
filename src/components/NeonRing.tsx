import { cn } from "@/lib/utils";

interface NeonRingProps {
  className?: string;
  blur?: number;
  opacity?: number;
}

const NeonRing = ({ className, blur = 18, opacity = 0.7 }: NeonRingProps) => (
  <div
    className={cn(
      "absolute inset-0 rounded-full animate-slow-rotate pointer-events-none",
      className,
    )}
    style={{
      background: `conic-gradient(from 0deg, hsl(var(--neon-pink) / 0.6), hsl(var(--neon-cyan) / 0.6), hsl(var(--neon-purple) / 0.6), hsl(var(--neon-pink) / 0.6))`,
      filter: `blur(${blur}px)`,
      opacity,
    }}
    aria-hidden="true"
  />
);

export default NeonRing;
