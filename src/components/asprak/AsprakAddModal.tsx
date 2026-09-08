import AsprakForm from './AsprakForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UpsertAsprakInput } from '@/lib/fetchers/asprakFetcher';

interface AsprakAddModalProps {
  onSubmit: (data: UpsertAsprakInput) => Promise<void>;
  onClose: () => void;
  open: boolean;
}

export default function AsprakAddModal({ onSubmit, onClose, open }: AsprakAddModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[min(720px,90vh)] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Input Manual Asprak</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-4">
            <AsprakForm onSubmit={onSubmit} onCancel={onClose} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
