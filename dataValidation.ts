// src/utils/dataValidation.ts

/**
 * Opcje konfiguracji walidacji danych
 */
export interface ValidationOptions {
  /** Czy wyświetlać szczegółowe logi w konsoli */
  enableLogging?: boolean;
  /** Czy sprawdzać strukturę trójkąta */
  validateTriangleStructure?: boolean;
  /** Czy dane zawierają nagłówki (pierwszy wiersz/kolumna) */
  hasHeaders?: boolean;
  /** Czy sprawdzać puste komórki w środku danych */
  checkEmptyCells?: boolean;
  /** Czy sprawdzać czy wszystkie wartości są numeryczne */
  checkNumericValues?: boolean;
  /** Minimalna liczba wierszy (domyślnie 2) */
  minRows?: number;
  /** Minimalna liczba kolumn w pierwszym wierszu (domyślnie 2) */
  minColumns?: number;
}

/**
 * Wynik walidacji
 */
export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Funkcja czyszcząca zera "pod trójkątem" - zamienia je na null lub puste stringi
 */
function cleanTriangleZeros(data: any[][], hasHeaders: boolean): any[][] {
  if (!data || data.length === 0) return data;

  return data.map((row, rowIndex) => {
    if (!row || !Array.isArray(row)) return row;
    
    return row.map((cell, colIndex) => {
      // Pomiń czyszczenie nagłówków
      if (hasHeaders && (rowIndex === 0 || colIndex === 0)) {
        return cell;
      }
      
      // Jeśli komórka ma wartość 0 (liczbę lub string "0")
      if (cell === 0 || cell === "0") {
        // Oblicz oczekiwaną pozycję dla struktury trójkąta
        const dataRowIndex = hasHeaders ? rowIndex - 1 : rowIndex;
        const dataColIndex = hasHeaders ? colIndex - 1 : colIndex;
        const totalDataRows = hasHeaders ? data.length - 1 : data.length;
        const expectedMaxCols = Math.max(0, totalDataRows - dataRowIndex);
        
        // Jeśli kolumna jest poza oczekiwaną strukturą trójkąta
        if (dataColIndex >= expectedMaxCols) {
          return ''; // Zamień na pusty string (będzie później zmieniony na null)
        }
      }
      
      return cell;
    });
  });
}

/**
 * Funkcja sprawdzająca strukturę trójkąta w zależności od ustawienia nagłówków
 */
