import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDetailTableStore } from '@/stores/useDetailTableStore'; // <- zmiana

export function SheetSelectDet() {
  // pobieramy dane z detail‑store’a
  const sheetNames = useDetailTableStore((s) => s.getSheetNames());
  const selectedSheetName = useDetailTableStore((s) => s.selectedSheetName);
  const setSelectedSheetName = useDetailTableStore(
    (s) => s.setSelectedSheetName,
  );

  return (
    <Select
      onValueChange={(v) => {
        if (!v) return;
        setSelectedSheetName(v);
      }}
      value={selectedSheetName ?? ''}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Wybierz arkusz" />
      </SelectTrigger>

      <SelectContent>
        {sheetNames?.map((name) => (
          <SelectItem key={name} value={name}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
