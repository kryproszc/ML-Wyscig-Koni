d

const handleConfirm = (): void => {
  if (!sheetJSON || !selectedCells) return;

  const cleanedData = sheetJSON.map(row => 
    row.map(cell => cell ?? '')
  );
  const cleanedSelected = selectedCells.map(row => 
    row.map(cell => cell ?? 0)
  );

  mutation.mutate({
    body: {
      data: cleanedData,
      selected: cleanedSelected,
    },
  });
};
