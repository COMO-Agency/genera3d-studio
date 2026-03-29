import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { LabelUdiPoolEntry } from "@/hooks/useLabelUdiPool";

interface DeleteUdiDialogProps {
  entry: LabelUdiPoolEntry | null;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteUdiDialog = ({
  entry,
  onClose,
  onConfirm,
}: DeleteUdiDialogProps) => (
  <AlertDialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>UDI löschen?</AlertDialogTitle>
        <AlertDialogDescription>
          UDI-DI „{entry?.udi_di_value}" wird unwiderruflich gelöscht.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>Löschen</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default DeleteUdiDialog;
