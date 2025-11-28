// Created: TeamMemberRoleSelection - Step 1: Select member type (Admin Team, Beneficial Owner, or Both) - 2025-11-12

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../theme/ThemeContext';

interface TeamMemberRoleSelectionProps {
  onBack: () => void;
  onContinue: (data: { isAdminTeam: boolean; isBeneficialOwner: boolean; adminRole?: string }) => void;
  initialData?: {
    isAdminTeam?: boolean;
    isBeneficialOwner?: boolean;
    adminRole?: string;
  };
}

type AdminRole = 'OWNER' | 'ADMIN' | 'MANAGER';

const TeamMemberRoleSelection: React.FC<TeamMemberRoleSelectionProps> = ({
  onBack,
  onContinue,
  initialData = {},
}) => {
  const { theme } = useTheme();

  const [isAdminTeam, setIsAdminTeam] = useState(initialData.isAdminTeam || false);
  const [isBeneficialOwner, setIsBeneficialOwner] = useState(initialData.isBeneficialOwner || false);
  const [adminRole, setAdminRole] = useState<AdminRole>(
    (initialData.adminRole as AdminRole) || 'ADMIN'
  );
  const [showHelpModal, setShowHelpModal] = useState(false);

  const isFormValid = isAdminTeam || isBeneficialOwner;

  const handleContinue = () => {
    if (isFormValid) {
      onContinue({
        isAdminTeam,
        isBeneficialOwner,
        adminRole: isAdminTeam ? adminRole : undefined,
      });
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          height: 56,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.card,
        },
        backButton: {
          width: 40,
          height: 40,
          justifyContent: 'center',
          alignItems: 'center',
        },
        headerTitle: {
          fontSize: theme.typography.fontSize.lg,
          fontWeight: '600',
          color: theme.colors.textPrimary,
        },
        content: {
          flex: 1,
        },
        scrollContent: {
          padding: theme.spacing.lg,
        },
        title: {
          fontSize: theme.typography.fontSize.xl,
          fontWeight: '600',
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing.xs,
        },
        subtitle: {
          fontSize: theme.typography.fontSize.md,
          color: theme.colors.textSecondary,
          marginBottom: theme.spacing.xl,
        },
        roleCard: {
          backgroundColor: theme.colors.card,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.md,
          borderWidth: 2,
          borderColor: theme.colors.border,
        },
        roleCardSelected: {
          borderColor: theme.colors.primary,
          backgroundColor: theme.colors.primary + '10',
        },
        roleHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: theme.spacing.sm,
        },
        checkbox: {
          width: 24,
          height: 24,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: theme.colors.border,
          marginRight: theme.spacing.md,
          justifyContent: 'center',
          alignItems: 'center',
        },
        checkboxSelected: {
          borderColor: theme.colors.primary,
          backgroundColor: theme.colors.primary,
        },
        roleTitle: {
          fontSize: theme.typography.fontSize.lg,
          fontWeight: '600',
          color: theme.colors.textPrimary,
          flex: 1,
        },
        roleDescription: {
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textSecondary,
          marginLeft: 40,
        },
        adminRoleSection: {
          marginTop: theme.spacing.md,
          marginLeft: 40,
          paddingTop: theme.spacing.md,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        },
        adminRoleLabel: {
          fontSize: theme.typography.fontSize.sm,
          fontWeight: '600',
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing.xs,
        },
        adminRoleOptions: {
          flexDirection: 'row',
          gap: theme.spacing.xs,
          flexWrap: 'wrap',
        },
        adminRoleOption: {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.borderRadius.sm,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        },
        adminRoleOptionSelected: {
          borderColor: theme.colors.primary,
          backgroundColor: theme.colors.primary + '20',
        },
        adminRoleOptionText: {
          fontSize: theme.typography.fontSize.sm,
          fontWeight: '600',
          color: theme.colors.textSecondary,
        },
        adminRoleOptionTextSelected: {
          color: theme.colors.primary,
        },
        continueButton: {
          backgroundColor: theme.colors.primary,
          borderRadius: theme.borderRadius.md,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          alignItems: 'center',
          marginTop: theme.spacing.xl,
        },
        disabledButton: {
          backgroundColor: theme.colors.border,
        },
        continueButtonText: {
          color: theme.colors.white,
          fontSize: theme.typography.fontSize.md,
          fontWeight: '600',
        },
        // Modal styles
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: theme.spacing.lg,
        },
        modalContent: {
          backgroundColor: theme.colors.card,
          borderRadius: theme.borderRadius.lg,
          width: '100%',
          maxWidth: 400,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 5,
        },
        modalHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: theme.spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        modalTitle: {
          fontSize: theme.typography.fontSize.lg,
          fontWeight: '600',
          color: theme.colors.textPrimary,
        },
        modalBody: {
          padding: theme.spacing.lg,
        },
        infoRow: {
          flexDirection: 'row',
          marginBottom: theme.spacing.md,
          alignItems: 'flex-start',
        },
        infoIcon: {
          fontSize: 24,
          marginRight: theme.spacing.sm,
        },
        infoTextContainer: {
          flex: 1,
        },
        infoTitle: {
          fontSize: theme.typography.fontSize.md,
          fontWeight: '600',
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing.xs / 2,
        },
        infoDescription: {
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textSecondary,
          lineHeight: 20,
        },
      }),
    [theme]
  );

  const adminRoles: { value: AdminRole; label: string }[] = [
    { value: 'OWNER', label: 'Owner' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MANAGER', label: 'Manager' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Member Role</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => setShowHelpModal(true)}>
          <Ionicons name="help-circle-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Select Member Type</Text>
        <Text style={styles.subtitle}>
          Choose their role: Platform access (admin/manager), legal ownership (25%+), or both.
        </Text>

        {/* Admin Team Card */}
        <TouchableOpacity
          style={[styles.roleCard, isAdminTeam && styles.roleCardSelected]}
          onPress={() => setIsAdminTeam(!isAdminTeam)}
        >
          <View style={styles.roleHeader}>
            <View style={[styles.checkbox, isAdminTeam && styles.checkboxSelected]}>
              {isAdminTeam && (
                <Ionicons name="checkmark" size={16} color={theme.colors.white} />
              )}
            </View>
            <Text style={styles.roleTitle}>Admin Team</Text>
          </View>
          <Text style={styles.roleDescription}>
            Platform access to manage business account, transactions, settings (employees, admins, managers)
          </Text>

          {/* Admin Role Selection */}
          {isAdminTeam && (
            <View style={styles.adminRoleSection}>
              <Text style={styles.adminRoleLabel}>Select Admin Role:</Text>
              <View style={styles.adminRoleOptions}>
                {adminRoles.map((role) => (
                  <TouchableOpacity
                    key={role.value}
                    style={[
                      styles.adminRoleOption,
                      adminRole === role.value && styles.adminRoleOptionSelected,
                    ]}
                    onPress={() => setAdminRole(role.value)}
                  >
                    <Text
                      style={[
                        styles.adminRoleOptionText,
                        adminRole === role.value && styles.adminRoleOptionTextSelected,
                      ]}
                    >
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Beneficial Owner Card */}
        <TouchableOpacity
          style={[styles.roleCard, isBeneficialOwner && styles.roleCardSelected]}
          onPress={() => setIsBeneficialOwner(!isBeneficialOwner)}
        >
          <View style={styles.roleHeader}>
            <View style={[styles.checkbox, isBeneficialOwner && styles.checkboxSelected]}>
              {isBeneficialOwner && (
                <Ionicons name="checkmark" size={16} color={theme.colors.white} />
              )}
            </View>
            <Text style={styles.roleTitle}>Beneficial Owner</Text>
          </View>
          <Text style={styles.roleDescription}>
            Legal owner with 25%+ ownership or control (required for compliance - FinCEN/AML)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.continueButton, !isFormValid && styles.disabledButton]}
          onPress={handleContinue}
          disabled={!isFormValid}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Help Modal */}
      <Modal
        visible={showHelpModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowHelpModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Member Role Info</Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>💡</Text>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>Admin Team</Text>
                  <Text style={styles.infoDescription}>
                    Employees, admins, managers with platform access. No ownership required.
                  </Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>💡</Text>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>Beneficial Owner</Text>
                  <Text style={styles.infoDescription}>
                    Legal owners with 25%+ ownership. Required for regulatory compliance (FinCEN/AML).
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default TeamMemberRoleSelection;
