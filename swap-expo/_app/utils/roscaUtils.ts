/**
 * Rosca (Sol) utility functions
 */
import i18n from '../i18n';
import type { RoscaEnrollment } from '../types/rosca.types';

export type RoscaFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

/**
 * Get the frequency label (short form) - e.g., "day", "week", "jou", "semen"
 */
export function getFrequencyLabel(frequency: RoscaFrequency): string {
  return i18n.t(`rosca.frequency.${frequency}`);
}

/**
 * Get the full frequency label - e.g., "Every week", "Chak semen"
 */
export function getFrequencyLabelFull(frequency: RoscaFrequency): string {
  return i18n.t(`rosca.frequencyFull.${frequency}`);
}

/**
 * Get the short frequency label - e.g., "Weekly", "Semenn"
 */
export function getFrequencyLabelShort(frequency: RoscaFrequency): string {
  return i18n.t(`rosca.frequencyShort.${frequency}`);
}

/**
 * Calculate progress percentage based on queue position
 * Higher progress = closer to payout
 */
export function calculateProgress(enrollment: RoscaEnrollment): number {
  if (!enrollment.totalMembers || enrollment.totalMembers === 0) return 0;
  return ((enrollment.totalMembers - enrollment.queuePosition + 1) / enrollment.totalMembers) * 100;
}

/**
 * Format currency amount with symbol
 * Uses the symbol from the currencies table (e.g., "G", "$", "€")
 * @param amount - The amount to format
 * @param symbol - Currency symbol from pool.currencySymbol or enrollment.currencySymbol
 */
export function formatAmount(amount: number, symbol: string = 'G'): string {
  return `${symbol}${amount.toLocaleString()}`;
}

/**
 * Clean pool name by removing cohort suffix (e.g., "-c1", "-c2")
 * Used for backward compatibility with stale cached data that has old naming format
 */
export function cleanPoolName(name: string): string {
  return name.replace(/-c\d+$/, '');
}

/**
 * Format a rosca pool display name from structured data
 * e.g., "Sol G500/semen - 10 semen"
 */
export function formatPoolDisplayName(
  contributionAmount: number,
  frequency: RoscaFrequency,
  durationPeriods: number
): string {
  const freqLabel = getFrequencyLabel(frequency);
  return `Sol G${contributionAmount.toLocaleString()}/${freqLabel} - ${durationPeriods} ${freqLabel}`;
}
