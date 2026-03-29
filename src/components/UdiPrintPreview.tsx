import { format } from "date-fns";
import { ShieldCheck } from "lucide-react";
import Gs1DataMatrix from "@/components/Gs1DataMatrix";
import { Button } from "@/components/ui/button";

import { modeLabelMap } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface UdiPrintPreviewProps {
  open: boolean;
  onClose: () => void;
  log: {
    assigned_udi_pi: string | null;
    full_udi_string: string | null;
    mode: string | null;
    color: string | null;
    customer_ref: string | null;
    created_at: string | null;
    design_name: string | null;
    design_udi_di_base: string | null;
    design_version: number | null;
  } | null;
}

const UdiPrintPreview = ({ open, onClose, log }: UdiPrintPreviewProps) => {
  if (!log) return null;

  const gs1 = log.full_udi_string ?? "";

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[500px] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-sm">
            Druckvorschau — DIN A6
          </DialogTitle>
          <DialogDescription className="text-xs">
            Label-Vorschau im Format 105 × 148 mm
          </DialogDescription>
        </DialogHeader>

        {/* Print-optimized label */}
        <div className="px-4 pb-2 flex justify-center">
          <div
            className="udi-print-label bg-white text-black border border-black rounded-sm"
            style={{ width: "105mm", height: "148mm", padding: "6mm" }}
          >
            <div className="flex flex-col h-full justify-between">
              {/* Top: Design + Mode */}
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold leading-tight">
                      {log.design_name ?? "Unbekannt"}
                    </p>
                    <p className="text-[10px] text-gray-600">
                      Version {log.design_version ?? "—"}
                    </p>
                  </div>
                  <span className="text-[9px] font-semibold border border-gray-400 rounded px-1.5 py-0.5 uppercase tracking-wide">
                    {modeLabelMap[log.mode ?? ""] ?? log.mode ?? "—"}
                  </span>
                </div>
                <div className="border-t border-gray-300 my-2" />
              </div>

              {/* Center: QR Code + GS1 */}
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <Gs1DataMatrix value={gs1} size={140} type="qrcode" />
                <p className="text-[8px] font-mono text-center break-all leading-relaxed max-w-[85mm] text-gray-700">
                  {gs1}
                </p>
              </div>

              {/* Bottom: UDI-PI + Metadata */}
              <div>
                <div className="border-t border-gray-300 my-2" />
                <div className="text-center mb-2">
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">
                    UDI-PI
                  </p>
                  <p className="text-lg font-bold font-mono tracking-wide">
                    {log.assigned_udi_pi ?? "—"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px]">
                  <div>
                    <span className="text-gray-500">Produktionsdatum</span>
                    <p className="font-medium">
                      {log.created_at
                        ? format(new Date(log.created_at), "dd.MM.yyyy")
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Kundenreferenz</span>
                    <p className="font-medium">{log.customer_ref || "—"}</p>
                  </div>
                </div>

                <div className="border-t border-gray-300 mt-2 pt-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[8px] text-gray-500">
                    <ShieldCheck className="h-2.5 w-2.5" />
                    MDR 2017/745 konform
                  </div>
                  <p className="text-[8px] text-gray-500">UDI via Label</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 pt-2 flex justify-end gap-2 border-t border-border print:hidden">
          <Button variant="outline" size="sm" onClick={onClose}>
            Schließen
          </Button>
          <Button size="sm" onClick={handlePrint}>
            Drucken
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UdiPrintPreview;
