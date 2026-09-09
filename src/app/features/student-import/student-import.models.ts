export interface StudentImportRowError {
  rowNumber: number | null;
  enrollmentNumber: string | null;
  messages: string[];
}

export interface StudentImportValidation {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  canImport: boolean;
  errors: StudentImportRowError[];
}

export interface StudentImportResult {
  importedRows: number;
  validation: StudentImportValidation;
}
