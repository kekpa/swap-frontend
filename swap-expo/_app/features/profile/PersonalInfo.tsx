import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../navigation/profileNavigator';
import { useTheme } from '../../theme/ThemeContext';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

const PersonalInfoScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();

  const handleBack = () => {
    navigation.goBack();
  };

  const handleEditInfo = () => {
    console.log('Edit Personal Information');
    // Implement edit functionality
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + theme.spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
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
    scrollView: {
      flex: 1,
    },
    infoContainer: {
      padding: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm + theme.spacing.xs,
      marginTop: theme.spacing.md,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    infoCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
      ...theme.shadows.small,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md,
    },
    infoList: {
      paddingHorizontal: 0,
    },
    infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm + theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    infoLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      flex: 4,
    },
    infoValue: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
      color: theme.colors.textPrimary,
      textAlign: 'right',
      flex: 6,
    },
    infoValueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 6,
      justifyContent: 'flex-end',
    },
    copyButton: {
      marginLeft: theme.spacing.xs + theme.spacing.xs,
      padding: theme.spacing.xs,
    },
    actionButton: {
      backgroundColor: theme.colors.primaryUltraLight,
      borderRadius: theme.borderRadius.sm,
      paddingVertical: theme.spacing.sm + theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    actionButtonText: {
      color: theme.colors.primary,
      fontWeight: '500',
      fontSize: theme.typography.fontSize.md,
    },
  }), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle={theme.isDark ? "light-content" : "dark-content"} 
        backgroundColor={theme.colors.background} 
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Information</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.infoContainer}>
          {/* Personal Information */}
          <Text style={styles.sectionTitle}>PERSONAL INFORMATION</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>Frantz Olivier</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Date of Birth</Text>
                <Text style={styles.infoValue}>January 15, 1985</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Email</Text>
                <View style={styles.infoValueContainer}>
                  <Text style={styles.infoValue}>frantz.olivier@example.com</Text>
                  <TouchableOpacity style={styles.copyButton}>
                    <Ionicons name="copy-outline" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <View style={styles.infoValueContainer}>
                  <Text style={styles.infoValue}>+65 9123 4567</Text>
                  <TouchableOpacity style={styles.copyButton}>
                    <Ionicons name="copy-outline" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Address Information */}
          <Text style={styles.sectionTitle}>ADDRESS INFORMATION</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Country of Residence</Text>
                <Text style={styles.infoValue}>Singapore</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>79 Anson Road, #20-01</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>City</Text>
                <Text style={styles.infoValue}>Singapore</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Postal Code</Text>
                <Text style={styles.infoValue}>079906</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Citizenship</Text>
                <Text style={styles.infoValue}>Singapore</Text>
              </View>
            </View>
          </View>

          {/* Edit Button */}
          <TouchableOpacity style={styles.actionButton} onPress={handleEditInfo}>
            <Text style={styles.actionButtonText}>Edit Personal Information</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PersonalInfoScreen; 
 