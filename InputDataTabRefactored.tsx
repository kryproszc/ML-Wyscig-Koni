'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useTableStore } from "@/stores/tableStore";
import { useLabelsStore } from "@/stores/useLabelsStore";
import { resetAllStores } from "@/lib/resetAllStores";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card, CardHeader, CardTitle,
  CardContent, CardFooter
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Zrefaktoryzowane komponenty i hooki
import { useFileUpload } from "@/hooks/useFileUpload";
import { validateDataValues } from "@/utils/dataValidation";
import { convertIncrementalToCumulative } from "@/utils/dataConversion";
import { CustomAlertDialog } from "@/components/CustomAlertDialog";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import Modal from "@/components/Modal";
import { FileUploadSection, RangeInputSection } from "@/components/InputFormSections";

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

const schema = z.object({
  rowStart: z.union([z.coerce.number().min(1, "Wiersz początkowy musi być co najmniej 1"), z.string()]),
  rowEnd: z.coerce.number().min(1, "Wiersz końcowy musi być co najmniej 1"),
  colStart: z.coerce.number().min(1, "Kolumna początkowa musi być co najmniej 1"),
  colEnd: z.coerce.number().min(1, "Kolumna końcowa musi być co najmniej 1"),
  cellStart: z.string().optional(),
  cellEnd: z.string().optional(),
  rangeMode: z.enum(['numeric', 'excel']),
  file: z.any()
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

export type { FormField };

type AlertState = {
  show: boolean;
  variant: 'error' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
};

export function InputDataTab() {
  // Stany alertów
  const [alertState, setAlertState] = useState<AlertState>({
    show: false,
    variant: 'info',
    title: '',
    message: ''
  });

  // Stan modala ostrzeżenia
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormField | null>(null);
  const [rangeMode, setRangeMode] = useState<'numeric' | 'excel'>('numeric');

  // Hook do uploadu plików
  const { isLoading, progress, handleFileLoad } = useFileUpload();

  // Store'y
  const {
    workbook,
    isValid,
    selectedSheetJSON,
    previousSheetJSON,
    validationErrorReason,
    getDefaultRange,
    setRangeAndUpdate,
    uploadedFileName,
    selectedSheetName,
    setSelectedSheetName,
    getSheetNames,
  } = useTableStore();

  const { 
    rowLabels, 
    columnLabels, 
    setRowLabels, 
    setColumnLabels,
    globalRowLabels,
    globalColumnLabels,
    lastLoadedFile
  } = useLabelsStore();

  // Store dla ustawień input'a - używamy indywidualnych ustawień z tableStore
  const {
    triangleType,
    dataType,
    setTriangleType,
    setDataType,
    hasHeaders,
    setHasHeaders,
  } = useTableStore();

  // Formularz
  const {
    register,
    handleSubmit,
    watch,
    setValue,
  } = useForm<FormField>({
    resolver: zodResolver(schema),
    defaultValues: {
      rowStart: 1,
      rowEnd: 1,
      colStart: 1,
      colEnd: 1,
      cellStart: "A1",
      cellEnd: "A1",
      rangeMode: 'numeric',
    }
  });

  const file = watch("file");
  const watchedRangeMode = watch('rangeMode');
  
  // Synchronizuj lokalny stan z formularzem
  useEffect(() => {
    if (watchedRangeMode && watchedRangeMode !== rangeMode) {
      setRangeMode(watchedRangeMode);
    }
  }, [watchedRangeMode]);

  // Synchronizacja formularza z store'em
  useEffect(() => {
    const { startRow, endRow, startCol, endCol } = useTableStore.getState();
    setValue("rowStart", startRow);
    setValue("rowEnd", endRow);
    setValue("colStart", startCol);
    setValue("colEnd", endCol);
  }, [setValue]);

  useEffect(() => {
    const unsubscribe = useTableStore.subscribe((state) => {
      setValue("rowStart", state.startRow);
      setValue("rowEnd", state.endRow);
      setValue("colStart", state.startCol);
      setValue("colEnd", state.endCol);
    });
    return unsubscribe;
  }, [setValue]);

  // 🆕 Reagowanie na zmianę ustawienia hasHeaders - odświeżenie nazw
  useEffect(() => {
    const { selectedSheetJSON } = useTableStore.getState();
    if (selectedSheetJSON && selectedSheetJSON.length > 0) {
      let rowNames: string[];
      let colNames: string[];
      
      if (hasHeaders) {
        // ZAWIERA podpisy - zczytujemy nazwy z pierwszej kolumny/wiersza
        rowNames = selectedSheetJSON.map((row, index) => 
          row[0] ? String(row[0]) : `Wiersz ${index + 1}`
        );
        
        colNames = selectedSheetJSON[0]?.map((cell, index) => 
          cell ? String(cell) : `Kolumna ${index + 1}`
        ) || [];
      } else {
        // NIE ZAWIERA podpisów - indeksujemy numerycznie od 0 
        rowNames = selectedSheetJSON.map((_, index) => `${index}`);
        colNames = selectedSheetJSON[0]?.map((_, index) => `${index}`) || [];
      }
      
      setRowLabels(rowNames);
      setColumnLabels(colNames);
      
      console.log('🔄 Odświeżono nazwy (hasHeaders:', hasHeaders, '):', { rowNames, colNames });
    }
  }, [hasHeaders, setRowLabels, setColumnLabels]);

  // Funkcje pomocnicze
  const showAlert = (variant: AlertState['variant'], title: string, message: string) => {
    setAlertState({ show: true, variant, title, message });
  };

  const hideAlert = () => {
    setAlertState(prev => ({ ...prev, show: false }));
  };

  const handleAutoRange = () => {
    const range = getDefaultRange();
    if (!range) return;
    
    if (rangeMode === 'excel') {
      // Tryb Excel - konwertuj na format A1:Z99
      const startCell = `${colNumberToLetter(range.startCol)}${range.startRow}`;
      const endCell = `${colNumberToLetter(range.endCol)}${range.endRow}`;
      
      setValue('cellStart', startCell);
      setValue('cellEnd', endCell);
      
      console.log('🎯 Auto wykryty zakres Excel:', `${startCell}:${endCell}`);
    } else {
      // Tryb numeryczny - jak dotychczas
      setValue("rowStart", range.startRow);
      setValue("rowEnd", range.endRow);
      setValue("colStart", range.startCol);
      setValue("colEnd", range.endCol);
      
      console.log('🎯 Auto wykryty zakres numeryczny:', {
        rows: `${range.startRow}-${range.endRow}`,
        cols: `${range.startCol}-${range.endCol}`
      });
    }
    
    // Aktualizuj też store bezpośrednio (zawsze numerycznie)
    useTableStore.setState({
      startRow: range.startRow,
      endRow: range.endRow,
      startCol: range.startCol,
      endCol: range.endCol
    });
  };

  const onSubmit = async (data: FormField) => {
    hideAlert();

    // Konwertuj Excel zakres na numeryczny jeśli potrzeba
    let processedData = { ...data };
    
    if (data.rangeMode === 'excel') {
      if (!data.cellStart || !data.cellEnd) {
        showAlert('error', 'Błąd zakresu', "Podaj obie komórki zakresu (od i do).");
        return;
      }
      
      const startCell = parseExcelCell(data.cellStart.toUpperCase());
      const endCell = parseExcelCell(data.cellEnd.toUpperCase());
      
      if (!startCell || !endCell) {
        showAlert('error', 'Błąd formatu', `Nieprawidłowy format komórek. Użyj formatu jak A1, B2, AK150 itp.`);
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

    // Sprawdź czy już są wczytane dane
    const hasExistingData = selectedSheetJSON && selectedSheetJSON.length > 0;
    
    if (hasExistingData) {
      // Zapisz dane formularza i pokaż modal ostrzeżenia
      setPendingFormData(processedData);
      setShowWarningModal(true);
      return;
    }

    // Jeśli nie ma danych, wykonaj normalnie
    processFormData(processedData);
  };

  // Funkcja do przetwarzania danych formularza
  const processFormData = (data: FormField) => {
    // Reset wszystkich store'ów przy wczytywaniu nowych danych
    resetAllStores();
    
    setRangeAndUpdate({
      startRow: typeof data.rowStart === 'string' ? 1 : data.rowStart,
      endRow: data.rowEnd,
      startCol: data.colStart,
      endCol: data.colEnd
    });

    // Czekamy 100ms aby Zustand zdążył zaktualizować store przed odczytem danych
    setTimeout(() => {
      let { isValid, selectedSheetJSON, previousSheetJSON } = useTableStore.getState();
      
      // 🧹 KROK 1: NAJPIERW wyczyść trójkąt (usuń zera "pod trójkątem")
      if (selectedSheetJSON && selectedSheetJSON.length > 0) {
        let body: any[][] = [];
        
        if (hasHeaders) {
          // ✅ Mamy podpisy – wyciągamy je z pierwszego wiersza/kolumny
          body = selectedSheetJSON.slice(1).map(r => (r || []).slice(1));
        } else {
          // ✅ Brak podpisów – cała tabela to dane
          body = selectedSheetJSON;
        }

        // 🧹 INTELIGENTNE CZYSZCZENIE TRÓJKĄTA - zamień zera "pod trójkątem" na puste
        const cleanBody = body.map((row, rowIndex) => {
          return (row || []).map((cell, colIndex) => {
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
        if (dataType === 'incremental') {
          console.log('🔄 Konwertuję WYCZYSZCZONE dane inkrementalne na skumulowane (Paid)...');
          
          // Rekonstruuj pełną tabelę z nagłówkami dla funkcji konwersji
          let dataForConversion: any[][];
          if (hasHeaders) {
            const headers = selectedSheetJSON[0] || [];
            const rowLabels = selectedSheetJSON.slice(1).map(r => (r && r[0]) || '');
            dataForConversion = [headers, ...cleanBody.map((row, i) => [rowLabels[i] || '', ...row])];
          } else {
            dataForConversion = cleanBody;
          }
          
          const convertedData = convertIncrementalToCumulative(dataForConversion);
          
          // Wyciągnij z powrotem samo ciało (bez nagłówków)
          if (hasHeaders) {
            finalBody = convertedData.slice(1).map(r => (r || []).slice(1));
          } else {
            finalBody = convertedData;
          }
          
          // Aktualizuj store z przekonwertowanymi danymi
          useTableStore.setState({ selectedSheetJSON: convertedData });
          selectedSheetJSON = convertedData;
          
          console.log('✅ Dane przekonwertowane (Paid):', convertedData);
        }

        // KROK 3: Zapisz nazwy kolumn i wierszy
        let rowNames: string[];
        let colNames: string[];
        
        if (hasHeaders) {
          // ZAWIERA podpisy - zczytujemy nazwy z pierwszej kolumny/wiersza
          rowNames = selectedSheetJSON.map((row, index) => 
            row[0] ? String(row[0]) : `Wiersz ${index + 1}`
          );
          
          colNames = selectedSheetJSON[0]?.map((cell, index) => 
            cell ? String(cell) : `Kolumna ${index + 1}`
          ) || [];
        } else {
          // NIE ZAWIERA podpisów - indeksujemy numerycznie od 0 
          rowNames = selectedSheetJSON.map((_, index) => `${index}`);
          colNames = selectedSheetJSON[0]?.map((_, index) => `${index}`) || [];
        }
        
        setRowLabels(rowNames);
        setColumnLabels(colNames);
        
        console.log('📝 Zapisano nazwy (hasHeaders:', hasHeaders, '):', { rowNames, colNames });
        console.log('🔺 Wybrany typ trójkąta:', triangleType);
      }

      const isSameData = JSON.stringify(selectedSheetJSON) === JSON.stringify(previousSheetJSON);

      if (!isValid) {
        showAlert('error', 'Błąd danych', validationErrorReason || "Dane wejściowe nie spełniają określonego formatu. Sprawdź dane!");
      } else if (isSameData) {
        showAlert('info', 'Informacja', "Nie dokonano żadnych zmian w danych.");
      } else {
        const validData = validateDataValues(selectedSheetJSON || []);
        if (!validData) {
          showAlert('warning', 'Ostrzeżenie', "Dane są w poprawnym formacie, ale występują w nich braki lub niedozwolone wartości.");
        } else {
          const dataTypeMessage = dataType === 'incremental' 
            ? "Dane inkrementalne zostały przekonwertowane na skumulowane i poprawnie wczytane."
            : "Dane skumulowane zostały poprawnie wczytane.";
          showAlert('success', 'Powiadomienie', dataTypeMessage);
        }
      }
    }, 100); // Czekamy 100ms aby Zustand zdążył zaktualizować store
  };

  // Obsługa potwierdzenia w modalu
  const handleConfirmDataReplace = () => {
    setShowWarningModal(false);
    
    if (pendingFormData) {
      processFormData(pendingFormData);
      setPendingFormData(null);
    }
  };

  // Obsługa anulowania w modalu
  const handleCancelDataReplace = () => {
    setShowWarningModal(false);
    setPendingFormData(null);
  };

  // Obsługa zmiany arkusza (bez modala - modal jest przy kliknięciu "Wybierz")
  const handleSheetChange = (newSheetName: string) => {
    if (!newSheetName) return;
    setSelectedSheetName(newSheetName);
  };

  // Komponent SheetSelect z modalem ostrzeżenia
  const SheetSelectWithModal = () => {
    const sheetNames = getSheetNames();
    
    return (
      <Select 
        onValueChange={handleSheetChange} 
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
  };

  return (
    <div>
      {/* FORMULARZ */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-4 border rounded flex flex-col gap-4">
        <Card className="bg-slate-800 border border-slate-700 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white font-bold text-sm mb-4 pb-2 border-b-2 border-gray-700">Wprowadź dane, które wykorzystasz w zakładce ,,Sprawdzanie założeń" oraz ,,Metody stochastyczne"</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FileUploadSection
              register={register}
              onFileLoad={() => handleFileLoad(file?.[0])}
              hasFile={file && file.length > 0}
              uploadedFileName={uploadedFileName}
              sheetSelectComponent={<SheetSelectWithModal />}
            />
            <RangeInputSection
              register={register}
              onAutoRange={handleAutoRange}
              workbookExists={!!workbook}
              dataType={dataType}
              onDataTypeChange={setDataType}
              triangleType={triangleType}
              onTriangleTypeChange={setTriangleType}
              hasHeaders={hasHeaders}
              onHeadersChange={setHasHeaders}
              rangeMode={rangeMode}
              onRangeModeChange={(mode) => {
                setRangeMode(mode);
                setValue('rangeMode', mode);
              }}
              setValue={setValue}
            />
          </CardContent>
          <CardFooter>
            <input type="hidden" {...register('rangeMode')} />
            <Button
              type="submit"
              className="py-2 px-4 bg-gradient-to-br from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:shadow-2xl hover:scale-[1.02] transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!workbook}
            >
              Wczytaj dane
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* UNIFIED ALERT DIALOG */}
      <CustomAlertDialog
        open={alertState.show}
        onOpenChange={hideAlert}
        variant={alertState.variant}
        title={alertState.title}
        message={alertState.message}
        buttonText={alertState.variant === 'error' ? 'Zamknij' : 'OK'}
      />

      {/* LOADING SPINNER */}
      {isLoading && <LoadingSpinner progress={progress} />}

      {/* MODAL OSTRZEŻENIA O UTRACIE DANYCH */}
      <Modal
        title="Ostrzeżenie"
        message="Czy chcesz wczytać nowe dane? Wszystkie obliczenia w metodach stochastycznych zostaną utracone."
        isOpen={showWarningModal}
        onConfirm={handleConfirmDataReplace}
        onCancel={handleCancelDataReplace}
      />
    </div>
  );
}