function validateTriangleFormat(data: any[][], hasHeaders: boolean, enableLogging: boolean): ValidationResult {
  if (!data || data.length < 2) {
    const reason = "Za mało danych do sprawdzenia struktury trójkąta (minimum 2 wiersze).";
    if (enableLogging) console.warn(`❌ ${reason}`);
    return { isValid: false, reason };
  }

  try {
    if (hasHeaders) {
      // ✅ Zawierają nagłówki - pierwszy wiersz i pierwsza kolumna to nagłówki
      // Sprawdzamy czy dane mają strukturę: każdy wiersz ma o 1 kolumnę mniej (bez nagłówków)
      
      const headerRow = data[0];
      if (enableLogging) {
        console.log(`🔍 [validateTriangleFormat] Sprawdzam nagłówki. Pierwszy wiersz:`, headerRow?.slice(0, 5));
      }
      
      if (!headerRow || headerRow.length < 2) {
        const reason = "Dane nie zawierają nagłówków kolumn. Wybierz opcję 'Nie zawierają podpisów kolumn i wierszy'.";
        if (enableLogging) console.warn(`❌ ${reason}`);
        return { isValid: false, reason };
      }

      // 🔍 Sprawdzmy czy pierwszy wiersz rzeczywiście wygląda na nagłówki
      const firstRowNumbers = headerRow.filter(cell => 
        cell !== null && cell !== undefined && cell !== '' && 
        (typeof cell === 'number' || (typeof cell === 'string' && !isNaN(Number(cell))))
      );
      const firstRowNonNumbers = headerRow.filter(cell => 
        cell !== null && cell !== undefined && cell !== '' &&
        typeof cell === 'string' && isNaN(Number(cell))
      );
      
      if (enableLogging) {
        console.log(`🔍 [validateTriangleFormat] Pierwszy wiersz analiza:`, {
          totalCells: headerRow.length,
          numberLikeCells: firstRowNumbers.length,
          nonNumberCells: firstRowNonNumbers.length,
          numberSamples: firstRowNumbers.slice(0, 3),
          nonNumberSamples: firstRowNonNumbers.slice(0, 3),
          fullSample: headerRow.slice(0, 5)
        });
      }
      
      // Jeśli pierwszy wiersz to TYLKO liczby (brak tekstowych nagłówków), to prawdopodobnie to nie są nagłówki
      if (firstRowNonNumbers.length === 0 && firstRowNumbers.length > 1) {
        const reason = "Dane nie zawierają nagłówków kolumn. Wybierz opcję 'Nie zawierają podpisów kolumn i wierszy'.";
        if (enableLogging) console.warn(`❌ ${reason} (pierwszy wiersz zawiera tylko liczby)`);
        return { isValid: false, reason };
      }

      const expectedDataCols = headerRow.length - 1; // -1 bo pierwsza komórka to przecięcie nagłówków
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !Array.isArray(row)) continue;
        
        const dataCellsCount = row.slice(1).filter(cell => cell !== null && cell !== undefined && cell !== '').length;
        const expectedForThisRow = Math.max(0, expectedDataCols - (i - 1));
        
        if (expectedForThisRow > 0 && dataCellsCount > expectedForThisRow) {
          const reason = `Dane nie mają struktury trójkąta z nagłówkami. Wiersz ${i + 1} ma za dużo danych (${dataCellsCount}, oczekiwano maksymalnie ${expectedForThisRow}). Sprawdź czy dane rzeczywiście zawierają nagłówki lub wybierz opcję 'Nie zawierają podpisów'.`;
          if (enableLogging) console.warn(`❌ ${reason}`);
          return { isValid: false, reason };
        }
      }
    } else {
      // ✗ Nie zawierają nagłówków - cała tabela to dane w strukturze trójkąta
      // Sprawdzamy czy pierwszy wiersz ma najwięcej kolumn, a każdy kolejny o 1 mniej
      
      const firstRowDataCount = data[0]?.filter(cell => cell !== null && cell !== undefined && cell !== '').length || 0;
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !Array.isArray(row)) continue;
        
        const currentRowDataCount = row.filter(cell => cell !== null && cell !== undefined && cell !== '').length;
        const expectedForThisRow = Math.max(0, firstRowDataCount - i);
        
        if (expectedForThisRow > 0 && currentRowDataCount > expectedForThisRow) {
          const reason = `Dane nie mają struktury trójkąta bez nagłówków. Wiersz ${i + 1} ma za dużo danych (${currentRowDataCount}, oczekiwano maksymalnie ${expectedForThisRow}). Sprawdź czy dane nie zawierają nagłówków w pierwszym wierszu/kolumnie i wybierz opcję 'Zawierają podpisy'.`;
          if (enableLogging) console.warn(`❌ ${reason}`);
          return { isValid: false, reason };
        }
      }
    }

    if (enableLogging) {
      console.log(`✅ Struktura trójkąta jest prawidłowa (${hasHeaders ? 'z nagłówkami' : 'bez nagłówków'})`);
    }
    return { isValid: true };

  } catch (error) {
    const reason = "Wystąpił błąd podczas sprawdzania struktury trójkąta.";
    if (enableLogging) console.error(`❌ ${reason}`, error);
    return { isValid: false, reason };
  }
}

/**
 * Uniwersalna funkcja walidacji danych - zawiera wszystkie możliwości
 */
