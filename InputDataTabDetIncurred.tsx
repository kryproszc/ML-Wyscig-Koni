"use client";

import { useForm } from "react-hook-form";
import { useRef } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import * as XLSX from "xlsx";
import { useEffect, useState } from "react";
import { useIncurredTableStore } from "@/stores/useIncurredTableStore";
import { useTestTriangleStoreIncurred } from "@/stores/useTestTriangleStoreIncurred";
import { useTrainDevideStoreDetIncurred } from "@/stores/trainDevideStoreDeterministycznyIncurred";
import { useTrainDevideStoreSummary } from "@/stores/trainDevideStoreSummary";
import { useLabelsStore } from "@/stores/useLabelsStore";
import { useBootParamStore } from "@/stores/bootParamStore";
import { useBootParamDevideStore } from "@/stores/bootParamDevideStore";
import { useModelDataStore } from "@/stores/modelDataStore";
import { useBootStore } from "@/stores/useBootStore";
import { useStochStore } from "@/stores/useStochStore";
import { useUltimateStore } from "@/stores/useUltimateStore";
import { useBootParamResultsStore } from "@/stores/useBootParamResultsStore";
import { useStochResultsStore } from "@/stores/useStochResultsStore";
import { useBootResultsStore } from "@/stores/useBootResultsStore";
import { z } from "zod";
import { SheetSelectIncurred } from "@/components/SheetSelectIncurred";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { DataTypeSelector } from "@/components/DataTypeSelector";
import { HeadersSelector } from "@/components/HeadersSelector";
import { convertIncrementalToCumulative } from "@/utils/dataConversion";

import { resetAllStores } from "@/lib/resetAllStores";
import { EditableIncurredTriangle } from '@/components/EditableIncurredTriangle';
import Modal from '@/components/Modal';



/* ------------------------------------------------------------------ */
/* Funkcje konwersji Excel                                             */
/* ------------------------------------------------------------------ */
function colLetterToNumber(letter: string): number {
  let col = 0;
  for (let i = 0; i < letter.length; i++) {
    col = col * 26 + (letter.charCodeAt(i) - 64);
  }
  return col;
}

function colNumberToLetter(num: number): string {
  let letter = '';
  while (num > 0) {
    const remainder = (num - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    num = Math.floor((num - 1) / 26);
  }
  return letter;
}

function parseExcelCell(cell: string): { row: number; col: number } | null {
  const match = cell.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  return {
    col: colLetterToNumber(match[1]!),
    row: parseInt(match[2]!, 10),
  };
}

function getWorksheetCellValue(
  worksheet: XLSX.WorkSheet,
  row: number,
  col: number
): unknown {
  const address = XLSX.utils.encode_cell({ r: row - 1, c: col - 1 });
  const cell = worksheet[address];
  if (!cell) return undefined;
  return cell.w ?? cell.v;
}

function isMeaningfulCellValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  return String(value).trim() !== '';
}

function isZeroLikeCellValue(value: unknown): boolean {
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
}

function isMissingTriangleValue(value: unknown): boolean {
  const display = String(value ?? '').trim();
  return display === '' || display === '-';
}

type TriangleValidationResult = {
  isValid: boolean;
  error?: string;
  dataStartRow: number;
  dataStartCol: number;
  dataRows: number;
  dataCols: number;
};

/* ------------------------------------------------------------------ */
/* Zod – formularz (zakres + plik)                                     */
/* ------------------------------------------------------------------ */
const schema = z.object({
  rowStart: z.union([z.coerce.number(), z.string()]).refine(
    (val) => {
      if (typeof val === 'number') return val >= 1;
      return true;
    },
    { message: "Wiersz początkowy musi być co najmniej 1" }
  ),
  rowEnd: z.union([z.coerce.number(), z.string()]).refine(
    (val) => {
      if (typeof val === 'number') return val >= 1;
      return true;
    },
    { message: "Wiersz końcowy musi być co najmniej 1" }
  ),
  colStart: z.coerce.number().min(1, "Kolumna początkowa musi być co najmniej 1"),
  colEnd: z.coerce.number().min(1, "Kolumna końcowa musi być co najmniej 1"),
  cellStart: z.string().optional(),
  cellEnd: z.string().optional(),
  rangeMode: z.enum(['numeric', 'excel']),
  file: z.any(),
}).refine((data) => {
  if (data.rangeMode === 'numeric') {
    const rowStart = typeof data.rowStart === 'number' ? data.rowStart : 1;
    const rowEnd = typeof data.rowEnd === 'number' ? data.rowEnd : 1;
    return rowStart <= rowEnd;
  }
  return true;
}, {
  message: "Wiersz początkowy nie może być większy od wiersza końcowego",
  path: ["rowEnd"],
}).refine((data) => data.colStart <= data.colEnd, {
  message: "Kolumna początkowa nie może być większa od kolumny końcowej", 
  path: ["colEnd"],
});
type FormField = z.infer<typeof schema>;



