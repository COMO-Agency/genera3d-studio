import { useState, useMemo } from "react";
import { useIsLabelAdmin } from "@/hooks/useLabelMembers";
import { useLabelDesigns } from "@/hooks/useLabelDesigns";
import {
  useLabelUdiPool,
  useCreateLabelUdi,
  useCreateLabelUdiBatch,
  useUpdateLabelUdi,
  useDeleteLabelUdi,
  type LabelUdiPoolEntry,
} from "@/hooks/useLabelUdiPool";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import UdiPoolStats from "@/components/udi-pool/UdiPoolStats";
import UdiPoolTable from "@/components/udi-pool/UdiPoolTable";
import AddUdiDialog from "@/components/udi-pool/AddUdiDialog";
import BatchImportDialog from "@/components/udi-pool/BatchImportDialog";
import EditPriceDialog from "@/components/udi-pool/EditPriceDialog";
import DeleteUdiDialog from "@/components/udi-pool/DeleteUdiDialog";

const LabelAdminUdiPool = () => {
  const { labelId } = useIsLabelAdmin();
  const { data: pool = [], isLoading } = useLabelUdiPool(labelId);
  const { data: designs = [] } = useLabelDesigns(labelId ?? undefined);

  const createUdi = useCreateLabelUdi();
  const createBatch = useCreateLabelUdiBatch();
  const updateUdi = useUpdateLabelUdi();
  const deleteUdi = useDeleteLabelUdi();

  const [addOpen, setAddOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<LabelUdiPoolEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<LabelUdiPoolEntry | null>(
    null,
  );

  const stats = useMemo(() => {
    const total = pool.length;
    const available = pool.filter((p) => p.is_available).length;
    return { total, available, sold: total - available };
  }, [pool]);

  if (!labelId)
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Kein Label zugewiesen. Bitte zuerst eine Label-Mitgliedschaft anlegen.
      </div>
    );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[20vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UdiPoolStats
        total={stats.total}
        available={stats.available}
        sold={stats.sold}
      />

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> UDI hinzufügen
        </Button>
        <Button size="sm" variant="outline" onClick={() => setBatchOpen(true)}>
          <Upload className="h-4 w-4 mr-1" /> Batch-Import
        </Button>
      </div>

      <UdiPoolTable
        pool={pool}
        onEdit={(entry) => setEditEntry(entry)}
        onDelete={(entry) => setDeleteEntry(entry)}
      />

      <AddUdiDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        designs={designs}
        onSubmit={(designId, udiValue, priceCents) =>
          createUdi.mutate(
            {
              label_id: labelId,
              label_design_id: designId,
              udi_di_value: udiValue,
              price_cents: priceCents,
            },
            { onSuccess: () => setAddOpen(false) },
          )
        }
        isPending={createUdi.isPending}
      />

      <BatchImportDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        designs={designs}
        onSubmit={(designId, udiValues, priceCents) =>
          createBatch.mutate(
            {
              label_id: labelId,
              label_design_id: designId,
              udi_di_values: udiValues,
              price_cents: priceCents,
            },
            { onSuccess: () => setBatchOpen(false) },
          )
        }
        isPending={createBatch.isPending}
      />

      <EditPriceDialog
        entry={editEntry}
        onClose={() => setEditEntry(null)}
        onSubmit={(id, priceCents) =>
          updateUdi.mutate(
            { id, label_id: labelId, price_cents: priceCents },
            { onSuccess: () => setEditEntry(null) },
          )
        }
        isPending={updateUdi.isPending}
      />

      <DeleteUdiDialog
        entry={deleteEntry}
        onClose={() => setDeleteEntry(null)}
        onConfirm={() => {
          if (!deleteEntry) return;
          deleteUdi.mutate(
            { id: deleteEntry.id, label_id: labelId },
            { onSuccess: () => setDeleteEntry(null) },
          );
        }}
      />
    </div>
  );
};

export default LabelAdminUdiPool;