export function validateDataValues(
  data: any[][], 
  options: ValidationOptions = {}
): ValidationResult {
  const {
    enableLogging = false,
    validateTriangleStructure = false,
    hasHeaders = true,
    checkEmptyCells = true,
    checkNumericValues = true,
    minRows = 2,
    minColumns = 2
  } = options;

  if (enableLogging) {
    console.log("🔍 Sprawdzam dane:", data);
    console.log("⚙️ Opcje walidacji:", options);
  }

  // Sprawdzenie wstępne - czy data jest w ogóle poprawne
  try {
    if (!data || typeof data !== 'object') {
      const reason = "Dane wejściowe są nieprawidłowe lub puste.";
      if (enableLogging) console.warn(`❌ ${reason}`);
      return { isValid: false, reason };
    }
  } catch (error) {
    const reason = "Wystąpił błąd podczas sprawdzania danych wejściowych.";
    if (enableLogging) console.error(`❌ ${reason}`, error);
    return { isValid: false, reason };
  }

  // 1. Podstawowe sprawdzenie formatu
  if (!Array.isArray(data) || data.length < minRows) {
    const reason = `Wybrany zakres zawiera za mało danych. Potrzeba co najmniej ${minRows} wierszy z danymi.`;
    if (enableLogging) console.warn(`❌ ${reason}`);
    return { isValid: false, reason };
  }

  const firstRow = data[0];
  if (!Array.isArray(firstRow) || firstRow.length < minColumns) {
    const reason = `Pierwszy wiersz zawiera za mało kolumn. Potrzeba co najmniej ${minColumns} kolumn z danymi.`;
    if (enableLogging) console.warn(`❌ ${reason}`);
    return { isValid: false, reason };
  }

  // 2. Walidacja struktury trójkąta (jeśli włączona)
  if (validateTriangleStructure) {
    // Najpierw wyczyść zera "pod trójkątem"
    const cleanedData = cleanTriangleZeros(data, hasHeaders);
    const triangleResult = validateTriangleFormat(cleanedData, hasHeaders, enableLogging);
    if (!triangleResult.isValid) {
      return triangleResult;
    }
    // Użyj wyczyszczonych danych do dalszej walidacji
    data = cleanedData;
  }

  // 3. Sprawdzanie pustych komórek i wartości numerycznych
  if (checkEmptyCells || checkNumericValues) {
    for (let rowIdx = 1; rowIdx < data.length; rowIdx++) { // Pomijamy nagłówek (pierwszy wiersz)
      const row = data[rowIdx];
      if (!row || !Array.isArray(row)) {
        if (enableLogging) console.warn(`⚠️ Wiersz ${rowIdx + 1} jest pusty lub nieprawidłowy`);
        continue;
      }

      // Policz puste komórki na końcu
      let emptyCount = 0;
      for (let colIdx = row.length - 1; colIdx >= 0; colIdx--) {
        if (row[colIdx] === "" || row[colIdx] === null || row[colIdx] === undefined) {
          emptyCount++;
        } else {
          break;
        }
      }

      const dataPart = row.slice(1, row.length - emptyCount); // Pomijamy pierwszą kolumnę (nazwy wierszy) i puste na końcu

      if (dataPart.length === 0) {
        if (enableLogging) console.warn(`⚠️ Wiersz ${rowIdx + 1} nie ma danych do sprawdzenia`);
        continue;
      }

      for (const [cellIdx, cell] of dataPart.entries()) {
        const actualColIdx = cellIdx + 1; // Przesunięcie indeksu kolumny o 1 (bo pomijamy pierwszą kolumnę)
        if (enableLogging) {
          console.log(`Row ${rowIdx + 1}, Cell ${actualColIdx + 1}:`, cell, `Type: ${typeof cell}`);
        }

        // Sprawdź puste komórki w środku danych
        if (checkEmptyCells && (cell === "" || cell === null || cell === undefined)) {
          const reason = `Pusta komórka w wierszu ${rowIdx + 1}, kolumna ${actualColIdx + 1}. Wszystkie komórki z danymi muszą być wypełnione.`;
          if (enableLogging) console.warn(`❌ ${reason}`);
          return { isValid: false, reason };
        }

        // Sprawdź czy wartości są numeryczne
        if (checkNumericValues) {
          const numericValue = typeof cell === 'number' ? cell : Number(cell);
          if (isNaN(numericValue)) {
            const reason = `Niepoprawna wartość "${cell}" w wierszu ${rowIdx + 1}, kolumna ${actualColIdx + 1}. Dozwolone są tylko liczby.`;
            if (enableLogging) console.warn(`❌ ${reason}`);
            return { isValid: false, reason };
          }
        }
      }
    }
  }

  if (enableLogging) {
    console.log("✅ Walidacja zakończona pomyślnie");
  }

  return { isValid: true };
}



