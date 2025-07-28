import { create } from "zustand";
import * as XLSX from "xlsx";
import type { RowData } from "@/types/table";
import { parseRange, toExcelRange } from "@/utils/parseTableRange";
import { resetAllStores } from "@/lib/resetAllStores";

/* -------------------------------------------------------------------- */
/* Typ stanu                                                            */
/* -------------------------------------------------------------------- */
export type IncurredTableState = {
  /* plik / workbook */
  table?: File;
  isHydrated: boolean;
  workbook?: XLSX.WorkBook;

  /* arkusz */
  selectedSheet?: XLSX.WorkSheet;
  selectedSheetName?: string;
  sheetRange?: string;
  selectedSheetJSON?: RowData[];
  selectedCells?: number[][];

  /* poprzedni widok – do porównania */
  previousSheetJSON?: RowData[];
  setPreviousSheetJSON: (d: RowData[]) => void;

  /* zakres */
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  setStartRow: (n: number) => void;
  setEndRow: (n: number) => void;
  setStartCol: (n: number) => void;
  setEndCol: (n: number) => void;
  setRangeAndUpdate: (p: {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  }) => void;
  getDefaultRange: () =>
    | { startRow: number; startCol: number; endRow: number; endCol: number }
    | undefined;

  /* upload */
  uploadedFileName?: string;
  setUploadedFileName: (name: string) => void;

  /* przetworzone dane (opcjonalnie) */
  processedData?: RowData[];
  setProcessedData: (d: RowData[]) => void;

  /* walidacja */
  isValid?: boolean;
  validationErrorReason?: string;

  /* api ogólne */
  setIsHydrated: (b: boolean) => void;
  setWorkbook: (wb?: XLSX.WorkBook) => void;
  setSelectedSheetName: (name: string | undefined) => void;
  updateSheetJSON: () => void;
  resetData: () => void;
  getSheetNames: () => string[] | undefined;
  setSelectedCells: (cells: number[][]) => void;
};

/* -------------------------------------------------------------------- */
/* Walidator specyficzny dla Incurred – uzupełnij wg potrzeb            */
/* -------------------------------------------------------------------- */
function validateIncurred(json: any[][]) {
  if (!Array.isArray(json) || json.length < 2)
    return { isValid: false, reason: "Brak danych lub niepoprawny format." };

  /* …tu dodaj własne reguły… */

  return { isValid: true };
}

/* -------------------------------------------------------------------- */
/* GŁÓWNY HOOK                                                          */
/* -------------------------------------------------------------------- */
export const useIncurredTableStore = create<IncurredTableState>((set, get) => ({
  /* --- state --- */
  isHydrated: false,

  startRow: 1,
  endRow: 1,
  startCol: 1,
  endCol: 1,

  /* --- upload / processed --- */
  uploadedFileName: undefined,
  processedData: undefined,
  setProcessedData: (d) => set({ processedData: d }),

  previousSheetJSON: undefined,
  setPreviousSheetJSON: (d) => set({ previousSheetJSON: d }),

  /* --- zakres --- */
  setStartRow: (n) => set({ startRow: n }),
  setEndRow: (n) => set({ endRow: n }),
  setStartCol: (n) => set({ startCol: n }),
  setEndCol: (n) => set({ endCol: n }),

  setRangeAndUpdate: (r) => {
    set({
      startRow: r.startRow,
      endRow: r.endRow,
      startCol: r.startCol,
      endCol: r.endCol,
    });
    get().updateSheetJSON();
  },

  getDefaultRange: () => {
    const ref = get().sheetRange;
    return ref ? parseRange(ref) : undefined;
  },

  /* --- init / reset --- */
  setIsHydrated: (b) => set({ isHydrated: b }),

  setWorkbook: (wb) => {
    const first = wb?.SheetNames[0];
    const sheet = first ? wb?.Sheets[first] : undefined;
    set({
      workbook: wb,
      selectedSheetName: first,
      sheetRange: sheet ? sheet["!ref"] : undefined,
    });
  },

  setSelectedSheetName: (name) => {
    resetAllStores(); // zamień na resetIncurredStore() jeśli chcesz

    if (!name) {
      set({
        selectedSheetName: undefined,
        selectedSheet: undefined,
        selectedSheetJSON: undefined,
        isValid: undefined,
        validationErrorReason: undefined,
      });
      return;
    }

    const sheet = get().workbook?.Sheets[name];
    if (!sheet || !sheet["!ref"]) {
      set({
        selectedSheetName: undefined,
        selectedSheet: undefined,
        selectedSheetJSON: undefined,
        isValid: undefined,
        validationErrorReason: undefined,
      });
      return;
    }

    set({
      selectedSheetName: name,
      selectedSheet: sheet,
      sheetRange: sheet["!ref"],
    });
  },

  /* --- konwersja + walidacja --- */
  updateSheetJSON: () => {
    const name = get().selectedSheetName;
    if (!name) return;

    const sheet = get().workbook?.Sheets[name];
    if (!sheet) return;

    const range = toExcelRange({
      startRow: get().startRow,
      endRow: get().endRow,
      startCol: get().startCol,
      endCol: get().endCol,
    });

    const tempSheet = { ...sheet, ["!ref"]: range } as XLSX.WorkSheet;
    const json = XLSX.utils.sheet_to_json<RowData>(tempSheet, {
      header: 1,
      blankrows: true,
      defval: "",
    });

    const validation = validateIncurred(json);
    if (!validation.isValid) {
      set({
        isValid: false,
        validationErrorReason: validation.reason,
        selectedSheetJSON: undefined,
        selectedCells: undefined,
      });
      return;
    }

    const selectedCells = json.map((row) =>
      row.map((cell) => {
        const n = typeof cell === "number" ? cell : Number(cell);
        return isNaN(n) ? 0 : 1;
      }),
    );

    set({
      previousSheetJSON: get().selectedSheetJSON,
      selectedSheetJSON: json,
      selectedCells,
      isValid: true,
      validationErrorReason: undefined,
    });
  },

  resetData: () =>
    set({
      selectedSheetJSON: undefined,
      selectedCells: undefined,
      isValid: undefined,
      validationErrorReason: undefined,
      processedData: undefined,
    }),

  /* --- helpers --- */
  getSheetNames: () => get().workbook?.SheetNames,
  setSelectedCells: (cells) => set({ selectedCells: cells }),
  setUploadedFileName: (name) => set({ uploadedFileName: name }),
}));
