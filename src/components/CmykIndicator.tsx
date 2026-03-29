interface CmykValues {
  cyan?: number;
  magenta?: number;
  yellow?: number;
  black?: number;
  white?: number;
  natural?: number;
}

const DOTS = [
  { key: "c", label: "C", bg: "hsl(187 100% 42%)" },
  { key: "m", label: "M", bg: "hsl(300 100% 50%)" },
  { key: "y", label: "Y", bg: "hsl(50 100% 50%)" },
  { key: "k", label: "K", bg: "hsl(0 0% 10%)" },
  { key: "w", label: "W", bg: "hsl(0 0% 95%)" },
  { key: "n", label: "N", bg: "hsl(30 30% 70%)" },
];

const CmykIndicator = ({ className, cyan, magenta, yellow, black, white, natural }: { className?: string } & CmykValues) => {
  const hasValues = cyan !== undefined || magenta !== undefined || yellow !== undefined || black !== undefined || white !== undefined;
  const values: Record<string, number> = {
    c: cyan ?? 0,
    m: magenta ?? 0,
    y: yellow ?? 0,
    k: black ?? 0,
    w: white ?? 0,
    n: natural ?? 0,
  };

  return (
    <div className={`flex gap-1.5 items-center ${className ?? ""}`}>
      {DOTS.map((d, i) => (
        <div key={d.key} className="flex items-center gap-0.5">
          <span
            className="h-2.5 w-2.5 rounded-full animate-cmyk-pulse"
            style={{
              background: d.bg,
              animationDelay: `${i * 100}ms`,
              border: d.key === "w" ? "1px solid hsl(var(--border))" : undefined,
            }}
          />
          {hasValues && (
            <span className="text-[10px] text-muted-foreground font-mono">{values[d.key].toFixed(1)}%</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default CmykIndicator;
