'use client';

import { useForm } from 'react-hook-form';
import { useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as XLSX from 'xlsx';
import { useEffect, useState } from 'react';
import { useDetailTableStore } from '@/stores/useDetailTableStore';
import { useTestTriangleStore } from '@/stores/useTestTriangleStore';
import { useTrainDevideStoreDet } from '@/stores/trainDevideStoreDeterministyczny';
import { useTrainDevideStoreSummary } from '@/stores/trainDevideStoreSummary';
import { useLabelsStore } from '@/stores/useLabelsStore';
import { z } from 'zod';
import { SheetSelectDet } from '@/components/SheetSelectDet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { DataTypeSelector } from '@/components/DataTypeSelector';
import type { DataType } from '@/components/DataTypeSelector';
import { HeadersSelector } from '@/components/HeadersSelector';
import { convertIncrementalToCumulative } from '@/utils/dataConversion';
import { FileUploadSection, RangeInputSection } from '@/components/InputFormSections';
import Modal from '@/components/Modal';
import { resetAllStores } from '@/lib/resetAllStores';
import { EditablePaidTriangle } from '@/components/EditablePaidTriangle';

// Funkcje konwersji Excel notacji
const colLetterToNumber = (col: string): number => {
  let result = 0;
  for (let i = 0; i < col.length; i++) {
    result = result * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return result;
};

const colNumberToLetter = (num: number): string => {
  let result = '';
  while (num > 0) {
    num--;
    result = String.fromCharCode((num % 26) + 'A'.charCodeAt(0)) + result;
    num = Math.floor(num / 26);
  }
  return result;
};

const parseExcelCell = (cell: string): { row: number; col: number } | null => {
  const match = cell.match(/^([A-Z]+)(\d+)$/);
  if (!match || !match[1] || !match[2]) return null;
  
  const colLetter = match[1];
  const rowNumber = parseInt(match[2], 10);
  
  if (isNaN(rowNumber)) return null;
  
  return {
    row: rowNumber,
    col: colLetterToNumber(colLetter)
  };
};

const isMeaningfulXlsxCell = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
};

const isZeroLikeXlsxCell = (value: unknown): boolean => {
  if (typeof value === 'number') {
    return value === 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');
    if (normalized === '') return false;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed === 0;
  }

  return false;
};

// 🆕 Importy store'ów symulacyjnych do czyszczenia
import { useTableStore } from '@/stores/tableStore';
import { useStochStore } from '@/stores/useStochStore';
import { useBootStore } from '@/stores/useBootStore';
import { useUltimateStore } from '@/stores/useUltimateStore';
import { useStochResultsStore } from '@/stores/useStochResultsStore';
import { useBootParamResultsStore } from '@/stores/useBootParamResultsStore';
import { useTrainDevideStore } from '@/stores/trainDevideStore';
import { useMultStochStore } from '@/stores/multStochStore';
import { useBootParamStore } from '@/stores/bootParamStore';
import { useBootResultsStore } from '@/stores/useBootResultsStore';

const schema = z.object({
  rowStart: z.union([z.coerce.number().min(1, "Wiersz początkowy musi być co najmniej 1"), z.string()]),
  rowEnd: z.coerce.number().min(1, "Wiersz końcowy musi być co najmniej 1"),
  colStart: z.coerce.number().min(1, "Kolumna początkowa musi być co najmniej 1"),
  colEnd: z.coerce.number().min(1, "Kolumna końcowa musi być co najmniej 1"),
  cellStart: z.string().optional(),
  cellEnd: z.string().optional(),
  rangeMode: z.enum(['numeric', 'excel']),
  file: z.any(),
}).refine((data) => {
  if (data.rangeMode === 'excel') {
    if (!data.cellStart || !data.cellEnd) {
      return false;
    }
    const startCell = parseExcelCell(data.cellStart.toUpperCase());
    const endCell = parseExcelCell(data.cellEnd.toUpperCase());
    return startCell !== null && endCell !== null && 
           startCell.row <= endCell.row && startCell.col <= endCell.col;
  } else {
    const startRow = typeof data.rowStart === 'string' ? 1 : data.rowStart;
    return startRow <= data.rowEnd && data.colStart <= data.colEnd;
  }
}, {
  message: "Nieprawidłowy zakres - sprawdź format komórek (np. A1, B2) i kolejność",
  path: ["cellEnd"],
});
type FormField = z.infer<typeof schema>;




/* --------------------------------------------------------------------- */
export function InputDataTabDet() {
  /* ---------- Lokalny UI‑owy stan ---------- */
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [pendingFormData, setPendingFormData] = useState<FormField | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const editTriangleRef = useRef<{ handleClose: () => void }>(null);
  
  // 🆕 Synchronizacja rangeMode ze store (zapamiętywanie między przełączeniami zakładek)
  const storedRangeMode = useDetailTableStore(s => s.rangeMode ?? 'numeric');
  const setStoredRangeMode = useDetailTableStore(s => s.setRangeMode);
  const storedCellStart = useDetailTableStore(s => s.cellStart);
  const storedCellEnd = useDetailTableStore(s => s.cellEnd);
  const setStoredCellRange = useDetailTableStore(s => s.setCellRange);
  const [rangeMode, setRangeMode] = useState<'numeric' | 'excel'>(storedRangeMode);


  /* ---------- Zustanda – store „detaliczny” ---------- */
  const {
    workbook,
    isValid,
    selectedSheetJSON,
    previousSheetJSON,
    validationErrorReason,
    setWorkbook,
    getDefaultRange,
    setRangeAndUpdate,
    uploadedFileName,
    setUploadedFileName,
    selectedSheetName,
    lastApprovedSettings,
    setLastApprovedSettings,
  } = useDetailTableStore();

  const { 
    detRowLabels: rowLabels, 
    detColumnLabels: columnLabels, 
    setDetRowLabels: setRowLabels, 
    setDetColumnLabels: setColumnLabels,
    globalRowLabels,
    globalColumnLabels,
    lastLoadedFile
  } = useLabelsStore();

  // Store Paid dla funkcji czyszczących
  const paidStore = useTrainDevideStoreDet();
  const summaryStore = useTrainDevideStoreSummary();

const setPaidTriangle = useTrainDevideStoreDet((s) => s.setPaidTriangle);

  // Store dla ustawień input'a - używamy indywidualnych ustawień z detailTableStore
  const {
    dataType,
    setDataType,
    incrementDataGeneration,
    hasHeaders,
    setHasHeaders,
    dataGenerationId,
  } = useDetailTableStore();

  /* ---------- React‑hook‑form ---------- */
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormField>({
    resolver: zodResolver(schema),
    defaultValues: {
      rowStart: 1,
      rowEnd: 1,
      colStart: 1,
      colEnd: 1,
      cellStart: storedCellStart || "A1",
      cellEnd: storedCellEnd || "A1",
      rangeMode: storedRangeMode,
    },
  });

  // 🔧 Funkcje do automatycznej konwersji na wielkie litery w polach Excel
  const handleCellStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setValue('cellStart', value);
    setStoredCellRange(value, getValues('cellEnd') || '');
  };

  const handleCellEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setValue('cellEnd', value);
    setStoredCellRange(getValues('cellStart') || '', value);
  };

  const validateTriangleForCurrentMode = (
    modeHasHeaders: boolean,
    startRow: number,
    endRow: number,
    startCol: number,
    endCol: number,
  ): string | null => {
    const activeSheet = selectedSheetName ? workbook?.Sheets[selectedSheetName] : undefined;
    if (!activeSheet) return null;

    const dataStartRow = modeHasHeaders ? startRow + 1 : startRow;
    const dataStartCol = modeHasHeaders ? startCol + 1 : startCol;
    const dataRows = endRow - dataStartRow + 1;
    const dataCols = endCol - dataStartCol + 1;

    if (dataRows <= 0 || dataCols <= 0) {
      return modeHasHeaders
        ? 'Dla opcji „zawierają podpisy” zakres musi mieć co najmniej 2 wiersze i 2 kolumny (1 wiersz + 1 kolumna na podpisy).'
        : 'Nieprawidłowy zakres danych. Sprawdź początek i koniec zakresu.';
    }

    for (let rowIndex = 0; rowIndex < dataRows; rowIndex++) {
      const rowNumber = dataStartRow + rowIndex;
      const maxFilledColIndex = dataCols - 1 - rowIndex;

      for (let colIndex = 0; colIndex < dataCols; colIndex++) {
        const colNumber = dataStartCol + colIndex;
        const address = XLSX.utils.encode_cell({ r: rowNumber - 1, c: colNumber - 1 });
        const cellValue = activeSheet[address]?.v;
        const hasValue = isMeaningfulXlsxCell(cellValue);
        const shouldHaveValue = colIndex <= maxFilledColIndex;

        if (shouldHaveValue && !hasValue) {
          return modeHasHeaders
            ? `Dane nie pasują do opcji „zawierają podpisy” - brak danych w części trójkąta (komórka ${address}).`
            : `Dane nie pasują do opcji „nie zawierają podpisów” - brak danych w części trójkąta (komórka ${address}).`;
        }

        if (!shouldHaveValue && hasValue) {
          const isAllowedOutsideTriangle = isZeroLikeXlsxCell(cellValue);
          if (isAllowedOutsideTriangle) {
            continue;
          }

          return modeHasHeaders
            ? `Dane nie pasują do opcji „zawierają podpisy” - nadmiarowe dane poza trójkątem (komórka ${address}).`
            : `Dane nie pasują do opcji „nie zawierają podpisów” - nadmiarowe dane poza trójkątem (komórka ${address}).`;
        }
      }
    }

    return null;
  };

  const handleHeadersChange = (nextHasHeaders: boolean) => {
    setHasHeaders(nextHasHeaders);
  };

  const file = watch('file');
  const watchedRangeMode = watch('rangeMode');
  
  // Synchronizuj lokalny stan z formularzem
  useEffect(() => {
    // 🔧 Dodane zabezpieczenia przed React Minified Error #31
    if (typeof window === 'undefined') return; // Server-side protection
    
    try {
      if (watchedRangeMode && watchedRangeMode !== rangeMode) {
        setRangeMode(watchedRangeMode);
        setStoredRangeMode(watchedRangeMode);
      }
    } catch (error) {
      console.warn('🔧 Synchronizacja rangeMode - bezpieczne pominięcie błędu:', error);
    }
  }, [watchedRangeMode, setStoredRangeMode]); // Usunięto rangeMode z dependencies

  /* ---------- Synchronizacja zakresu z store'em (client-side only) ---------- */
  useEffect(() => {
    // 🔧 Dodane zabezpieczenia przed React Minified Error #31
    if (typeof window === 'undefined') return; // Server-side protection
    
    let isMounted = true;
    
    // Opóźnij do następnego tick'a żeby uniknąć problemów z hydracją
    const timer = setTimeout(() => {
      if (!isMounted) return; // Component unmounted protection
      
      try {
        const { startRow, endRow, startCol, endCol } =
          useDetailTableStore.getState();
        setValue('rowStart', startRow);
        setValue('rowEnd', endRow);
        setValue('colStart', startCol);
        setValue('colEnd', endCol);
        setValue('cellStart', storedCellStart || 'A1');
        setValue('cellEnd', storedCellEnd || 'A1');
      } catch (error) {
        console.warn('🔧 Synchronizacja zakresu - bezpieczne pominięcie błędu:', error);
      }
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [setValue, storedCellStart, storedCellEnd]);

  // WYŁĄCZONE: Automatyczna subskrypcja powodowała nadpisywanie ręcznych zmian
  // useEffect(() => {
  //   // Subskrybuj zmiany store'a po client-side hydration
  //   const timer = setTimeout(() => {
  //     const unsub = useDetailTableStore.subscribe((state) => {
  //       setValue('rowStart', state.startRow);
  //       setValue('rowEnd', state.endRow);
  //       setValue('colStart', state.startCol);
  //       setValue('colEnd', state.endCol);
  //     });
      
  //     return () => unsub();
  //   }, 0);

  //   return () => clearTimeout(timer);
  // }, [setValue]);

  /* ---------- Ładowanie pliku ---------- */
  const handleFileLoad = () => {
    const f = file?.[0];
    if (!f) {
      setErrorMessage("Najpierw wybierz plik Excel (.xlsx lub .xls).");
      setShowErrorDialog(true);
      return;
    }

    // Sprawdź rozmiar pliku (max 10MB)
    if (f.size > 10 * 1024 * 1024) {
      setErrorMessage("Plik jest za duży. Maksymalny rozmiar to 10MB.");
      setShowErrorDialog(true);
      return;
    }

    // Sprawdź rozszerzenie pliku
    const validExtensions = ['.xlsx', '.xls'];
    const fileName = f.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      setErrorMessage("Nieprawidłowy format pliku. Wybierz plik Excel (.xlsx lub .xls).");
      setShowErrorDialog(true);
      return;
    }

    const reader = new FileReader();
    let lastProgressUpdate = 0;

    reader.onloadstart = () => {
      setIsLoading(true);
      setProgress(0);
    };

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const now = Date.now();
        // Aktualizuj progress maksymalnie co 100ms aby uniknąć migania
        if (now - lastProgressUpdate > 100) {
          setProgress(Math.round((e.loaded / e.total) * 100));
          lastProgressUpdate = now;
        }
      }
    };

    reader.onload = (evt) => {
      const binaryStr = evt.target?.result;
      if (typeof binaryStr === 'string') {
        try {
          const wb = XLSX.read(binaryStr, { type: 'binary' });

          // 🆕 Wyczyść paidTriangle PRZED resetowaniem DetailTableStore
          console.log('🧹 [handleFileLoad] Czyszczę paidTriangle przed wczytaniem nowego pliku...');
          paidStore.setPaidTriangle([]);
          
          // 🆕 Wyczyść trainDevideDet żeby wymusić przeliczenie w zakładce CL
          console.log('🧹 [handleFileLoad] Czyszczę trainDevideDet...');
          paidStore.setTrainDevideDet(undefined);          
          // 🆕 Wyczyść dane z FitCurve (w tym devJPreview - tabela Initial Selection)
          console.log('🧽 [handleFileLoad] Czyszczę dane FitCurve (devJPreview)...');
          paidStore.clearFitCurveData();          
          // 🆕 Reset wszystkich ustawień do wartości domyślnych
          console.log('🔄 [handleFileLoad] Resetuję wszystkie ustawienia do domyślnych...');
          useDetailTableStore.getState().resetData();
          
          // 🆕 Reset ustawień typu danych i nagłówków do domyślnych
          console.log('🔄 [handleFileLoad] Ustawiam domyślne: skumulowane + nagłówki...');
          setDataType('cumulative'); // Resetuj do skumulowanych
          setHasHeaders(true); // Resetuj do "zawiera nagłówki"
          
          // 🆕 Wyczyść wszystkie store'y symulacyjne
          clearSimulationStores();

          
          setWorkbook(wb);
          useDetailTableStore
            .getState()
            .setSelectedSheetName(wb.SheetNames[0]);

          setUploadedFileName(f.name);
        } catch (err) {
          console.error("Błąd podczas parsowania pliku:", err);
          setErrorMessage("Nie można odczytać pliku. Sprawdź czy plik nie jest uszkodzony i czy to prawidłowy plik Excel.");
          setShowErrorDialog(true);
        }
      } else {
        setErrorMessage("Nie można odczytać zawartości pliku.");
        setShowErrorDialog(true);
      }

      setIsLoading(false);
      setProgress(0);
    };

    reader.onerror = () => {
      setErrorMessage("Wystąpił błąd podczas wczytywania pliku. Spróbuj ponownie.");
      setShowErrorDialog(true);
      setIsLoading(false);
    };

    reader.readAsBinaryString(f);
  };

  /* ---------- Wykryj zakres automatycznie ---------- */
  const handleAutoRange = () => {
    const range = getDefaultRange();
    if (!range) return;
    
    if (rangeMode === 'excel') {
      // Tryb Excel - konwertuj na format A1:Z99 (zawsze wielkie litery)
      const startCell = `${colNumberToLetter(range.startCol)}${range.startRow}`.toUpperCase();
      const endCell = `${colNumberToLetter(range.endCol)}${range.endRow}`.toUpperCase();
      
      setValue('cellStart', startCell);
      setValue('cellEnd', endCell);
      setStoredCellRange(startCell, endCell);
      
      console.log('🎯 Auto wykryty zakres Excel:', `${startCell}:${endCell}`);
    } else {
      // Tryb numeryczny - jak dotychczas
      setValue('rowStart', range.startRow);
      setValue('rowEnd', range.endRow);
      setValue('colStart', range.startCol);
      setValue('colEnd', range.endCol);
      
      console.log('🎯 Auto wykryty zakres numeryczny:', {
        rows: `${range.startRow}-${range.endRow}`,
        cols: `${range.startCol}-${range.endCol}`
      });
    }
    
    // Aktualizuj też store bezpośrednio (zawsze numerycznie)
    useDetailTableStore.setState({
      startRow: range.startRow,
      endRow: range.endRow,
      startCol: range.startCol,
      endCol: range.endCol
    });
  };

  /* ---------- Sprawdzanie czy ustawienia lub plik się zmienił ---------- */
  const hasSettingsChanged = (newData: FormField) => {
    console.log('🔍 Sprawdzanie zmian ustawień:', {
      selectedSheetJSON: selectedSheetJSON?.length || 0,
      lastApprovedSettings,
      currentSheetName: selectedSheetName,
      newData,
      currentHasHeaders: hasHeaders,
      currentDataType: dataType,
      currentFileName: uploadedFileName,
      lastLoadedFile
    });

    // Sprawdź czy nie ma zapisanych ostatnich ustawień - to oznacza pierwsze użycie
    if (!lastApprovedSettings) {
      console.log('❌ Brak ostatnich ustawień - pierwsze użycie');
      return false;
    }



    // 🆕 Sprawdź czy wczytano nowy plik (różna nazwa pliku)
    if (uploadedFileName && lastLoadedFile && uploadedFileName !== lastLoadedFile) {
      console.log('✅ Wczytano nowy plik:', uploadedFileName, '!=', lastLoadedFile);
      return true;
    }
    
    // Sprawdź czy arkusz się zmienił
    if (selectedSheetName !== lastApprovedSettings.sheetName) {
      console.log('✅ Arkusz się zmienił:', selectedSheetName, '!=', lastApprovedSettings.sheetName);
      return true;
    }

    // Sprawdź czy zakres się zmienił
    if (newData.rowStart !== lastApprovedSettings.rowStart ||
        newData.rowEnd !== lastApprovedSettings.rowEnd ||
        newData.colStart !== lastApprovedSettings.colStart ||
        newData.colEnd !== lastApprovedSettings.colEnd) {
      console.log('✅ Zakres się zmienił');
      return true;
    }

    // 🆕 Sprawdź czy ustawienia nagłówków się zmieniły
    if (hasHeaders !== lastApprovedSettings.hasHeaders) {
      console.log('✅ Ustawienie nagłówków się zmieniło:', hasHeaders, '!=', lastApprovedSettings.hasHeaders);
      return true;
    }

    // 🆕 Sprawdź czy typ danych się zmienił
    if (dataType !== lastApprovedSettings.dataType) {
      console.log('✅ Typ danych się zmienił:', dataType, '!=', lastApprovedSettings.dataType);
      return true;
    }

    console.log('❌ Brak zmian');
    return false;
  };

  /* ---------- Sprawdzenie czy istnieją obliczenia do usunięcia ---------- */
  const hasExistingCalculations = () => {
    return checkExistingCalculations();
  };

  /* ---------- Czyszczenie store'ów symulacyjnych ---------- */
  const clearSimulationStores = () => {
    console.log('🧹 [clearSimulationStores] Czyszczę wszystkie store\'y symulacyjne...');
    
    // useTableStore - dane CL i przetwarzania (brak reset, czyszczenie ręczne)
    try {
      const tableStore = useTableStore.getState();
      if (tableStore.setProcessedData) tableStore.setProcessedData([]);
      if (tableStore.setProcessedTriangle) tableStore.setProcessedTriangle([]);
      if (tableStore.setClData) tableStore.setClData([]);
      if (tableStore.setClWeights) tableStore.setClWeights([]);
    } catch (e) { console.log('⚠️ Błąd czyszczenia tableStore:', e); }
    
    // useStochStore - symulacja stochastyczna (MA funkcję reset)
    try {
      const stochStore = useStochStore.getState();
      if (stochStore.reset) {
        stochStore.reset();
        console.log('✅ useStochStore.reset() - done');
      }
    } catch (e) { console.log('⚠️ Błąd czyszczenia stochStore:', e); }
    
    // useBootStore - symulacja bootstrap (MA funkcję reset)
    try {
      const bootStore = useBootStore.getState();
      if (bootStore.reset) {
        bootStore.reset();
        console.log('✅ useBootStore.reset() - done');
      }
    } catch (e) { console.log('⚠️ Błąd czyszczenia bootStore:', e); }
    
    // useUltimateStore - symulacja ultimate (MA funkcję reset)
    try {
      const ultimateStore = useUltimateStore.getState();
      if (ultimateStore.reset) {
        ultimateStore.reset();
        console.log('✅ useUltimateStore.reset() - done');
      }
    } catch (e) { console.log('⚠️ Błąd czyszczenia ultimateStore:', e); }
    
    // useStochResultsStore - współczynniki stochastyczne (brak reset, czyszczenie ręczne)
    try {
      const stochResultsStore = useStochResultsStore.getState();
      if (stochResultsStore.setDev) stochResultsStore.setDev([]);
      if (stochResultsStore.setSd) stochResultsStore.setSd([]);
      if (stochResultsStore.setSigma) stochResultsStore.setSigma([]);
    } catch (e) { console.log('⚠️ Błąd czyszczenia stochResultsStore:', e); }
    
    // useBootParamResultsStore - współczynniki bootstrap (brak reset, czyszczenie ręczne)
    try {
      const bootParamResultsStore = useBootParamResultsStore.getState();
      if (bootParamResultsStore.setDev) bootParamResultsStore.setDev([]);
      if (bootParamResultsStore.setSd) bootParamResultsStore.setSd([]);
      if (bootParamResultsStore.setSigma) bootParamResultsStore.setSigma([]);
    } catch (e) { console.log('⚠️ Błąd czyszczenia bootParamResultsStore:', e); }
    
    // useTrainDevideStore - trójkąt współczynników (MA funkcję reset)
    try {
      const trainDevideStore = useTrainDevideStore.getState();
      if (trainDevideStore.reset) {
        trainDevideStore.reset();
        console.log('✅ useTrainDevideStore.reset() - done');
      }
    } catch (e) { console.log('⚠️ Błąd czyszczenia trainDevideStore:', e); }
    
    // useMultStochStore - reset ręczne (brak funkcji reset)
    try {
      const multStochStore = useMultStochStore.getState();
      multStochStore.selectedSheetJSON = undefined;
      multStochStore.selectedSheetName = undefined; 
      multStochStore.selectedCells = undefined;
    } catch (e) { console.log('⚠️ Błąd czyszczenia multStochStore:', e); }
    
    // useBootParamStore - MA funkcję reset
    try {
      const bootParamStore = useBootParamStore.getState();
      if (bootParamStore.reset) {
        bootParamStore.reset();
        console.log('✅ useBootParamStore.reset() - done');
      }
    } catch (e) { console.log('⚠️ Błąd czyszczenia bootParamStore:', e); }
    
    // useBootResultsStore - współczynniki bootstrap (MA funkcję reset)
    try {
      const bootResultsStore = useBootResultsStore.getState();
      if (bootResultsStore.reset) {
        bootResultsStore.reset();
        console.log('✅ useBootResultsStore.reset() - done');
      }
    } catch (e) { console.log('⚠️ Błąd czyszczenia bootResultsStore:', e); }
    
    console.log('✅ [clearSimulationStores] Wyczyszczono wszystkie store\'y symulacyjne');
  };

  /* ---------- Czyszczenie danych testowych (InputDataTabTest) ---------- */
  const clearTestInputStores = () => {
    console.log('🧹 [clearTestInputStores] Czyszczę dane z InputDataTabTest...');
    useTestTriangleStore.getState().reset();
    paidStore.clearClInitial();
    console.log('✅ [clearTestInputStores] Wyczyszczono useTestTriangleStore + cl_initial');
  };

  /* ---------- Submit formularza ---------- */
  const onSubmit = (data: FormField) => {
    console.log('📝 Submit formularza:', data);
    
    // � Konwertuj Excel zakres na numeryczny jeśli potrzeba
    let processedData = { ...data };
    
    if (data.rangeMode === 'excel') {
      if (!data.cellStart || !data.cellEnd) {
        setErrorMessage("Podaj obie komórki zakresu (od i do).");
        setShowErrorDialog(true);
        return;
      }
      
      const startCell = parseExcelCell(data.cellStart.toUpperCase());
      const endCell = parseExcelCell(data.cellEnd.toUpperCase());
      
      if (!startCell || !endCell) {
        setErrorMessage(`Nieprawidłowy format komórek. Użyj formatu jak A1, B2, AK150 itp.`);
        setShowErrorDialog(true);
        return;
      }
      
      // Konwertuj na numeryczne współrzędne
      processedData.rowStart = startCell.row;
      processedData.rowEnd = endCell.row;
      processedData.colStart = startCell.col;
      processedData.colEnd = endCell.col;
      
      console.log('🔄 Konwersja Excel->Numeryczny:', {
        original: `${data.cellStart}:${data.cellEnd}`,
        converted: `${startCell.row}-${endCell.row} × ${startCell.col}-${endCell.col}`
      });
    }
    
    // 🔍 WALIDACJA KWADRATOWOŚCI - pierwsze sprawdzenie (przed sprawdzaniem zmian)
    let dataRows, dataCols;
    
    // Konwertuj rowStart na liczbę jeśli to string
    const numericRowStart = typeof processedData.rowStart === 'string' ? 1 : processedData.rowStart;
    
    if (hasHeaders) {
      // Z nagłówkami: odejmuj 1 od każdego wymiaru
      dataRows = processedData.rowEnd - numericRowStart;      
      dataCols = processedData.colEnd - processedData.colStart;      
    } else {
      // Bez nagłówków: cały zakres to dane
      dataRows = processedData.rowEnd - numericRowStart + 1;  
      dataCols = processedData.colEnd - processedData.colStart + 1;  
    }

    if (dataRows !== dataCols) {
      console.error('❌ [onSubmit] Dane nie są kwadratowe:', {dataRows, dataCols, hasHeaders});
      const rangeInfo = data.rangeMode === 'excel' 
        ? `${data.cellStart}:${data.cellEnd}` 
        : `${processedData.rowStart}-${processedData.rowEnd} × ${processedData.colStart}-${processedData.colEnd}`;
      setErrorMessage(`Liczba wczytanych wierszy musi być równa liczbie wczytanych kolumn. Zakres ${rangeInfo} daje: ${dataRows} wierszy × ${dataCols} kolumn.`);
      setShowErrorDialog(true);
      return; // Przerwij przetwarzanie
    }

    const modeCompatibilityError = validateTriangleForCurrentMode(
      hasHeaders,
      numericRowStart,
      processedData.rowEnd,
      processedData.colStart,
      processedData.colEnd,
    );

    if (modeCompatibilityError) {
      setErrorMessage(modeCompatibilityError);
      setShowErrorDialog(true);
      return;
    }

    console.log('✅ [onSubmit] Walidacja kwadratowości przeszła:', {dataRows, dataCols});
    
    // Sprawdź czy ustawienia się zmieniły względem już wczytanych danych
    const settingsChanged = hasSettingsChanged(processedData);
    const hasCalculations = hasExistingCalculations();
    
    console.log('🔄 Ustawienia się zmieniły:', settingsChanged);
    console.log('🔄 Istnieją obliczenia:', hasCalculations);
    
    // 🆕 NOWA LOGIKA: Pokaż ostrzeżenie gdy istnieją obliczenia do stracenia
    // (niezależnie od tego czy to pierwsze wczytanie czy zmiana ustawień)
    if (hasCalculations) {
      // Zapisz dane formularza i pokaż modal ostrzeżenia
      console.log('⚠️ Pokazuję modal ostrzeżenia - istnieją obliczenia do stracenia');
      setPendingFormData(processedData);
      setShowWarningModal(true);
      return;
    }

    // Jeśli nie ma obliczeń do stracenia, wykonaj normalnie
    console.log('✅ Przetwarzam dane bez modala - brak obliczeń do stracenia');
    processFormData(processedData);
  };



