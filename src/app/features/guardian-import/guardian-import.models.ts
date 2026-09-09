export interface GuardianImportRowError {
  rowNumber: number | null;
  externalReference: string | null;
  enrollmentNumber: string | null;
  messages: string[];
}

export interface GuardianImportValidation {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  guardiansToCreate: number;
  guardiansToReuse: number;
  relationshipsToCreate: number;
  canImport: boolean;
  errors: GuardianImportRowError[];
}

export interface GuardianImportResult {
  guardiansCreated: number;
  guardiansReused: number;
  relationshipsCreated: number;
  validation: GuardianImportValidation;
}
