/**
 * KYC Timeline Configuration System
 *
 * Professional, scalable configuration-driven timeline system for KYC verification.
 *
 * This file defines timeline steps for each entity type (personal, business).
 * To add a new entity type (e.g., government, NGO):
 * 1. Add the entity type to EntityType union
 * 2. Create a new timeline configuration (e.g., GOVERNMENT_TIMELINE)
 * 3. Add to getTimelineForEntityType() factory function
 *
 * Backend is the single source of truth for entity_type and completion flags.
 *
 * Pattern: Configuration over Code (used by Stripe, Revolut, Square)
 */

/**
 * Timeline step configuration
 */
export interface TimelineStepConfig {
  /** Unique step identifier (matches backend step_type) */
  id: string;

  /** Display title shown in timeline */
  title: string;

  /** Description text shown below title */
  description: string;

  /** Backend completion flag to check (e.g., 'personal_info_completed') */
  completionFlag: string;

  /** Navigation route to open when step is pressed (optional) */
  navigationRoute?: string;

  /** Navigation params to pass to route (optional) */
  navigationParams?: any;
}

/**
 * Entity timeline configuration
 */
export interface EntityTimelineConfig {
  /** Entity type this timeline applies to */
  entityType: 'profile' | 'business';

  /** Ordered list of timeline steps */
  steps: TimelineStepConfig[];
}

/**
 * Personal Profile Timeline Configuration
 *
 * Used for individual users (entity_type: 'profile')
 */
export const PERSONAL_TIMELINE: EntityTimelineConfig = {
  entityType: 'profile',
  steps: [
    {
      id: 'setup_account',
      title: 'Set up Swap account',
      description: 'Account created successfully',
      completionFlag: 'setup_account_completed',
    },
    {
      id: 'phone_verification',
      title: 'Confirm phone number',
      description: 'Verify your mobile number',
      completionFlag: 'phone_verification_completed',
      navigationRoute: 'PhoneEntry',
      navigationParams: { returnToTimeline: true },
    },
    {
      id: 'personal_info',
      title: 'Complete your personal info',
      description: 'Name, date of birth, residence',
      completionFlag: 'personal_info_completed',
      navigationRoute: 'PersonalInfoFlow',
      navigationParams: { returnToTimeline: true },
    },
    {
      id: 'document_verification',
      title: 'Verify your ID',
      description: 'National ID, passport, or driver\'s license',
      completionFlag: 'document_verification_completed',
      navigationRoute: 'UploadId',
      navigationParams: { returnToTimeline: true },
    },
    {
      id: 'selfie',
      title: 'Take selfie',
      description: 'Selfie verification for identity confirmation',
      completionFlag: 'selfie_completed',
      navigationRoute: 'TakeSelfie',
      navigationParams: { returnToTimeline: true },
    },
    {
      id: 'passcode_setup',
      title: 'Setup passcode',
      description: 'Create a secure passcode for your account',
      completionFlag: 'passcode_setup_completed',
      navigationRoute: 'Passcode',
      navigationParams: { isKycFlow: true, returnToTimeline: true },
    },
    // Note: biometric_setup removed - biometric is local-only, not tracked in backend KYC
  ],
};

/**
 * Business Profile Timeline Configuration
 *
 * Used for business entities (entity_type: 'business')
 */
export const BUSINESS_TIMELINE: EntityTimelineConfig = {
  entityType: 'business',
  steps: [
    {
      id: 'setup_account',
      title: 'Set up business account',
      description: 'Business account created successfully',
      completionFlag: 'setup_account_completed',
    },
    {
      id: 'phone_verification',
      title: 'Confirm phone number',
      description: 'Verify business contact number',
      completionFlag: 'phone_verification_completed',
      navigationRoute: 'PhoneEntry',
      navigationParams: { returnToTimeline: true },
    },
    {
      id: 'beneficial_owners',
      title: 'Team members and owners',
      description: 'Add team members (admins, managers) and legal owners',
      completionFlag: 'business_owner_info_completed',
      navigationRoute: 'BeneficialOwnersList',
      navigationParams: { returnToTimeline: true },
    },
    {
      id: 'business_info',
      title: 'Complete business information',
      description: 'Business name, type, and registration details',
      completionFlag: 'business_info_completed',
      navigationRoute: 'BusinessInfoFlow',
      navigationParams: { returnToTimeline: true },
    },
    {
      id: 'business_address',
      title: 'Business address',
      description: 'Business location and contact details',
      completionFlag: 'business_address_completed',
      navigationRoute: 'BusinessCountryOfResidence',
      navigationParams: { returnToTimeline: true },
    },
    {
      id: 'business_documents',
      title: 'Business registration documents',
      description: 'Upload business registration and licenses',
      completionFlag: 'business_documents_completed', // ✅ Updated to match simplified backend naming (2025-11-23)
      navigationRoute: 'BusinessRegistrationDocuments',
      navigationParams: { returnToTimeline: true },
    },
    // Note: passcode_setup removed - business profiles use the personal profile's PIN (shared auth_user)
    // Note: biometric_setup removed - biometric is local-only, not tracked in backend KYC
  ],
};

/**
 * Factory function to get timeline configuration by entity type
 *
 * @param entityType - The entity type ('profile' or 'business')
 * @returns The corresponding timeline configuration
 *
 * @example
 * ```typescript
 * const timeline = getTimelineForEntityType(kycStatus.entity_type);
 * timeline.steps.forEach(step => {
 *   const isCompleted = kycStatus[step.completionFlag];
 *   // Render step...
 * });
 * ```
 */
export function getTimelineForEntityType(
  entityType: 'profile' | 'business'
): EntityTimelineConfig {
  const timelines: Record<'profile' | 'business', EntityTimelineConfig> = {
    profile: PERSONAL_TIMELINE,
    business: BUSINESS_TIMELINE,
  };

  const timeline = timelines[entityType];

  if (!timeline) {
    console.warn(
      `[kycTimelines] Unknown entity type: ${entityType}, falling back to personal timeline`
    );
    return PERSONAL_TIMELINE;
  }

  return timeline;
}

/**
 * Get step configuration by step ID
 *
 * @param entityType - The entity type
 * @param stepId - The step ID to find
 * @returns The step configuration or undefined if not found
 */
export function getStepConfig(
  entityType: 'profile' | 'business',
  stepId: string
): TimelineStepConfig | undefined {
  const timeline = getTimelineForEntityType(entityType);
  return timeline.steps.find(step => step.id === stepId);
}

/**
 * Get all step IDs for an entity type
 *
 * @param entityType - The entity type
 * @returns Array of step IDs
 */
export function getStepIds(entityType: 'profile' | 'business'): string[] {
  const timeline = getTimelineForEntityType(entityType);
  return timeline.steps.map(step => step.id);
}
