import { DataTableView } from '@/shared/ui/molecules/DataTableView';
import type { TriangleData } from '@/shared/types/triangle';

interface TriangleTableViewProps {
  title: string;
  triangle: TriangleData | null | undefined;
  noDataMessage: string;
  fallbackComponent?: React.ComponentType;
  className?: string;
  withNumericHeaders?: boolean;
  rowLabels?: string[];
  columnLabels?: string[];
  numberFormatter?: (num: number | null) => string;
}

/**
 * Domain-specific component for displaying triangle data
 * Uses generic DataTableView but adds triangle-specific data transformation logic
 */
export function TriangleTableView({
  title,
  triangle,
  noDataMessage,
  fallbackComponent,
  className = "space-y-4",
  withNumericHeaders = false,
  rowLabels = [],
  columnLabels = [],
  numberFormatter
}: TriangleTableViewProps) {
  
  if (!triangle || triangle.length === 0) {
    console.log('[TriangleTableView] 🚨 No triangle data, rendering fallback');
    return (
      <DataTableView
        title={title}
        data={null}
        noDataMessage={noDataMessage}
        fallbackComponent={fallbackComponent}
        className={className}
      />
    );
  }

  // Transform triangle data for display
  let displayData: string[][];
  
  if (withNumericHeaders) {
    // For Paid triangles - use labels if available, otherwise use numeric headers
    // For triangle data, we want to show all column headers even if data rows are shorter
    const maxColCount = triangle.reduce((max, row) => Math.max(max, row?.length || 0), 0);
    const headerCount = columnLabels.length > 0 ? columnLabels.length : maxColCount;
    
    console.log('[TriangleTableView] maxColCount:', maxColCount, 'headerCount:', headerCount, 'columnLabels.length:', columnLabels.length);
    
    // Add empty cell at the beginning for row labels column, then column headers
    const headerRow = [''].concat(
      columnLabels.length > 0 
        ? columnLabels.map(label => label || '')
        : Array.from({ length: headerCount }, (_, i) => i.toString())
    );
    
    const dataRows = triangle.map((row, i) => {
      // Row label (using rowLabels if available, otherwise row index)
      const rowLabel = rowLabels.length > i && rowLabels[i] ? rowLabels[i] : i.toString();
      
      // Extend row to match header count with empty strings for missing values
      const extendedRow = Array.from({ length: headerCount }, (_, colIndex) => {
        const cell = row && colIndex < row.length ? row[colIndex] : null;
        if (cell === null || cell === undefined) return '';
        return numberFormatter ? numberFormatter(cell) : cell.toString();
      });
      return [rowLabel, ...extendedRow];
    });
    
    displayData = [headerRow, ...dataRows];
  } else {
    // For Incurred triangles - add labels if available
    const hasLabels = rowLabels.length > 0 || columnLabels.length > 0;
    
    if (hasLabels) {
      const colCount = triangle[0]?.length ?? 0;
      // Header row with column labels
      const headerRow = [''].concat(
        columnLabels.length > 0 
          ? columnLabels.slice(0, colCount).map(label => label || '')
          : Array.from({ length: colCount }, (_, i) => (i + 1).toString())
      );

      // Data rows with row labels
      const dataRows = triangle.map((row, i) => {
        const rowLabel = rowLabels.length > i && rowLabels[i] ? rowLabels[i] : (i + 1).toString();
        return [rowLabel, ...row.map((cell) => {
          if (cell === null || cell === undefined) return '';
          return numberFormatter ? numberFormatter(cell) : cell.toString();
        })];
      });
      
      displayData = [headerRow, ...dataRows];
    } else {
      // Fallback to original display without labels
      displayData = triangle.map((row) =>
        row.map((cell) => {
          if (cell === null || cell === undefined) return '';
          return numberFormatter ? numberFormatter(cell) : cell.toString();
        })
      );
    }
  }

  const titleClassName = className.includes('p-6') 
    ? "text-xl font-bold mb-4" 
    : "text-xl font-semibold";

  return (
    <DataTableView
      title={title}
      data={displayData}
      noDataMessage={noDataMessage}
      fallbackComponent={fallbackComponent}
      className={className}
      titleClassName={titleClassName}
    />
  );
}
