import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PersonalInfoData } from './PersonalInfoFlow';
import { useTheme } from '../../../../theme/ThemeContext';
import { Theme } from '../../../../theme/theme';

interface ReviewInformationProps {
  onBack: () => void;
  onContinue: () => void;
  personalInfo: PersonalInfoData;
}

const ReviewInformation: React.FC<ReviewInformationProps> = ({
  onBack,
  onContinue,
  personalInfo,
}) => {
  const { theme } = useTheme();
  
  // Format date of birth
  const formatDOB = () => {
    if (!personalInfo.birthMonth || !personalInfo.birthDay || !personalInfo.birthYear) {
      return 'Not provided';
    }
    
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    return `${months[personalInfo.birthMonth - 1]} ${personalInfo.birthDay}, ${personalInfo.birthYear}`;
  };

  // Format address
  const formatAddress = () => {
    if (!personalInfo.addressLine1) {
      return 'Not provided';
    }
    
    let address = personalInfo.addressLine1;
    if (personalInfo.addressLine2) {
      address += `, ${personalInfo.addressLine2}`;
    }
    
    if (personalInfo.city) {
      address += `\n${personalInfo.city}`;
    }
    
    if (personalInfo.postalCode) {
      address += ` ${personalInfo.postalCode}`;
    }
    
    return address;
  };

  // Format full name
  const formatFullName = () => {
    if (!personalInfo.firstName && !personalInfo.lastName) {
      return 'Not provided';
    }
    
    let name = personalInfo.firstName || '';
    if (personalInfo.middleName) {
      name += ` ${personalInfo.middleName}`;
    }
    
    if (personalInfo.lastName) {
      name += ` ${personalInfo.lastName}`;
    }
    
    return name;
  };

  // Styles memoized with theme dependency
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.card,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
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
      backgroundColor: theme.colors.background,
    },
    formContainer: {
      padding: theme.spacing.lg,
      flex: 1,
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
    infoSection: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
    },
    infoLabel: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs / 2,
    },
    infoValue: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.textPrimary,
      lineHeight: 22,
    },
    continueButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
      marginTop: theme.spacing.xl,
    },
    continueButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
    },
  }), [theme]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review information</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Review your information</Text>
          <Text style={styles.subtitle}>
            Please make sure all details are correct before proceeding.
          </Text>
          
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Full name</Text>
            <Text style={styles.infoValue}>{formatFullName()}</Text>
          </View>
          
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Date of birth</Text>
            <Text style={styles.infoValue}>{formatDOB()}</Text>
          </View>
          
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Country of residence</Text>
            <Text style={styles.infoValue}>{personalInfo.country || 'Not provided'}</Text>
          </View>
          
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Home address</Text>
            <Text style={styles.infoValue}>{formatAddress()}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.continueButton}
            onPress={onContinue}
          >
            <Text style={styles.continueButtonText}>Confirm and Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default ReviewInformation; 