/* ------------------------------------------------------------------ */
/* GŁÓWNY KOMPONENT                                                    */
/* ------------------------------------------------------------------ */
export function InputDataTabIncurred() {
  /* ---------- Lokalny UI‑owy stan ---------- */
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const [pendingFormData, setPendingFormData] = useState<FormField | null>(null);
  const editTriangleRef = useRef<{ handleClose: () => void }>(null);
  
  // 🆕 Synchronizacja rangeMode ze store (zapamiętywanie między przełączeniami zakładek)
  const storedRangeMode = useIncurredTableStore(s => s.rangeMode ?? 'numeric');
  const setStoredRangeMode = useIncurredTableStore(s => s.setRangeMode);
  const [rangeMode, setRangeMode] = useState<'numeric' | 'excel'>(storedRangeMode);


const setIncurredTriangle = useTrainDevideStoreDetIncurred(s => s.setIncurredTriangle);

  /* ---------- Zustand – store Incurred ---------- */
  const {
    workbook,
    isValid,
    selectedSheetJSON,
    // jeśli w store nie masz previousSheetJSON – usuń kolejną linijkę i kawałek logiki niżej
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
  } = useIncurredTableStore();

  const { 
    incurredRowLabels: rowLabels, 
    incurredColumnLabels: columnLabels, 
    setIncurredRowLabels: setRowLabels, 
    setIncurredColumnLabels: setColumnLabels,
    globalRowLabels,
    globalColumnLabels,
    lastLoadedFile
  } = useLabelsStore();

  // Store Incurred dla funkcji czyszczących
  const incurredStore = useTrainDevideStoreDetIncurred();
  const summaryStore = useTrainDevideStoreSummary();
  
  // Dodatkowe stores dla kompletnego czyszczenia
  const bootParamStore = useBootParamStore();
  const bootParamDevideStore = useBootParamDevideStore();
  const modelDataStore = useModelDataStore();
  
  // Stores z metodami stochastycznymi
  const bootStore = useBootStore();
  const stochStore = useStochStore();
  const ultimateStore = useUltimateStore();
  const bootParamResultsStore = useBootParamResultsStore();
  const stochResultsStore = useStochResultsStore();
  const bootResultsStore = useBootResultsStore();

  // Store dla ustawień input'a
  // Store dla ustawień input'a - używamy indywidualnych ustawień z incurredTableStore
  const {
    dataType,
    setDataType,
    hasHeaders,
    setHasHeaders,
  } = useIncurredTableStore();

  /* ---------- React‑hook‑form ---------- */
  const { register, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<FormField>({
    resolver: zodResolver(schema),
    defaultValues: {
      rowStart: 1,
      rowEnd: 1,
      colStart: 1,
      colEnd: 1,
      cellStart: "A1",
      cellEnd: "A1",
      rangeMode: storedRangeMode,
    },
  });

  // 🔧 Funkcje do automatycznej konwersji na wielkie litery w polach Excel
  const handleCellStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setValue('cellStart', value);
  };

  const handleCellEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setValue('cellEnd', value);
  };

  const file = watch("file");
  const watchedRangeMode = watch("rangeMode");

  useEffect(() => {
    // 🔧 Dodane zabezpieczenia przed React Minified Error #31
    if (typeof window === 'undefined') return; // Server-side protection
    
    try {
      if (watchedRangeMode !== rangeMode) {
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
    
    // Opóźnij do następnego tick'a żeby uniknąć problemów z hydratacją
    const timer = setTimeout(() => {
      if (!isMounted) return; // Component unmounted protection
      
      try {
        const { startRow, endRow, startCol, endCol } =
          useIncurredTableStore.getState();
        setValue("rowStart", startRow);
        setValue("rowEnd", endRow);
        setValue("colStart", startCol);
        setValue("colEnd", endCol);
      } catch (error) {
        console.warn('🔧 Synchronizacja zakresu - bezpieczne pominięcie błędu:', error);
      }
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [setValue]);

  // WYŁĄCZONE: Automatyczna subskrypcja powodowała nadpisywanie ręcznych zmian
  // useEffect(() => {
  //   // Subskrybuj zmiany store'a po client-side hydration
  //   const timer = setTimeout(() => {
  //     const unsub = useIncurredTableStore.subscribe((state) => {
  //       setValue("rowStart", state.startRow);
  //       setValue("rowEnd", state.endRow);
  //       setValue("colStart", state.startCol);
  //       setValue("colEnd", state.endCol);
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
      if (typeof binaryStr === "string") {
        try {
          const wb = XLSX.read(binaryStr, { type: "binary" });

          // 🆕 Reset wszystkich ustawień do wartości domyślnych
          console.log('🔄 [handleFileLoad] Resetuję wszystkie ustawienia do domyślnych...');
          useIncurredTableStore.getState().resetData();
          
          // 🆕 Reset ustawień typu danych i nagłówków do domyślnych
          console.log('🔄 [handleFileLoad] Ustawiam domyślne: skumulowane + nagłówki...');
          setDataType('cumulative'); // Resetuj do skumulowanych
          setHasHeaders(true); // Resetuj do "zawiera nagłówki"
          
          // 🆕 Wyczyść dane z FitCurve (w tym devJPreview - tabela Initial Selection)
          console.log('🧹 [handleFileLoad] Czyszczę dane FitCurve (devJPreview)...');
          incurredStore.clearFitCurveData();
          

          
          setWorkbook(wb);
          useIncurredTableStore
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
    
    if (rangeMode === 'numeric') {
      // Tryb numeryczny - normalnie
      setValue("rowStart", range.startRow);
      setValue("rowEnd", range.endRow);
      setValue("colStart", range.startCol);
      setValue("colEnd", range.endCol);
    } else {
      // Tryb Excel - konwertuj na notację A1 (zawsze wielkie litery)
      const startCell = `${colNumberToLetter(range.startCol)}${range.startRow}`.toUpperCase();
      const endCell = `${colNumberToLetter(range.endCol)}${range.endRow}`.toUpperCase();
      setValue("cellStart", startCell);
      setValue("cellEnd", endCell);
    }
    
    // Aktualizuj też store bezpośrednio
    useIncurredTableStore.setState({
      startRow: range.startRow,
      endRow: range.endRow,
      startCol: range.startCol,
      endCol: range.endCol
    });
  };

  /* ---------- Sprawdzanie czy ustawienia lub plik się zmienił ---------- */
  const hasSettingsChanged = (newData: FormField) => {
    console.log('🔍 Sprawdzanie zmian ustawień (Incurred):', {
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

  /* ---------- Funkcja czyszcząca simulation stores ---------- */
  const clearSimulationStores = () => {
    console.log('🧹 [clearSimulationStores] Rozpoczynam czyszczenie simulation stores (Incurred)...');
    
    try {
      // Bootstrap stores - ręczne czyszczenie pól
      console.log('🧹 Czyszczenie bootParamStore i bootParamDevideStore...');
      // Zamiast reset() - ręczne czyszczenie znanych pól
      // bootParamStore i bootParamDevideStore nie mają metod reset()
      
      // Model data store - ręczne czyszczenie
      console.log('🧹 Czyszczenie modelDataStore...');
      // modelDataStore nie ma metody reset()
      
      console.log('🎉 [clearSimulationStores] Simulation stores - próba czyszczenia zakończona (Incurred)');
    } catch (error) {
      console.error('❌ [clearSimulationStores] Błąd podczas czyszczenia simulation stores (Incurred):', error);
    }
  };

  /* ---------- Czyszczenie danych testowych (InputDataTabTestIncurred) ---------- */
  const clearTestInputStoresIncurred = () => {
    console.log('🧹 [clearTestInputStoresIncurred] Czyszczę dane z InputDataTabTestIncurred...');
    useTestTriangleStoreIncurred.getState().reset();
    incurredStore.clearClInitialInc();
    console.log('✅ [clearTestInputStoresIncurred] Wyczyszczono useTestTriangleStoreIncurred + cl_initial_inc');
  };

  /* ---------- Sprawdzenie czy istnieją obliczenia do usunięcia ---------- */
  const hasExistingCalculations = () => {
    return checkExistingCalculations();
  };

  /* ---------- Submit formularza ---------- */
  const onSubmit = (data: FormField) => {
    console.log('📝 [onSubmit] Submit formularza (Incurred):', data);
    
    // Jeśli tryb Excel - konwertuj na numeryczny
    if (data.rangeMode === 'excel') {
      const startParsed = parseExcelCell(data.cellStart || '');
      const endParsed = parseExcelCell(data.cellEnd || '');
      
      if (!startParsed || !endParsed) {
        setErrorMessage('Nieprawidłowy format komórki Excel. Użyj formatu A1, B2, itp.');
        setShowErrorDialog(true);
        return;
      }
      
      data.rowStart = startParsed.row;
      data.rowEnd = endParsed.row;
      data.colStart = startParsed.col;
      data.colEnd = endParsed.col;
    }

    const worksheet = workbook && selectedSheetName
      ? (workbook as XLSX.WorkBook).Sheets[selectedSheetName]
      : undefined;

    if (!worksheet) {
      setErrorMessage('Najpierw wczytaj plik i wybierz arkusz.');
      setShowErrorDialog(true);
      return;
    }

    const validateTriangleForMode = (
      modeHasHeaders: boolean
    ): TriangleValidationResult => {
      const numericRowStart = typeof data.rowStart === 'string' ? 1 : data.rowStart;
      const numericRowEnd = typeof data.rowEnd === 'string' ? 1 : data.rowEnd;
      const dataStartRow = modeHasHeaders ? numericRowStart + 1 : numericRowStart;
      const dataStartCol = modeHasHeaders ? data.colStart + 1 : data.colStart;
      const dataRows = numericRowEnd - dataStartRow + 1;
      const dataCols = data.colEnd - dataStartCol + 1;

      if (dataRows <= 0 || dataCols <= 0) {
        return {
          isValid: false,
          error: 'Wybrany zakres nie zawiera obszaru danych po uwzględnieniu ustawienia nagłówków.',
          dataStartRow,
          dataStartCol,
          dataRows,
          dataCols,
        };
      }

      if (dataRows !== dataCols) {
        return {
          isValid: false,
          error: `Liczba wczytanych wierszy musi być równa liczbie wczytanych kolumn. Dla trybu ${modeHasHeaders ? 'z nagłówkami' : 'bez nagłówków'}: ${dataRows} wierszy × ${dataCols} kolumn.`,
          dataStartRow,
          dataStartCol,
          dataRows,
          dataCols,
        };
      }

      for (let rowIdx = 0; rowIdx < dataRows; rowIdx++) {
        const rowNumber = dataStartRow + rowIdx;
        const maxColIdx = dataCols - 1 - rowIdx;

        for (let colIdx = maxColIdx + 1; colIdx < dataCols; colIdx++) {
          const colNumber = dataStartCol + colIdx;
          const cellValue = getWorksheetCellValue(worksheet, rowNumber, colNumber);
          if (isMeaningfulCellValue(cellValue)) {
            if (isZeroLikeCellValue(cellValue)) {
              continue;
            }

            return {
              isValid: false,
              error: `Ksztalt trojkata jest nieprawidlowy. Nadmiarowe dane w komorce ${colNumberToLetter(colNumber)}${rowNumber}.`,
              dataStartRow,
              dataStartCol,
              dataRows,
              dataCols,
            };
          }
        }
      }

      for (let rowIdx = 0; rowIdx < dataRows; rowIdx++) {
        const rowNumber = dataStartRow + rowIdx;
        const maxColIdx = dataCols - 1 - rowIdx;

        for (let colIdx = 0; colIdx <= maxColIdx; colIdx++) {
          const colNumber = dataStartCol + colIdx;
          const cellValue = getWorksheetCellValue(worksheet, rowNumber, colNumber);
          if (isMissingTriangleValue(cellValue)) {
            return {
              isValid: false,
              error: `Brakuje danych w komorce ${colNumberToLetter(colNumber)}${rowNumber}.`,
              dataStartRow,
              dataStartCol,
              dataRows,
              dataCols,
            };
          }
        }
      }

      let hasAnyData = false;
      for (let row = dataStartRow; row <= numericRowEnd; row++) {
        for (let col = dataStartCol; col <= data.colEnd; col++) {
          const cellValue = getWorksheetCellValue(worksheet, row, col);
          if (isMeaningfulCellValue(cellValue)) {
            hasAnyData = true;
            break;
          }
        }
        if (hasAnyData) break;
      }

      if (!hasAnyData) {
        return {
          isValid: false,
          error: `Wybrany zakres ${numericRowStart}-${numericRowEnd} × ${data.colStart}-${data.colEnd} nie zawiera zadnych danych.`,
          dataStartRow,
          dataStartCol,
          dataRows,
          dataCols,
        };
      }

      return {
        isValid: true,
        dataStartRow,
        dataStartCol,
        dataRows,
        dataCols,
      };
    };

    const selectedModeValidation = validateTriangleForMode(hasHeaders);
    const oppositeModeValidation = validateTriangleForMode(!hasHeaders);

    if (!selectedModeValidation.isValid && oppositeModeValidation.isValid) {
      setErrorMessage(
        hasHeaders
          ? 'Wybrano tryb "z nagłówkami", ale dane wyglądają na zakres "bez nagłówków". Zmień opcję i kliknij "Wczytaj dane" ponownie.'
          : 'Wybrano tryb "bez nagłówków", ale dane wyglądają na zakres "z nagłówkami". Zmień opcję i kliknij "Wczytaj dane" ponownie.'
      );
      setShowErrorDialog(true);
      return;
    }

    if (!selectedModeValidation.isValid) {
      setErrorMessage(selectedModeValidation.error || 'Wybrany zakres danych jest nieprawidłowy.');
      setShowErrorDialog(true);
      return;
    }

    console.log('✅ [onSubmit] Walidacja trójkąta przeszła:', {
      dataRows: selectedModeValidation.dataRows,
      dataCols: selectedModeValidation.dataCols,
      hasHeaders,
    });
    
    // Sprawdź czy ustawienia się zmieniły względem już wczytanych danych
    const settingsChanged = hasSettingsChanged(data);
    const hasCalculations = hasExistingCalculations();
    
    console.log('🔄 [onSubmit] Ustawienia się zmieniły (Incurred):', settingsChanged);
    console.log('🔄 [onSubmit] Istnieją obliczenia (Incurred):', hasCalculations);
    
    // 🆕 NOWA LOGIKA: Pokaż ostrzeżenie gdy istnieją obliczenia do stracenia
    // (niezależnie od tego czy to pierwsze wczytanie czy zmiana ustawień)
    if (hasCalculations) {
      // Zapisz dane formularza i pokaż modal ostrzeżenia
      console.log('⚠️ [onSubmit] Pokazuję modal ostrzeżenia (Incurred) - istnieją obliczenia do stracenia');
      setPendingFormData(data);
      setShowWarningModal(true);
      return;
    }

    // Jeśli nie ma obliczeń do stracenia, wykonaj normalnie
    console.log('✅ [onSubmit] Przetwarzam dane bez modala (Incurred) - brak obliczeń do stracenia');
    processFormData(data);
  };

  // Obsługa potwierdzenia w modalu
  const handleConfirmDataReplace = () => {
    resetAllStores(); 
    console.log('🚨 [handleConfirmDataReplace] Rozpoczynam czyszczenie danych (Incurred)...');
    setShowWarningModal(false);
    
    // 🆕 DODATKOWE czyszczenie wszystkich stores z metod stochastycznych (tak jak przy switch)
    console.log('🧹 [handleConfirmDataReplace] Wywołuję resetAllStores() - czyszczenie metod stochastycznych...');
    resetAllStores();
    
    // Wyczyść wszystkie obliczenia z zakładek Incurred (tak jak Reset współczynników)
    incurredStore.clearDevJResults();
    incurredStore.setFinalDevJ(undefined);
    incurredStore.clearAllDevFinalValues();
    incurredStore.clearFitCurveData();
    incurredStore.clearDevSummaryData();
    
    // 🆕 Wyczyść dane z IncurredResultsPage
    console.log('🧹 [handleConfirmDataReplace] Czyszczę dane IncurredResultsPage...');
    if (typeof incurredStore.clearSimResults === 'function') {
      incurredStore.clearSimResults();
    }
    if (typeof incurredStore.clearComparisonTables === 'function') {
      incurredStore.clearComparisonTables();
    }
    // Użyj setterów do wyczyszczenia finalDevVector i combinedDevJSummary
    incurredStore.setFinalDevVector([]);
    incurredStore.setCombinedDevJSummary([]);
    
    // 🆕 Wyczyść trainDevideDetIncurred żeby wymusić przeliczenie w zakładce CL
    console.log('🧹 [handleConfirmDataReplace] Czyszczę trainDevideDetIncurred...');
    incurredStore.setTrainDevideDetIncurred(undefined);
    
    // 🆕 Wyczyść dane trójkąta żeby wymusiło przeliczenie
    console.log('🧹 [handleConfirmDataReplace] Czyszczę incurredTriangle...', {
      currentTriangleLength: incurredStore.incurredTriangle?.length || 0,
      currentTriangleType: Array.isArray(incurredStore.incurredTriangle) ? 'array' : typeof incurredStore.incurredTriangle
    });
    incurredStore.setIncurredTriangle([]);
    console.log('🧹 [handleConfirmDataReplace] incurredTriangle po wyczyszczeniu:', {
      newTriangleLength: incurredStore.incurredTriangle?.length || 0
    });
    
    // 🆕 Wyczyść oryginalne dane trójkąta przy wczytywaniu nowych
    incurredStore.clearOriginalIncurredTriangle();
    
    // Wyczyść tabele ResultSummary - gdy kasujemy dane Incurred
    summaryStore.clearSummaryData();
    
    // 🆕 Wyczyść wszystkie simulation stores
    clearSimulationStores();
    
    if (pendingFormData) {
      console.log('📝 [handleConfirmDataReplace] Przetwarzam odłożone dane formularza (Incurred)...');
      
      // Małe opóźnienie żeby React zdążył przetworzyć zmiany
      setTimeout(() => {
        console.log('⏰ [handleConfirmDataReplace] Wywołuję processFormData po timeout (Incurred)...');
        processFormData(pendingFormData);
      }, 0);
      
      setPendingFormData(null);
    } else {
      console.log('⚠️ [handleConfirmDataReplace] Brak pendingFormData (Incurred)!');
    }
    console.log('✅ [handleConfirmDataReplace] Zakończono (Incurred)');
  };

  // Obsługa anulowania w modalu
  const handleCancelDataReplace = () => {
    setShowWarningModal(false);
    setPendingFormData(null);
  };

  // DODAJ
function toNumericTriangle(json: any[][], hasHeaders: boolean): (number|null)[][] {
  if (!json || !Array.isArray(json)) {
    console.warn('⚠️ toNumericTriangle: json nie jest tablicą:', json);
    return [];
  }
  
  let body: any[][];
  
  try {
    if (hasHeaders) {
      // Mamy podpisy - usuń pierwszy wiersz i pierwszą kolumnę (zawierają etykiety)
      body = json.length > 1 ? json.slice(1).map(row => Array.isArray(row) ? row.slice(1) : []) : [];
    } else {
      // Brak podpisów - cała tabela to dane liczbowe!
      body = json.length > 0 ? json : [];
    }
    
    return body.map(row => {
      if (!Array.isArray(row)) {
        console.warn('⚠️ toNumericTriangle: wiersz nie jest tablicą:', row);
        return [];
      }
      return row.map(cell => (
        typeof cell === 'number'
          ? cell
          : (cell == null || cell === '' ? null : (Number.isFinite(Number(cell)) ? Number(cell) : null))
      ));
    });
  } catch (error) {
    console.error('❌ Błąd w toNumericTriangle:', error);
    return [];
  }
}



  // Funkcja do przetwarzania danych formularza
  const processFormData = (data: FormField) => {
    console.log('🔄 [processFormData] Rozpoczynam przetwarzanie danych (Incurred)...', data);

    // 🆕 Przy każdym ponownym wczytaniu danych Incurred czyścimy dane testowe
    clearTestInputStoresIncurred();

    // reset dialogów
    setShowSuccessDialog(false);
    setShowErrorDialog(false);

    // Walidacja kwadratowości została przeniesiona do onSubmit()

    setRangeAndUpdate({
      startRow: typeof data.rowStart === 'string' ? 1 : data.rowStart,
      endRow: typeof data.rowEnd === 'string' ? 1 : data.rowEnd,
      startCol: data.colStart,
      endCol: data.colEnd,
    });

    // Czekamy 100ms aby Zustand zdążył zaktualizować store przed odczytem danych
    setTimeout(() => {
      let {
        isValid: v,
        selectedSheetJSON: json,
        previousSheetJSON: prev, // usuń jeśli nie masz prev
        validationErrorReason,
      } = useIncurredTableStore.getState();

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

      // Zapisz nazwy kolumn i wierszy w zależności od ustawienia hasHeaders
      if (json && json.length > 0) {
        let rowNames: string[];
        let colNames: string[];
        
        if (hasHeaders) {
          // ZAWIERA podpisy - zczytujemy nazwy z pierwszej kolumny/wiersza (pomijając pierwszą komórkę przecięcia)
          colNames = (json[0] ?? []).slice(1).map(c => String(c ?? ''));
          rowNames = json.slice(1).map(r => String((r && r[0]) ?? ''));
        } else {
          // NIE ZAWIERA podpisów - cała tabela to dane, generujemy nazwy 1,2,3...
          rowNames = Array.from({ length: json.length }, (_, index) => `${index + 1}`);
          colNames = Array.from({ length: json[0]?.length || 0 }, (_, index) => `${index + 1}`);
        }
        
        setRowLabels(rowNames);
        setColumnLabels(colNames);
        
        // 🧹 Wyczyść dane FitCurve (w tym devJPreview) przy wczytywaniu nowych danych
        console.log('🧹 [processFormData] Czyszczę dane FitCurve (devJPreview)...');
        incurredStore.clearFitCurveData();
        
        // 🆕 Zapisz globalnie nazwy dla sprawdzania zmian pliku
        setTimeout(() => {
          const { setGlobalLabels } = useLabelsStore.getState();
          setGlobalLabels(rowNames, colNames, uploadedFileName || '');
        }, 0);
        
        console.log('📝 Zapisano nazwy (Incurred, hasHeaders:', hasHeaders, '):', { rowNames, colNames });
      }

      // 🧹 KROK 1: NAJPIERW wyczyść trójkąt (usuń zera "pod trójkątem")
      if (json && json.length > 0) {
        let body: any[][] = [];
        
        if (hasHeaders) {
          // ✅ Mamy podpisy – wyciągamy je z pierwszego wiersza/kolumny
          body = json.slice(1).map(r => r.slice(1)); // samo „ciało"
        } else {
          // ✅ Brak podpisów – cała tabela to dane
          body = json; // CAŁA tabela to dane!
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

        // 🔄 KROK 2: POTEM konwertuj inkrementalne→skumulowane (jeśli wybrano)
        let finalBody = cleanBody;
        if (dataType === "incremental") {
          console.log('🔄 Konwertuję WYCZYSZCZONE dane inkrementalne na skumulowane (Incurred)...');
          
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
          useIncurredTableStore.setState({ selectedSheetJSON: convertedData });
          
          console.log('✅ Dane przekonwertowane (Incurred):', convertedData);
        }

        // Konwertuj wyczyszczone (i ewentualnie skumulowane) dane na numericTriangle
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

        // Zapisz wyczyszczony trójkąt
        setIncurredTriangle(numericTriangle);

        console.log('✅ Zapisano wyczyszczony incurredTriangle:', {
          rows: numericTriangle.length,
          colsFirstRow: numericTriangle[0]?.length ?? 0,
        });
      }


      // Zawsze pokaż sukces po wczytaniu danych
      setShowSuccessDialog(true);
      
      // Zapisz ostatnie zatwierdzone ustawienia po pomyślnym wczytaniu
      setLastApprovedSettings({
        sheetName: selectedSheetName || null,
        rowStart: typeof data.rowStart === 'string' ? 1 : data.rowStart,
        rowEnd: typeof data.rowEnd === 'string' ? 1 : data.rowEnd,
        colStart: data.colStart,
        colEnd: data.colEnd,
        hasHeaders: hasHeaders,
        dataType: dataType,
      });
    }, 100); // Czekamy 100ms aby Zustand zdążył zaktualizować store
  };

  /* ---------- Sprawdzenie czy istnieją obliczenia ---------- */
  const checkExistingCalculations = (): boolean => {
    console.log('🔍 [checkExistingCalculations] Sprawdzanie stanu stores (Incurred)...');
    
    // Sprawdź czy devJResults ma jakiekolwiek elementy
    const hasDevJResults = incurredStore.devJResults && 
                          Array.isArray(incurredStore.devJResults) && 
                          incurredStore.devJResults.length > 0;
    console.log('🔍 devJResults:', {
      exists: !!incurredStore.devJResults,
      isArray: Array.isArray(incurredStore.devJResults),
      length: incurredStore.devJResults?.length || 0,
      hasData: hasDevJResults
    });
    
    // Sprawdź czy finalDevJ nie jest undefined/null
    const hasFinalDevJ = incurredStore.finalDevJ !== undefined && 
                        incurredStore.finalDevJ !== null;
    console.log('🔍 finalDevJ:', {
      exists: !!incurredStore.finalDevJ,
      value: incurredStore.finalDevJ,
      hasData: hasFinalDevJ
    });
    
    // Sprawdź czy trainDevideDetIncurred ma jakiekolwiek elementy  
    const hasTrainData = incurredStore.trainDevideDetIncurred && 
                        Array.isArray(incurredStore.trainDevideDetIncurred) && 
                        incurredStore.trainDevideDetIncurred.length > 0;
    console.log('🔍 trainDevideDetIncurred:', {
      exists: !!incurredStore.trainDevideDetIncurred,
      isArray: Array.isArray(incurredStore.trainDevideDetIncurred),
      length: incurredStore.trainDevideDetIncurred?.length || 0,
      hasData: hasTrainData
    });
    
    // Sprawdź czy FitCurve ma dane (devJPreview)
    const hasFitCurveData = incurredStore.devJPreview && 
                           Array.isArray(incurredStore.devJPreview) && 
                           incurredStore.devJPreview.length > 0;
    console.log('🔍 devJPreview:', {
      exists: !!incurredStore.devJPreview,
      isArray: Array.isArray(incurredStore.devJPreview),
      length: incurredStore.devJPreview?.length || 0,
      hasData: hasFitCurveData
    });
    
    // Sprawdź czy summaryStore ma dane (comparisonRows)
    const hasSummaryData = summaryStore.comparisonRows && 
                          Array.isArray(summaryStore.comparisonRows) && 
                          summaryStore.comparisonRows.length > 0;
    console.log('🔍 summaryStore.comparisonRows:', {
      exists: !!summaryStore.comparisonRows,
      isArray: Array.isArray(summaryStore.comparisonRows),
      length: summaryStore.comparisonRows?.length || 0,
      hasData: hasSummaryData
    });
    
    // 🆕 Sprawdź dane z IncurredResultsPage
    const hasSimResults = incurredStore.simResults && 
                         Object.keys(incurredStore.simResults).length > 0;
    const hasComparisonTables = incurredStore.comparisonTables && 
                               Array.isArray(incurredStore.comparisonTables) && 
                               incurredStore.comparisonTables.length > 0;
    const hasFinalDevVector = incurredStore.finalDevVector && 
                             Array.isArray(incurredStore.finalDevVector) && 
                             incurredStore.finalDevVector.length > 0;
    const hasCombinedDevJSummary = incurredStore.combinedDevJSummary && 
                                  Array.isArray(incurredStore.combinedDevJSummary) && 
                                  incurredStore.combinedDevJSummary.length > 0;
    console.log('🔍 IncurredResultsPage data:', {
      simResults: hasSimResults,
      comparisonTables: hasComparisonTables,
      finalDevVector: hasFinalDevVector,
      combinedDevJSummary: hasCombinedDevJSummary
    });
    
    // 🆕 Sprawdź Bootstrap simulation stores
    const hasBootStats = bootStore.stats && Object.keys(bootStore.stats).length > 0;
    const hasBootQuantiles = bootStore.quantileResult && Object.keys(bootStore.quantileResult).length > 0;
    console.log('🔍 Bootstrap stores:', {
      stats: hasBootStats,
      quantiles: hasBootQuantiles
    });
    
    // 🆕 Sprawdź Stochastic simulation stores  
    const hasStochStats = stochStore.stats && Object.keys(stochStore.stats).length > 0;
    const hasStochQuantiles = stochStore.quantileResult && Object.keys(stochStore.quantileResult).length > 0;
    console.log('🔍 Stochastic stores:', {
      stats: hasStochStats,
      quantiles: hasStochQuantiles
    });
    
    // 🆕 Sprawdź Ultimate simulation stores
    const hasUltimateStats = ultimateStore.stats && Object.keys(ultimateStore.stats).length > 0;
    const hasUltimateQuantiles = ultimateStore.quantileResult && Object.keys(ultimateStore.quantileResult).length > 0;
    console.log('🔍 Ultimate stores:', {
      stats: hasUltimateStats,
      quantiles: hasUltimateQuantiles
    });
    
    // 🆕 Sprawdź Bootstrap coefficients stores
    const hasBootParamCoeff = (bootParamResultsStore.dev && bootParamResultsStore.dev.length > 0) ||
                             (bootParamResultsStore.sd && bootParamResultsStore.sd.length > 0) ||
                             (bootParamResultsStore.sigma && bootParamResultsStore.sigma.length > 0);
    console.log('🔍 Bootstrap coefficients:', {
      dev: bootParamResultsStore.dev?.length || 0,
      sd: bootParamResultsStore.sd?.length || 0, 
      sigma: bootParamResultsStore.sigma?.length || 0,
      hasData: hasBootParamCoeff
    });
    
    // 🆕 Sprawdź Stochastic coefficients stores
    const hasStochCoeff = (stochResultsStore.dev && stochResultsStore.dev.length > 0) ||
                         (stochResultsStore.sd && stochResultsStore.sd.length > 0) ||
                         (stochResultsStore.sigma && stochResultsStore.sigma.length > 0);
    console.log('🔍 Stochastic coefficients:', {
      dev: stochResultsStore.dev?.length || 0,
      sd: stochResultsStore.sd?.length || 0,
      sigma: stochResultsStore.sigma?.length || 0,
      hasData: hasStochCoeff
    });
    
    // 🆕 Sprawdź Bootstrap results stores
    const hasBootResults = (bootResultsStore.dev && bootResultsStore.dev.length > 0) ||
                          (bootResultsStore.sd && bootResultsStore.sd.length > 0) ||
                          (bootResultsStore.sigma && bootResultsStore.sigma.length > 0);
    console.log('🔍 Bootstrap results:', {
      dev: bootResultsStore.dev?.length || 0,
      sd: bootResultsStore.sd?.length || 0,
      sigma: bootResultsStore.sigma?.length || 0,
      hasData: hasBootResults
    });
    
    const hasCalc = Boolean(hasDevJResults || hasFinalDevJ || hasTrainData || 
                           hasFitCurveData || hasSummaryData || 
                           hasBootStats || hasBootQuantiles ||
                           hasStochStats || hasStochQuantiles ||
                           hasUltimateStats || hasUltimateQuantiles ||
                           hasBootParamCoeff || hasStochCoeff || hasBootResults ||
                           hasSimResults || hasComparisonTables || hasFinalDevVector || hasCombinedDevJSummary);
    
    console.log('🔍 [checkExistingCalculations] (Incurred) WYNIK KOŃCOWY:', {
      basicCalculations: hasDevJResults || hasFinalDevJ || hasTrainData || hasFitCurveData,
      summaryData: hasSummaryData,
      simulationResults: hasBootStats || hasBootQuantiles || hasStochStats || hasStochQuantiles || hasUltimateStats || hasUltimateQuantiles,
      coefficients: hasBootParamCoeff || hasStochCoeff || hasBootResults,
      incurredResultsPage: hasSimResults || hasComparisonTables || hasFinalDevVector || hasCombinedDevJSummary,
      overall: hasCalc
    });
    
    return hasCalc;
  };

  /* ---------- Funkcja finalnego zapisu do store ---------- */
  const handleFinalEditSave = (editedData: (number | null)[][]) => {
    console.log('💾 [handleFinalEditSave] FINALNE zapisanie do store:', editedData.length, 'wierszy');
    
    // 🆕 DODATKOWE czyszczenie wszystkich stores z metod stochastycznych (tak jak przy switch)
    console.log('🧹 [handleFinalEditSave] Wywołuję resetAllStores() - czyszczenie metod stochastycznych...');
    resetAllStores();
    
    // Zapisz dane do store (do analizy)
    setIncurredTriangle(editedData);
    
    // 🆕 Zaktualizuj także selectedSheetDetIncurred dla wyświetlania tabeli
    const sheetForStore: (string | number)[][] = editedData.map(row =>
      row.map(cell => (cell == null ? '' : cell))
    );
    useTrainDevideStoreDetIncurred.setState({ selectedSheetDetIncurred: sheetForStore });
    
    // Wyczyść obliczenia bo dane się zmieniły
    incurredStore.clearDevJResults();
    incurredStore.setFinalDevJ(undefined);
    incurredStore.setTrainDevideDetIncurred(undefined);
    
    // 🆕 Wyczyść FitCurve data z incurredStore
    console.log('🧹 [handleFinalEditSave] Czyszczę dane FitCurve...');
    incurredStore.clearFitCurveData();
    
    // 🆕 Wyczyść summary store - tylko gdy ma metodę czyszczącą
    console.log('🧹 [handleFinalEditSave] Próba czyszczenia summaryStore...');
    if (typeof summaryStore.clearSummaryData === 'function') {
      summaryStore.clearSummaryData();
    }
    
    // 🆕 Wyczyść dane z IncurredResultsPage
    console.log('🧹 [handleFinalEditSave] Czyszczę dane IncurredResultsPage...');
    if (typeof incurredStore.clearSimResults === 'function') {
      incurredStore.clearSimResults();
    }
    if (typeof incurredStore.clearComparisonTables === 'function') {
      incurredStore.clearComparisonTables();
    }
    // Użyj setterów do wyczyszczenia finalDevVector i combinedDevJSummary
    incurredStore.setFinalDevVector([]);
    incurredStore.setCombinedDevJSummary([]);
    
    // 🆕 Wyczyść wszystkie simulation stores
    console.log('🧹 [handleFinalEditSave] Wywołuję clearSimulationStores()...');
    clearSimulationStores();
    
    // 🆕 Zamknij modal po zapisie
    setShowEditModal(false);
    
    console.log('✅ [handleFinalEditSave] Dane zapisane do store, obliczenia wyczyszczone i modal zamknięty');
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
            <CardTitle className="text-white font-bold text-sm mb-4 pb-2 border-b-2 border-gray-700">Wprowadź trójkąt danych incurred, który wykorzystasz w dalszej analizie</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* ========== SEKCJA 1: Plik i arkusz ========== */}
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-600">
              <Label className="text-white text-sm mb-3 block">Wybór pliku i arkusza</Label>
              
              {/* Plik */}
              <div className="flex items-center gap-4 mb-4">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="bg-slate-700 border border-slate-600 text-white p-2 rounded-lg file:bg-slate-600 file:border-none file:rounded file:px-3 file:py-1 file:mr-2"
                  {...register("file")}
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

              {/* Arkusz */}
              <div>
                <Label className="text-white text-sm">Wybór arkusza</Label>
                <SheetSelectIncurred />
              </div>
            </div>

            {/* ========== SEKCJA 2: Zakres ========== */}
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

              <input type="hidden" {...register("rangeMode")} />

              {/* Pola zakresów - bezpośrednio pod wyborem trybu */}
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
                        {...register("rowStart")}
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
                        {...register("rowEnd")}
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
                        {...register("colStart")}
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
                        {...register("colEnd")}
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
                        {...register("cellStart")}
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
                        {...register("cellEnd")}
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

            {/* ========== SEKCJA 3: Ustawienia ========== */}
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-600">
              {/* Czy dane zawierają podpisy */}
              <HeadersSelector 
                hasHeaders={hasHeaders} 
                onHeadersChange={setHasHeaders} 
              />

              {/* Typ danych */}
              <DataTypeSelector
                dataType={dataType}
                onDataTypeChange={setDataType}
              />
            </div>
          </CardContent>

          <CardFooter>
            <button
              type="submit"
              className="py-2 px-4 bg-gradient-to-br from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:shadow-2xl hover:scale-[1.02] transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!workbook}
            >
              Wczytaj dane
            </button>
            
            {/* Przycisk do edycji trójkąta */}
            {incurredStore.incurredTriangle && incurredStore.incurredTriangle.length > 0 && (
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

      {/* Sukces */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
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
              {dataType === "incremental" 
                ? "Dane inkrementalne zostały przekonwertowane na skumulowane i poprawnie wczytane (Incurred)."
                : "Dane skumulowane zostały poprawnie wczytane (Incurred)."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>OK</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Spinner podczas ładowania */}
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
              ✏️ Edycja trójkąta danych incurred
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
            <EditableIncurredTriangle 
              key={Math.random()}
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
