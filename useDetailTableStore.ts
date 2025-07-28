import { create } from 'zustand';
import * as XLSX from 'xlsx';
import type { RowData } from '@/types/table';
import { parseRange, toExcelRange } from '@/utils/parseTableRange';
import { resetAllStores } from '@/lib/resetAllStores'; // zamień na własny reset, jeśli nie chcesz ruszać innych store’ów

/* -------------------------------------------------------------------- */
/* Typ stanu – skopiowany z głównego, możesz usunąć pola których nie    */
/* potrzebujesz w zakładce „Det”, żeby store był lżejszy                */
/* -------------------------------------------------------------------- */
type DetailTableStore = {
  table?: File;
  isHydrated: boolean;
  workbook?: XLSX.WorkBook;
  selectedSheet?: XLSX.WorkSheet;
  selectedSheetJSON?: RowData[];
  selectedCells?: number[][];
  selectedSheetName?: string;
  isValid?: boolean;
  validationErrorReason?: string;

  previousSheetJSON?: RowData[];
  setPreviousSheetJSON: (data: RowData[]) => void;

  sheetRange?: string;
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;

  uploadedFileName?: string;

  processedData?: RowData[];
  setProcessedData: (data: RowData[]) => void;

  /* …jeśli tych pól nie używasz w Det – usuń… */
  processedTriangle?: RowData[];
  setProcessedTriangle: (data: RowData[]) => void;

  clData?: RowData[];
  setClData: (data: RowData[]) => void;

  clWeights?: RowData[];
  setClWeights: (weights: RowData[]) => void;

  /* setterów do zakresu */
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

  /* API ogólne */
  setIsHydrated: (b: boolean) => void;
  setWorkbook: (wb?: XLSX.WorkBook) => void;
  setSelectedSheetName: (name: string | undefined) => void;
  updateSheetJSON: () => void;
  resetData: () => void;

  getSheetNames: () => string[] | undefined;
  setSelectedCells: (cells: number[][]) => void;

  setUploadedFileName: (name: string) => void;
};

/* -------------------------------------------------------------------- */
/* Walidacja specyficzna dla danych w zakładce Det                      */
/* Jeśli Det ma inny format – dostosuj                                  */
/* -------------------------------------------------------------------- */
function customValidate(jsonData: any[][]) {
  if (!Array.isArray(jsonData) || jsonData.length < 2) {
    return { isValid: false, reason: 'Brak danych lub niepoprawny format.' };
  }

  const firstRow = jsonData[0];
  if (!Array.isArray(firstRow) || firstRow.length < 2) {
    return { isValid: false, reason: 'Nagłówek ma za mało kolumn.' };
  }

  for (let i = 1; i < firstRow.length; i++) {
    if (firstRow[i] === undefined || firstRow[i] === null) {
      return {
        isValid: false,
        reason: `Nagłówek: kolumna ${i + 1} nie ma wartości.`,
      };
    }
  }

  /* --- Trójkąt rozwojowy --- */
  for (let rowIdx = 1; rowIdx < jsonData.length; rowIdx++) {
    const row = jsonData[rowIdx];
    if (!row) {
      return {
        isValid: false,
        reason: `Wiersz ${rowIdx + 1}: brak danych.`,
      };
    }

    if (typeof row[0] !== 'number') {
      return {
        isValid: false,
        reason: `Wiersz ${rowIdx + 1}: pierwsza kolumna nie jest liczbą (rok).`,
      };
    }

    let emptyCount = 0;
    for (let colIdx = row.length - 1; colIdx >= 1; colIdx--) {
      if (row[colIdx] === '') emptyCount++;
      else break;
    }

    const expectedEmpty = rowIdx - 1;
    if (emptyCount !== expectedEmpty) {
      return {
        isValid: false,
        reason: `Wiersz ${rowIdx + 1}: powinno być ${expectedEmpty} pustych wartości na końcu, jest ${emptyCount}.`,
      };
    }
  }

  return { isValid: true };
}

/* -------------------------------------------------------------------- */
/* GŁÓWNY HOOK                                                          */
/* -------------------------------------------------------------------- */
export const useDetailTableStore = create<DetailTableStore>((set, get) => ({
  /* --- state --- */
  table: undefined,
  isHydrated: false,

  startRow: 1,
  endRow: 1,
  startCol: 1,
  endCol: 1,

  uploadedFileName: undefined,

  processedData: undefined,
  setProcessedData: (data) => set({ processedData: data }),

  previousSheetJSON: undefined,
  setPreviousSheetJSON: (data) => set({ previousSheetJSON: data }),

  processedTriangle: undefined,
  setProcessedTriangle: (data) => set({ processedTriangle: data }),

  clData: undefined,
  setClData: (data) => set({ clData: data }),

  clWeights: undefined,
  setClWeights: (w) => set({ clWeights: w }),

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
    if (!ref) return;
    return parseRange(ref);
  },

  /* --- inicjalizacja / reset --- */
  setIsHydrated: (b) => set({ isHydrated: b }),

  setWorkbook: (wb) => {
    const firstSheetName = wb?.SheetNames[0];
    const sheet = firstSheetName ? wb?.Sheets[firstSheetName] : undefined;
    set({
      workbook: wb,
      selectedSheetName: firstSheetName,
      sheetRange: sheet ? sheet['!ref'] : undefined,
    });
  },

  setSelectedSheetName: (name) => {
    resetAllStores(); // zamień na resetDetailStore() jeśli tylko Det ma się czyścić

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
    if (!sheet || !sheet['!ref']) {
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
      sheetRange: sheet['!ref'],
    });
  },

  /* --- główna konwersja + walidacja --- */
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

    const tempSheet = { ...sheet, ['!ref']: range };
    const jsonData = XLSX.utils.sheet_to_json<RowData>(tempSheet, {
      header: 1,
      blankrows: true,
      defval: '',
    });

    const validation = customValidate(jsonData);

    if (!validation.isValid) {
      set({
        isValid: false,
        validationErrorReason: validation.reason,
        selectedSheetJSON: undefined,
        selectedCells: undefined,
      });
      return;
    }

    const selectedCells = jsonData.map((row) =>
      row.map((cell) => {
        const n = typeof cell === 'number' ? cell : Number(cell);
        return isNaN(n) ? 0 : 1;
      }),
    );

    set({
      previousSheetJSON: get().selectedSheetJSON,
      selectedSheetJSON: jsonData,
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
      processedTriangle: undefined,
      clData: undefined,
      clWeights: undefined,
    }),

  /* --- helpers --- */
  getSheetNames: () => get().workbook?.SheetNames,
  setSelectedCells: (cells) => set({ selectedCells: cells }),
  setUploadedFileName: (name) => set({ uploadedFileName: name }),
}));
