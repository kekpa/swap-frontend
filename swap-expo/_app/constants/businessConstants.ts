/**
 * Business Constants
 * Shared constants for business type and employee count options
 * Used by both signup (CompleteProfileScreen) and KYC (BusinessInfoFlow)
 */

export const BUSINESS_TYPES = [
  { value: 'societe_anonyme', label: 'Société Anonyme' },
  { value: 'entreprise_individuelle', label: 'Entreprise Individuelle' },
  { value: 'association', label: 'Association' },
  { value: 'autres', label: 'Autres' },
];

export const EMPLOYEE_COUNT_OPTIONS = [
  { value: '0-1', label: '0-1 employees' },
  { value: '2-5', label: '2-5 employees (Small team)' },
  { value: '6-20', label: '6-20 employees (Medium team)' },
  { value: '21-50', label: '21-50 employees (Large team)' },
  { value: '51-200', label: '51-200 employees (Enterprise)' },
  { value: '200+', label: '200+ employees (Large enterprise)' },
];