// Funkcja do przetwarzania danych formularza
const processFormData = (data: FormField) => {
  console.log('🔄 [processFormData] Rozpoczynam przetwarzanie danych...', data);

  // 🆕 Przy każdym ponownym wczytaniu danych Det czyścimy dane testowe
  clearTestInputStores();

  // reset dialogów
  setShowSuccessDialog(false);
  setShowErrorDialog(false);

  // Walidacja kwadratowości została przeniesiona do onSubmit()

  setRangeAndUpdate({
    startRow: typeof data.rowStart === 'string' ? 1 : data.rowStart,
    endRow: data.rowEnd,
    startCol: data.colStart,
    endCol: data.colEnd,
  });

  // Czekamy 100ms aby Zustand zdążył zaktualizować store przed odczytem danych
  setTimeout(() => {
    let { isValid: v, selectedSheetJSON: json, previousSheetJSON: prev, validationErrorReason } =
      useDetailTableStore.getState();

    // 🚨 Sprawdź czy walidacja się nie powiodła
    if (v === false) {
      console.error('❌ Walidacja danych nie powiodła się:', validationErrorReason);
      setErrorMessage(validationErrorReason || "Dane wejściowe zawierają błędy. Sprawdź czy wszystkie komórki zawierają poprawne wartości liczbowe i nie ma pustych miejsc w środku danych.");
      setShowErrorDialog(true);
      return;
    }

    // 🔍 WALIDACJA PUSTEGO ZAKRESU - sprawdź czy są jakiekolwiek dane
    if (json && json.length > 0) {
      let hasAnyData = false;
      
      // Sprawdź czy w całym json jest jakakolwiek wartość różna od 0, null, undefined, ""
      for (let i = 0; i < json.length; i++) {
        const row = json[i];
        if (!row) continue; // Pomiń puste wiersze
        
        for (let j = 0; j < row.length; j++) {
          const cell = row[j];
          if (cell !== null && cell !== undefined && cell !== "" && cell !== 0 && cell !== "0") {
            hasAnyData = true;
            break;
          }
        }
        if (hasAnyData) break;
      }
      
      if (!hasAnyData) {
        console.error('❌ Wybrany zakres nie zawiera żadnych danych:', {
          selectedRange: `${data.rowStart}-${data.rowEnd} × ${data.colStart}-${data.colEnd}`,
          sheetName: selectedSheetName || 'nieznany',
          dataPreview: json.slice(0, 3)
        });
        setErrorMessage(`Wybrany zakres ${data.rowStart}-${data.rowEnd} × ${data.colStart}-${data.colEnd} w arkuszu "${selectedSheetName || 'nieznany'}" nie zawiera żadnych danych. Sprawdź czy wybrałeś właściwy arkusz i zakres.`);
        setShowErrorDialog(true);
        return;
      }
      
      console.log('✅ Znaleziono dane w wybranym zakresie');
    }

// 🧹 KROK 1: NAJPIERW budowa body + czyszczenie trójkąta
let body: any[][] = [];
let rowNames: string[] = [];
let colNames: string[] = [];

if (json && json.length > 0) {
  if (hasHeaders) {
    // ✅ Mamy podpisy – wyciągamy je z pierwszego wiersza/kolumny
    colNames = (json[0] ?? []).slice(1).map(c => String(c ?? ''));
    rowNames = json.slice(1).map(r => String((r && r[0]) ?? ''));
    body = json.slice(1).map(r => r.slice(1)); // samo „ciało"
  } else {
    // ✅ Brak podpisów – cała tabela to dane, generujemy nazwy 1,2,3...
    body = json; // CAŁA tabela to dane!
    rowNames = Array.from({ length: body.length }, (_, i) => String(i + 1));
    colNames = Array.from({ length: body[0]?.length || 0 }, (_, i) => String(i + 1));
  }

  // 🧹 INTELIGENTNE CZYSZCZENIE TRÓJKĄTA - zamień zera "pod trójkątem" na puste
  const cleanBody = body.map((row, rowIndex) => {
    return row.map((cell, colIndex) => {
      // Jeśli komórka ma wartość 0 (liczbę lub string "0")
      if (cell === 0 || cell === "0") {
        // Oblicz oczekiwaną pozycję dla struktury trójkąta
        const expectedMaxCols = Math.max(0, body.length - rowIndex);
        
        // Jeśli kolumna jest poza oczekiwaną strukturą trójkąta
        if (colIndex >= expectedMaxCols) {
          return null; // Zamień na null
        }
      }
      return cell;
    });
  });

  // 🔄 KROK 2: POTEM konwersja inkrementalnych -> skumulowane (jeśli wybrano)
  let finalBody = cleanBody;
  if (dataType === 'incremental') {
    console.log('🔄 Konwertuję WYCZYSZCZONE dane inkrementalne na skumulowane (Det)...');
    
    // Rekonstruuj pełną tabelę z nagłówkami dla funkcji konwersji
    let dataForConversion: any[][];
    if (hasHeaders) {
      const headers = json[0] || [];
      const rowLabels = json.slice(1).map(r => (r && r[0]) || '');
      dataForConversion = [headers, ...cleanBody.map((row, i) => [rowLabels[i] || '', ...row])];
    } else {
      dataForConversion = cleanBody;
    }
    
    const convertedData = convertIncrementalToCumulative(dataForConversion, { hasHeaders });
    
    // Wyciągnij z powrotem samo ciało (bez nagłówków)
    if (hasHeaders) {
      finalBody = convertedData.slice(1).map(r => (r || []).slice(1));
    } else {
      finalBody = convertedData;
    }
    
    // Aktualizuj store z przekonwertowanymi danymi
    useDetailTableStore.setState({ selectedSheetJSON: convertedData });
    json = convertedData;
    
    console.log('✅ Dane przekonwertowane (Det):', convertedData);
  }

  // zapis etykiet do store'a
  setRowLabels(rowNames);
  setColumnLabels(colNames);

  // 🧽 Wyczyść dane FitCurve (w tym devJPreview) przy wczytywaniu nowych danych
  console.log('🧽 [processFormData] Czyszczę dane FitCurve (devJPreview)...');
  paidStore.clearFitCurveData();

  // numericTriangle (number|null) na bazie WYCZYSZCZONEGO i SKUMULOWANEGO finalBody
  const numericTriangle: (number | null)[][] = finalBody.map(row =>
    row.map(cell =>
      typeof cell === 'number'
        ? cell
        : cell == null || cell === ''
        ? null
        : Number.isFinite(Number(cell))
        ? Number(cell)
        : null
    )
  );
  
  setPaidTriangle(numericTriangle);

  // widok tabeli do podglądu (string|number) - używamy WYCZYSZCZONEGO i SKUMULOWANEGO finalBody
  const sheetForStore: (string | number)[][] = finalBody.map(row =>
    row.map(cell => (cell == null ? '' : typeof cell === 'number' ? cell : String(cell)))
  );
  useTrainDevideStoreDet.setState({ selectedSheetDet: sheetForStore });
}



    // (3) pokaż alert sukcesu
    setShowSuccessDialog(true);
      
    // 🆕 Zapisz globalnie informację o wczytanym pliku
    setTimeout(() => {
      const { setGlobalLabels } = useLabelsStore.getState();
      setGlobalLabels(rowNames, colNames, uploadedFileName || '');
    }, 0);
    
    setLastApprovedSettings({
      sheetName: selectedSheetName || null,
      rowStart: typeof data.rowStart === 'string' ? 1 : data.rowStart,
      rowEnd: data.rowEnd,
      colStart: data.colStart,
      colEnd: data.colEnd,
      hasHeaders,
      dataType,
    });
  }, 100); // Czekamy 100ms aby Zustand zdążył zaktualizować store
};



  



  // Obsługa potwierdzenia w modalu
  const handleConfirmDataReplace = () => {
    resetAllStores(); 
    console.log('🚨 [handleConfirmDataReplace] Rozpoczynam czyszczenie danych...');
    setShowWarningModal(false);
    
    // Wyczyść wszystkie obliczenia z zakładek Paid (tak jak Reset współczynników)
    paidStore.clearDevJResults();
    paidStore.setFinalDevJ(undefined);
    paidStore.clearAllDevFinalValues();
    paidStore.clearFitCurveData();
    paidStore.clearDevSummaryData();
    
    // 🆕 Wyczyść trainDevideDet żeby wymusić przeliczenie w zakładce CL
    console.log('🧹 [handleConfirmDataReplace] Czyszczę trainDevideDet...');
    paidStore.setTrainDevideDet(undefined);
    
    // 🆕 Wyczyść dane trójkąta żeby wymusiło przeliczenie
    console.log('🧹 [handleConfirmDataReplace] Czyszczę paidTriangle...', {
      currentTriangleLength: paidStore.paidTriangle?.length || 0,
      currentTriangleType: Array.isArray(paidStore.paidTriangle) ? 'array' : typeof paidStore.paidTriangle
    });
    paidStore.setPaidTriangle([]);
    console.log('🧹 [handleConfirmDataReplace] paidTriangle po wyczyszczeniu:', {
      newTriangleLength: paidStore.paidTriangle?.length || 0
    });
    
    // 🆕 Wyczyść oryginalne dane trójkąta przy wczytywaniu nowych
    paidStore.clearOriginalPaidTriangle();
    
    // Wyczyść tabele ResultSummary - gdy kasujemy dane Paid
    summaryStore.clearSummaryData();
    
    // 🆕 Wyczyść wszystkie store'y symulacyjne
    clearSimulationStores();
    
    if (pendingFormData) {
      console.log('📝 [handleConfirmDataReplace] Przetwarzam odłożone dane formularza...');
      
      // 🆕 Wymusimy odświeżenie komponentów przez incrementDataGeneration - PRZED processFormData
      console.log('🔄 [handleConfirmDataReplace] Incrementing dataGenerationId...');
      incrementDataGeneration();
      
      // Małe opóźnienie żeby React zdążył przetworzyć zmianę dataGenerationId
      setTimeout(() => {
        console.log('⏰ [handleConfirmDataReplace] Wywołuję processFormData po timeout...');
        processFormData(pendingFormData);
      }, 0);
      
      setPendingFormData(null);
    } else {
      console.log('⚠️ [handleConfirmDataReplace] Brak pendingFormData!');
    }
    console.log('✅ [handleConfirmDataReplace] Zakończono');
  };



  // Obsługa anulowania w modalu
  const handleCancelDataReplace = () => {
    setShowWarningModal(false);
    setPendingFormData(null);
  };

  /* ---------- Obsługa edycji trójkąta ---------- */
  // Ta funkcja już nie jest używana - usunięta
  
  /* ---------- Funkcja finalnego zapisu do store ---------- */
  const handleFinalEditSave = (editedData: (number | null)[][]) => {
    console.log('💾 [handleFinalEditSave] FINALNE zapisanie do store:', editedData.length, 'wierszy');
    
    // Zapisz dane do store (do analizy)
    setPaidTriangle(editedData);
    
    // 🆕 Zaktualizuj także selectedSheetDet dla wyświetlania tabeli
    const sheetForStore: (string | number)[][] = editedData.map(row =>
      row.map(cell => (cell == null ? '' : cell))
    );
    useTrainDevideStoreDet.setState({ selectedSheetDet: sheetForStore });
    
    // Wyczyść obliczenia bo dane się zmieniły
    paidStore.clearDevJResults();
    paidStore.setFinalDevJ(undefined);
    paidStore.setTrainDevideDet(undefined);
    
    // 🆕 Wyczyść dane FitCurve (devJPreview, simResults, r2Scores)
    paidStore.clearFitCurveData();
    
    // 🆕 Wyczyść dane Development End Summary (combinedDevJSummary)
    paidStore.clearDevSummaryData();
    
    // 🆕 Wyczyść tabele porównań (comparisonTables)
    paidStore.clearComparisonTables();
    
    // 🆕 Wyczyść wszystkie store'y symulacyjne (tak samo jak przy wczytywaniu nowych danych)
    console.log('🧹 [handleFinalEditSave] Czyszczę wszystkie store\'y symulacyjne...');
    clearSimulationStores();
    
    // Wyczyść tabele ResultSummary - gdy edytujemy dane Paid
    summaryStore.clearSummaryData();
    
    // 🆕 Wymuś odświeżenie komponentów
    incrementDataGeneration();
    
    // 🆕 Zamknij modal po zapisie
    setShowEditModal(false);
    
    console.log('✅ [handleFinalEditSave] Dane zapisane do store, wszystkie obliczenia wyczyszczone i modal zamknięty');
  };

  /* ---------- Sprawdzenie czy istnieją obliczenia ---------- */
  const checkExistingCalculations = (): boolean => {
    // Sprawdź podstawowe obliczenia z paidStore
    const hasDevJResults = paidStore.devJResults && 
                          Array.isArray(paidStore.devJResults) && 
                          paidStore.devJResults.length > 0;
    
    const hasFinalDevJ = paidStore.finalDevJ !== undefined && 
                        paidStore.finalDevJ !== null;
    
    const hasTrainData = paidStore.trainDevideDet && 
                        Array.isArray(paidStore.trainDevideDet) && 
                        paidStore.trainDevideDet.length > 0;
    
    // 🆕 Sprawdź CLTab (trójkąt reszt)
    const tableStore = useTableStore.getState();
    const hasClData = tableStore.clData && Array.isArray(tableStore.clData) && tableStore.clData.length > 0;
    
    // 🆕 Sprawdź współczynniki multiplikatywne (WspolczynnikiMultiplikatywna)
    const stochResultsStore = useStochResultsStore.getState();
    const hasStochCoefficients = (stochResultsStore.dev && stochResultsStore.dev.length > 0) ||
                                (stochResultsStore.sd && stochResultsStore.sd.length > 0) ||
                                (stochResultsStore.sigma && stochResultsStore.sigma.length > 0);
    
    // 🆕 Sprawdź współczynniki bootstrap (WspolczynnikiBootParam)
    const bootParamResultsStore = useBootParamResultsStore.getState();
    const hasBootParamCoefficients = (bootParamResultsStore.dev && bootParamResultsStore.dev.length > 0) ||
                                    (bootParamResultsStore.sd && bootParamResultsStore.sd.length > 0) ||
                                    (bootParamResultsStore.sigma && bootParamResultsStore.sigma.length > 0);
    
    // 🆕 Sprawdź współczynniki boot results
    const bootResultsStore = useBootResultsStore.getState();
    const hasBootResultsCoefficients = (bootResultsStore.dev && bootResultsStore.dev.length > 0) ||
                                      (bootResultsStore.sd && bootResultsStore.sd.length > 0) ||
                                      (bootResultsStore.sigma && bootResultsStore.sigma.length > 0);
    
    // 🆕 Sprawdź trójkąt współczynników (Zakładka Parametry)
    const trainDevideStore = useTrainDevideStore.getState();
    const hasTrainDevideCoefficients = trainDevideStore.trainDevide && 
                                      Array.isArray(trainDevideStore.trainDevide) && 
                                      trainDevideStore.trainDevide.length > 0;
    
    // 🆕 Sprawdź FitCurvePaid (dopasowanie krzywych)
    const hasDevJPreview = paidStore.devJPreview && paidStore.devJPreview.length > 0;
    const hasSimResults = paidStore.simResults && Object.keys(paidStore.simResults).length > 0;
    const hasR2Scores = paidStore.r2Scores && Object.keys(paidStore.r2Scores).length > 0;
    
    // 🆕 Sprawdź PaidDevSummaryTab (Development End)
    const hasCombinedDevJSummary = paidStore.combinedDevJSummary && paidStore.combinedDevJSummary.length > 0;
    
    // 🆕 Sprawdź PaidResultsPage (tabele porównań)
    const hasComparisonTables = paidStore.comparisonTables && paidStore.comparisonTables.length > 0;
    
    const hasCalc = Boolean(
      hasDevJResults || hasFinalDevJ || hasTrainData ||
      hasClData || hasStochCoefficients || hasBootParamCoefficients ||
      hasBootResultsCoefficients || hasTrainDevideCoefficients ||
      hasDevJPreview || hasSimResults || hasR2Scores ||
      hasCombinedDevJSummary || hasComparisonTables
    );
    
    console.log('🔍 [checkExistingCalculations] podstawowe:', {hasDevJResults, hasFinalDevJ, hasTrainData});
    console.log('🔍 [checkExistingCalculations] dodatkowe:', {hasClData, hasStochCoefficients, hasBootParamCoefficients, hasBootResultsCoefficients, hasTrainDevideCoefficients});
    console.log('🔍 [checkExistingCalculations] FitCurve:', {hasDevJPreview, hasSimResults, hasR2Scores});
    console.log('🔍 [checkExistingCalculations] DevSummary+Results:', {hasCombinedDevJSummary, hasComparisonTables});
    console.log('🔍 [checkExistingCalculations] Wynik końcowy:', hasCalc);
    return hasCalc;
  };

  const handleEditClose = () => {
    console.log('🔄 [handleEditClose] Użytkownik kliknął górny przycisk zamknij');
    if (editTriangleRef.current) {
      editTriangleRef.current.handleClose();
    } else {
      setShowEditModal(false);
    }
  };



  /* ------------------------------- JSX ------------------------------- */
  return (
    <div>
      {/* ---------- FORMULARZ ---------- */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="p-4 border rounded flex flex-col gap-4"
      >
        <Card className="bg-slate-800 border border-slate-700 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white font-bold text-sm mb-4 pb-2 border-b-2 border-gray-700">Wprowadź trójkąt danych paid, który wykorzystasz w dalszej analizie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* SEKCJA 1: Plik i arkusz */}
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-600">
              <Label className="text-white text-sm mb-3 block">Wybór pliku i arkusza</Label>
              
              {/* --- Plik --- */}
              <div className="flex items-center gap-4 mb-4">
              <input
                type="file"
                accept=".xlsx,.xls"
                className="bg-slate-700 border border-slate-600 text-white p-2 rounded-lg file:bg-slate-600 file:border-none file:text-white file:rounded file:px-3 file:py-1 file:mr-2"
                {...register('file')}
              />
              <button
                type="button"
                onClick={handleFileLoad}
                disabled={!file || file.length === 0}
                className="py-2 px-4 bg-gradient-to-br from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:shadow-2xl hover:scale-[1.02] transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Załaduj plik
              </button>
              {uploadedFileName && (
                <span className="text-sm text-green-400 ml-2">
                  Wczytano: <strong>{uploadedFileName}</strong>
                </span>
              )}
            </div>

            {/* --- Arkusz --- */}
            <div>
              <Label className="text-white text-sm">Wybór arkusza</Label>
              <SheetSelectDet />
            </div>
          </div>

          {/* SEKCJA 2: Wybór trybu zakresu */}
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-600">
            <Label className="text-white text-sm mb-3 block">Sposób podawania zakresu</Label>
            <div className="flex gap-8 mb-4">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  id="numeric-mode"
                  checked={rangeMode === 'numeric'}
                  onChange={() => {
                    setRangeMode('numeric');
                    setStoredRangeMode('numeric');
                    setValue('rangeMode', 'numeric');
                  }}
                  className="text-emerald-500 focus:ring-emerald-400 w-4 h-4"
                />
                <Label htmlFor="numeric-mode" className="text-white text-sm font-medium cursor-pointer">
                  🔢 Numeryczny (wiersze/kolumny)
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  id="excel-mode"
                  checked={rangeMode === 'excel'}
                  onChange={() => {
                    setRangeMode('excel');
                    setStoredRangeMode('excel');
                    setValue('rangeMode', 'excel');
                  }}
                  className="text-emerald-500 focus:ring-emerald-400 w-4 h-4"
                />
                <Label htmlFor="excel-mode" className="text-white text-sm font-medium cursor-pointer">
                  📊 Excel (A1:Z99)
                </Label>
              </div>
            </div>

            {/* Pola zakresu - bezpośrednio pod wyborem trybu */}
            <div className="mt-6">
              {/* Pola zakresu - tryb numeryczny */}
              {rangeMode === 'numeric' && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white text-sm">Wiersz początkowy</Label>
                      <Input
                        type="number"
                        placeholder="np. 2"
                        disabled={!workbook}
                        {...register('rowStart')}
                        className="mt-1"
                      />
                      {errors.rowStart && (
                    <p className="text-red-400 text-xs mt-1">{errors.rowStart.message}</p>
                  )}
                </div>
                <div>
                  <Label className="text-white text-sm">Wiersz końcowy</Label>
                  <Input
                    type="number"
                    placeholder="np. 11"
                    disabled={!workbook}
                    {...register('rowEnd')}
                    className="mt-1"
                  />
                  {errors.rowEnd && (
                    <p className="text-red-400 text-xs mt-1">{errors.rowEnd.message}</p>
                  )}
                </div>
                <div>
                  <Label className="text-white text-sm">Kolumna początkowa</Label>
                  <Input
                    type="number"
                    placeholder="np. 2"
                    disabled={!workbook}
                    {...register('colStart')}
                    className="mt-1"
                  />
                  {errors.colStart && (
                    <p className="text-red-400 text-xs mt-1">{errors.colStart.message}</p>
                  )}
                </div>
                <div>
                  <Label className="text-white text-sm">Kolumna końcowa</Label>
                  <Input
                    type="number"
                    placeholder="np. 11"
                    disabled={!workbook}
                    {...register('colEnd')}
                    className="mt-1"
                  />
                  {errors.colEnd && (
                    <p className="text-red-400 text-xs mt-1">{errors.colEnd.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Pola zakresu - tryb Excel */}
            {rangeMode === 'excel' && (
              <div className="flex items-end gap-4">
                  <div className="flex-1">
                      <Label className="text-white text-sm">Od komórki</Label>
                      <Input
                        type="text"
                        placeholder="A1"
                        disabled={!workbook}
                        {...register('cellStart')}
                        onChange={handleCellStartChange}
                        className="uppercase mt-1 text-center font-mono"
                      />
                      {errors.cellStart && (
                        <p className="text-red-400 text-xs mt-1">{errors.cellStart.message}</p>
                      )}
                    </div>
                    <div className="text-emerald-400 font-bold text-2xl pb-6">:</div>
                    <div className="flex-1">
                      <Label className="text-white text-sm">Do komórki</Label>
                      <Input
                        type="text"
                        placeholder="Z99"
                        disabled={!workbook}
                        {...register('cellEnd')}
                        onChange={handleCellEndChange}
                        className="uppercase mt-1 text-center font-mono"
                      />
                      {errors.cellEnd && (
                        <p className="text-red-400 text-xs mt-1">{errors.cellEnd.message}</p>
                      )}
                    </div>
                  </div>
              )}

              {/* Przycisk wykryj automatycznie */}
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={handleAutoRange}
                  variant="outline"
                  disabled={!workbook}
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 hover:border-slate-500"
                >
                  Wykryj zakres automatycznie
                </Button>
              </div>
            </div>
          </div>

          {/* SEKCJA 3: Ustawienia danych */}
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-600">
            <HeadersSelector 
              hasHeaders={hasHeaders} 
              onHeadersChange={handleHeadersChange} 
            />

            <DataTypeSelector
              dataType={dataType}
              onDataTypeChange={setDataType}
            />
          </div>
        </CardContent>
        <CardFooter>
          <input type="hidden" {...register('rangeMode')} />
          
          <button
            type="submit"
            className="py-2 px-4 bg-gradient-to-br from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:shadow-2xl hover:scale-[1.02] transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!workbook}
          >
            Wczytaj dane
          </button>
          
          {/* Przycisk do edycji trójkąta */}
          {paidStore.paidTriangle && paidStore.paidTriangle.length > 0 && (
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="py-2 px-4 bg-gradient-to-br from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:shadow-2xl hover:scale-[1.02] transform transition-all duration-200 ml-3"
            >
              ✏️ Edytuj trójkąt danych
            </button>
          )}
        </CardFooter>
        </Card>
      </form>

      {/* ---------- ALERTY ---------- */}

      {/* Błąd walidacji (czerwony) */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader className="flex flex-col items-center">
            <VisuallyHidden>
              <AlertDialogTitle>Błąd walidacji</AlertDialogTitle>
            </VisuallyHidden>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <AlertDialogDescription className="text-center text-red-600 font-medium">
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>OK</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sukces (zielony) */}
      <AlertDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader className="flex flex-col items-center">
            <VisuallyHidden>
              <AlertDialogTitle>Powiadomienie</AlertDialogTitle>
            </VisuallyHidden>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <AlertDialogDescription className="text-center text-green-600 font-medium">
              {dataType === 'incremental' 
                ? "Dane inkrementalne zostały przekonwertowane na skumulowane i poprawnie wczytane (Det)."
                : "Dane skumulowane zostały poprawnie wczytane (Det)."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>OK</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---------- Spinner podczas ładowania ---------- */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
          <div className="bg-[#1e1e2f] rounded-lg p-8 flex flex-col items-center w-80">
            <Loader2 className="animate-spin h-10 w-10 text-white mb-6" />
            <div className="w-full bg-gray-700 rounded-full h-4 mb-4 overflow-hidden">
              <div
                className="bg-gray-300 h-full transition-all duration-300 ease-in-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-white text-sm font-medium">
              Ładowanie… {progress}%
            </div>
          </div>
        </div>
      )}

      {/* MODAL OSTRZEŻENIA O UTRACIE DANYCH */}
      <Modal
        title="Ostrzeżenie"
        message="Wykryto istniejące obliczenia. Czy na pewno chcesz kontynuować? Wszystkie obecne obliczenia i wyniki analizy zostaną utracone."
        isOpen={showWarningModal}
        onConfirm={handleConfirmDataReplace}
        onCancel={handleCancelDataReplace}
      />

      {/* MODAL EDYCJI TRÓJKĄTA - pełnoekranowy */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-[#1a1a2e] flex flex-col">
          {/* Nagłówek modala */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#1a1a2e]">
            <h2 className="text-xl font-semibold text-white">
              ✏️ Edycja trójkąta danych paid
            </h2>
            <Button
              onClick={handleEditClose}
              variant="outline"
              size="sm"
              className="text-white border-white/20 hover:bg-white/10"
            >
              ✕ Zamknij
            </Button>
          </div>
          
          {/* Zawartość modala */}
          <div className="flex-1 overflow-hidden p-4">
            <EditablePaidTriangle 
              key={`editable-triangle-${dataGenerationId}`}
              ref={editTriangleRef}
              onCancel={() => setShowEditModal(false)}
              onFinalSave={handleFinalEditSave}
              hasExistingCalculations={checkExistingCalculations}
            />
          </div>
        </div>
      )}

    </div>
  );
}
