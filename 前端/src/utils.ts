export const convertToCSV = <T extends Record<string, any>>(data: T[], headers: { key: keyof T; label: string }[]): string => {
  const headerRow = headers.map(h => h.label).join(',');
  const rows = data.map(row => {
    return headers.map(header => {
      const value = row[header.key];
      const stringValue = value === null || value === undefined ? '' : String(value);
      return `"${String(stringValue).replace(/"/g, '""')}"`; 
    }).join(',');
  });
  return [headerRow, ...rows].join('\n');
};