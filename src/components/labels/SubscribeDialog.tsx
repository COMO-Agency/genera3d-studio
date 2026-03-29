import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labelName: string;
  termsConditions: string;
  onAccept: () => void;
  isPending?: boolean;
}

const SubscribeDialog = ({
  open,
  onOpenChange,
  labelName,
  termsConditions,
  onAccept,
  isPending,
}: Props) => {
  const [accepted, setAccepted] = useState(false);

  const handleOpenChange = (v: boolean) => {
    if (!v) setAccepted(false);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nutzungsbedingungen – {labelName}</DialogTitle>
          <DialogDescription>
            Bitte lies die Nutzungsbedingungen und bestätige, um das Label zu
            abonnieren.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-64 rounded-md border border-border p-4">
          <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-sm text-foreground">
            {termsConditions}
          </div>
        </ScrollArea>

        <div className="flex items-center gap-2">
          <Checkbox
            id="accept-tc"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
          />
          <label
            htmlFor="accept-tc"
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Ich akzeptiere die Nutzungsbedingungen von {labelName}
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={onAccept} disabled={!accepted || isPending}>
            {isPending ? "Wird abonniert…" : "Abonnieren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubscribeDialog;
