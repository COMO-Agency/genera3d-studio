import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Share2, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "@/hooks/use-toast";

interface ShareDesignButtonProps {
  designId: string;
  designName: string;
}

const ShareDesignButton = ({ designId, designName }: ShareDesignButtonProps) => {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/catalog?design=${designId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "Link kopiert" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Kopieren fehlgeschlagen", variant: "destructive" });
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    if (navigator.share) {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.share({ title: designName, url });
      } catch { /* user cancelled */ }
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="lg" className="w-full" onClick={navigator.share ? handleShare : undefined}>
          <Share2 className="h-4 w-4 mr-2" />
          Teilen
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-4" align="center">
        <p className="text-sm font-medium text-center">{designName}</p>
        <div className="flex justify-center bg-white rounded-lg p-3">
          <QRCodeSVG value={url} size={160} level="M" />
        </div>
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Kopiert!" : "Link kopieren"}
        </Button>
      </PopoverContent>
    </Popover>
  );
};

export default ShareDesignButton;
