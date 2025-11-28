// KYC Document Type Constants
// Created: 2025-11-11
// Centralized document type definitions for KYC flows

export interface DocumentTypeConfig {
  id: string;
  label: string;
  description: string;
  required: boolean;
}

export const BUSINESS_DOCUMENT_TYPES: DocumentTypeConfig[] = [
  {
    id: 'registration_certificate',
    label: 'Business Registration Certificate',
    description: 'Official business registration document',
    required: false,
  },
  {
    id: 'tax_certificate',
    label: 'Tax Registration Certificate',
    description: 'Tax identification document',
    required: false,
  },
  {
    id: 'operating_license',
    label: 'Operating License',
    description: 'Business operating permit or license',
    required: false,
  },
];

export interface IdTypeOption {
  value: string;
  label: string;
}

export const OWNER_ID_TYPES: IdTypeOption[] = [
  { value: 'national_id', label: 'National ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: "Driver's License" },
];

export const PERSONAL_ID_TYPES: IdTypeOption[] = [
  { value: 'national_id', label: 'National ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: "Driver's License" },
];

// Helper function to get ID type label
export const getIdTypeLabel = (idType: string): string => {
  const idTypeOption = OWNER_ID_TYPES.find(type => type.value === idType);
  return idTypeOption?.label || 'ID Document';
};
