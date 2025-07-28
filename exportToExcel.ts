import * as XLSX from 'xlsx';

export type DevJResult = {
  volume: number;
  subIndex?: number;
  values: number[];
};

export type OverrideRow = { index: number; curve: string; value: number };

export function exportDevJToExcel(
  devJResults: DevJResult[],
  finalDevJ?: DevJResult,
  customFinal?: number[],
  overrides: OverrideRow[] = []   // <── NOWY, opcjonalny parametr
) {
  const maxLength = Math.max(...devJResults.map((r) => r.values.length));

  /* 1) Tabela porównawcza */
  const comparisonHeader = ['volume', ...Array.from({ length: maxLength }, (_, j) => `j=${j}`)];
  const comparisonRows = devJResults.map((r) => [
    r.subIndex !== undefined ? `${r.volume},${r.subIndex}` : `${r.volume}`,
    ...r.values,
  ]);
  const comparisonTable = [comparisonHeader, ...comparisonRows];

  /* 2) Finalny wektor */
  const finalValues = customFinal ?? finalDevJ?.values ?? [];
  const finalHeader = ['Wektor finalny', ...Array.from({ length: finalValues.length }, (_, j) => `j=${j}`)];
  const finalRow    = ['dev_final', ...finalValues];
  const finalTable  = [finalHeader, finalRow];

  /* 3) Overrides (jeśli są) */
  const overridesTable =
    overrides.length > 0
      ? [
          ['j (index)', 'curve', 'value'],
          ...overrides.map(o => [o.index, o.curve, o.value]),
        ]
      : [];

  /* 4) Składamy arkusz główny (comparison + final) */
  const wsMain = XLSX.utils.aoa_to_sheet([
    ...comparisonTable,
    [], // pusta linia
    ...finalTable,
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsMain, 'dev_j');

  /* 5) Drugi arkusz z overrides (opcjonalny) */
  if (overridesTable.length) {
    const wsOv = XLSX.utils.aoa_to_sheet(overridesTable);
    XLSX.utils.book_append_sheet(wb, wsOv, 'overrides');
  }

  XLSX.writeFile(wb, 'dev_j_export.xlsx');
}
