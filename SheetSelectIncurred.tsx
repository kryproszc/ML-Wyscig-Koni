import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIncurredTableStore } from "@/stores/useIncurredTableStore";

export function SheetSelectIncurred() {
  // pobieramy dane z store’a Incurred
  const sheetNames = useIncurredTableStore((s) => s.getSheetNames());
  const selectedSheetName = useIncurredTableStore((s) => s.selectedSheetName);
  const setSelectedSheetName = useIncurredTableStore(
    (s) => s.setSelectedSheetName,
  );

  return (
    <Select
      onValueChange={(v) => {
        if (!v) return;
        setSelectedSheetName(v);
      }}
      value={selectedSheetName ?? ""}
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
