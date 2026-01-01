/**
 * Rosca (Sol) types for the frontend
 *
 * Pool-based savings system where users join public pools,
 * make periodic contributions, and receive payouts based on queue position.
 */

// ==================== Pool Types ====================

/**
 * Pool information for listing
 */
export interface RoscaPool {
  id: string;
  name: string;
  description: string | null;
  contributionAmount: number;
  currencyCode: string;
  currencySymbol: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  payoutMultiplier: number;
  expectedPayout: number;
  memberCount: number; // Current number of members
  totalMembers?: number; // Alias for compatibility
  availableSlots?: number | null;
  minMembers?: number;
  maxMembers: number | null;
  gracePeriodDays?: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  category?: string | null;
  iconUrl?: string | null;

  // Cohort model fields (Fixed Duration Cohorts)
  startDate: string | null;
  endDate: string | null;
  registrationOpens: string | null;
  registrationDeadline: string | null;
  durationPeriods: number | null;
  cohortNumber: number;
}

/**
 * Detailed pool information
 */
export interface RoscaPoolDetails extends RoscaPool {
  createdAt: string;
  visibility: 'public' | 'private' | 'invite_only';
}

// ==================== Enrollment Types ====================

/**
 * User's enrollment in a pool
 */
export interface RoscaEnrollment {
  id: string;
  poolId: string;
  poolName: string;
  contributionAmount: number;
  currencyCode: string;
  currencySymbol: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  queuePosition: number;
  totalMembers: number;
  totalContributed: number;
  expectedPayout: number;
  contributionsCount: number;
  prepaidPeriods: number;
  nextPaymentDue: string | null;
  daysUntilNextPayment: number;
  status: 'active' | 'paused' | 'completed' | 'defaulted';
  isYourTurn: boolean;
  payoutReceived: boolean;
  pendingLateFees: number;
  joinedAt: string;
}

/**
 * Detailed enrollment with payment history info
 */
export interface RoscaEnrollmentDetails extends RoscaEnrollment {
  lastPaymentAt: string | null;
  payoutDate: string | null;
  payoutAmount: number | null;
  payoutMultiplier: number;
  gracePeriodDays: number;
}

// ==================== Payment Types ====================

/**
 * Payment record
 */
export interface RoscaPayment {
  id: string;
  enrollmentId: string;
  amount: number;
  currencyCode: string;
  currencySymbol: string;
  periodStart: string;
  periodEnd: string;
  periodsCovered: number;
  paymentMethod: string;
  dueDate: string;
  paidAt: string | null;
  daysLate: number;
  lateFeeAmount: number;
  lateFeeWaived: boolean;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  createdAt: string;
}

/**
 * Payout record
 */
export interface RoscaPayout {
  id: string;
  enrollmentId: string;
  poolId: string;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  currencyCode: string;
  currencySymbol: string;
  payoutMethod: string;
  scheduledDate: string;
  paidAt: string | null;
  status: 'scheduled' | 'processing' | 'paid' | 'failed';
  createdAt: string;
}

/**
 * Friend in the same pool
 */
export interface RoscaFriend {
  entityId: string;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  queuePosition: number;
  totalMembers: number;
  hasPaid: boolean;
}

// ==================== Request DTOs ====================

/**
 * DTO for joining a pool
 */
export interface JoinPoolDto {
  poolId: string;
  referredByEntityId?: string;
}

/**
 * DTO for making a payment
 */
export interface MakePaymentDto {
  enrollmentId: string;
  amount: number;
  paymentMethod: 'wallet' | 'moncash' | 'agent_cash';
  periods?: number;
  agentEntityId?: string;
  sourceWalletId?: string;
}

// ==================== Response DTOs ====================

/**
 * Response after making a payment
 */
export interface MakePaymentResponse {
  paymentId: string;
  enrollmentId: string;
  amountPaid: number;
  lateFeeCharged: number;
  periodsCovered: number;
  newTotalContributed: number;
  newContributionsCount: number;
  nextPaymentDue: string | null;
  transactionId: string | null;
  status: 'paid' | 'pending' | 'failed';
  message: string;
}

// ==================== Display Types ====================

/**
 * Pool card display for UI
 */
export interface RoscaPoolDisplay {
  id: string;
  name: string;
  contributionLabel: string; // e.g., "G500/semen"
  expectedPayoutLabel: string; // e.g., "G5,000"
  membersLabel: string; // e.g., "8/10 membres"
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  frequencyLabel: string; // e.g., "Chak semen"
  isAvailable: boolean;
}

/**
 * Enrollment card display for UI
 */
export interface RoscaEnrollmentDisplay {
  id: string;
  poolName: string;
  contributionLabel: string;
  queueLabel: string; // e.g., "#3 nan lis"
  nextPaymentLabel: string; // e.g., "Nan 4 jou" or "Ou dwe!"
  totalContributedLabel: string;
  progressPercent: number;
  status: 'active' | 'paused' | 'completed' | 'defaulted';
  isYourTurn: boolean;
  hasOverdue: boolean;
  pendingLateFees: number;
}

// ==================== Local Cache Types ====================

/**
 * Cached pool for SQLite storage
 */
export interface CachedRoscaPool {
  id: string;
  data: string; // JSON stringified RoscaPool
  updated_at: string;
}

/**
 * Cached enrollment for SQLite storage (entity-isolated)
 */
export interface CachedRoscaEnrollment {
  id: string;
  entity_id: string;
  data: string; // JSON stringified RoscaEnrollment
  updated_at: string;
}

/**
 * Cached payment for SQLite storage
 */
export interface CachedRoscaPayment {
  id: string;
  enrollment_id: string;
  data: string; // JSON stringified RoscaPayment
  updated_at: string;
}