/**
 * Pomocnicza funkcja do liczenia niepustych komórek w wierszu
 */
function countNonEmptyCells(row: any[] | undefined): number {
  if (!row || !Array.isArray(row)) return 0;
  
  let lastNonEmptyIndex = -1;
  try {
    for (let i = 0; i < row.length; i++) {
      if (row[i] !== null && row[i] !== undefined && row[i] !== '') {
        lastNonEmptyIndex = i;
      }
    }
  } catch (error) {
    console.warn('Błąd podczas liczenia komórek:', error);
    return 0;
  }
  
  return lastNonEmptyIndex + 1;
}

/**
 * Pomocnicza funkcja do liczenia niepustych komórek w wierszu, pomijając pierwszą kolumnę (nazwy wierszy)
 */
function countNonEmptyDataCells(row: any[] | undefined): number {
  if (!row || !Array.isArray(row) || row.length <= 1) return 0;
  
  let lastNonEmptyIndex = -1; // -1 oznacza że nie znaleźliśmy żadnych danych
  try {
    for (let i = 1; i < row.length; i++) { // Zaczynamy od indeksu 1 (pomijamy pierwszą kolumnę)
      if (row[i] !== null && row[i] !== undefined && row[i] !== '') {
        lastNonEmptyIndex = i;
      }
    }
  } catch (error) {
    console.warn('Błąd podczas liczenia komórek danych:', error);
    return 0;
  }
  
  // Jeśli lastNonEmptyIndex = -1, to brak danych (zwróć 0)
  // Jeśli lastNonEmptyIndex = 1, to jedna komórka danych (zwróć 1) 
  // Jeśli lastNonEmptyIndex = 2, to dwie komórki danych (zwróć 2)
  return lastNonEmptyIndex === -1 ? 0 : lastNonEmptyIndex;
}

/**
 * Predefiniowane konfiguracje dla różnych przypadków użycia
 */
export const ValidationPresets = {
  /** Podstawowa walidacja - tylko puste komórki i wartości numeryczne */
  basic: (): ValidationOptions => ({
    enableLogging: false,
    validateTriangleStructure: false,
    checkEmptyCells: true,
    checkNumericValues: true,
  }),

  /** Walidacja dla danych Paid - ze sprawdzaniem struktury trójkąta */
  paid: (): ValidationOptions => ({
    enableLogging: false, // � Wyłączamy nadmiarowe logi (błędy i tak są wyświetlane w UI)
    validateTriangleStructure: false, // 🚫 Tymczasowo wyłączamy walidację struktury trójkąta
    checkEmptyCells: true,
    checkNumericValues: true,
    minRows: 2,
    minColumns: 2,
  }),

  /** Walidacja dla danych Incurred - prostsza */
  incurred: (): ValidationOptions => ({
    enableLogging: false, // � Wyłączamy nadmiarowe logi (błędy i tak są wyświetlane w UI)
    validateTriangleStructure: false,
    checkEmptyCells: true,
    checkNumericValues: true,
    minRows: 2,
    minColumns: 1,
  }),

  /** Walidacja z debugowaniem - włączone logi */
  debug: (): ValidationOptions => ({
    enableLogging: true,
    validateTriangleStructure: true,
    checkEmptyCells: true,
    checkNumericValues: true,
  }),

  /** Tylko sprawdzenie struktury bez sprawdzania wartości */
  structureOnly: (): ValidationOptions => ({
    enableLogging: false,
    validateTriangleStructure: true,
    checkEmptyCells: false,
    checkNumericValues: false,
  }),
} as const;
