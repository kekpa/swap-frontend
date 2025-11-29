import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../navigation/profileNavigator';
import { useTheme } from '../theme/ThemeContext';
import { Theme } from '../theme/theme';
import { useKycCompletion } from '../hooks-actions/useKycCompletion';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;
type PasscodeScreenRouteProp = RouteProp<ProfileStackParamList, 'Passcode'>;

type PasscodeMode = 'create' | 'confirm';

interface PasscodeProps {
  onPasscodeConfirmed?: (passcode: string) => void;
}

// Created: Added Passcode component for secure passcode creation and confirmation - 2025-XX-XX
// Updated: Integrated with backend API to store passcode in Supabase user metadata during KYC flow - 2025-06-07
// Updated: Made responsive for small screens like iPhone SE - 2025-06-08
// Updated: Added context-aware navigation for better UX when updating vs first-time KYC - 2025-01-26

const PasscodeScreen: React.FC<PasscodeProps> = ({ 
  onPasscodeConfirmed 
}) => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PasscodeScreenRouteProp>();
  const { theme } = useTheme();
  const { completeStep } = useKycCompletion(); // ✅ Updated to use completeStep (industry standard)
  const isKycFlow = route.params?.isKycFlow || false;
  const returnToTimeline = route.params?.returnToTimeline;
  const sourceRoute = route.params?.sourceRoute;
  
  console.log(`[PasscodeScreen] Mounted/Focused. isKycFlow: ${isKycFlow}, returnToTimeline: ${returnToTimeline}, sourceRoute: ${sourceRoute}`);

  const [mode, setMode] = useState<PasscodeMode>('create');
  const [passcode, setPasscode] = useState<string>('');
  const [originalPasscode, setOriginalPasscode] = useState<string>('');

  // Get screen dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenHeight < 700; // iPhone SE and similar
  const isTinyScreen = screenHeight < 600; // Even smaller screens

  const handleBack = () => {
    console.log(`[PasscodeScreen] handleBack called. mode: ${mode}, isKycFlow: ${isKycFlow}, returnToTimeline: ${returnToTimeline}, sourceRoute: ${sourceRoute}`);
    if (mode === 'confirm') {
      setMode('create');
      setPasscode('');
    } else if (isKycFlow) {
      // Always return to timeline when in KYC flow
      if (returnToTimeline) {
        console.log(`[PasscodeScreen] Returning to VerifyYourIdentity timeline`);
        navigation.navigate('VerifyYourIdentity', sourceRoute ? { sourceRoute } : undefined);
      } else {
        // Default KYC back behavior
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
          navigation.navigate('VerifyYourIdentity', sourceRoute ? { sourceRoute } : undefined);
        }
      }
    } else {
      if (navigation.canGoBack()) navigation.goBack();
    }
  };

  useEffect(() => {
    if (passcode.length === 6) {
      if (mode === 'create') {
        setOriginalPasscode(passcode);
        setPasscode('');
        setMode('confirm');
      } else {
        // Confirm mode
        if (passcode === originalPasscode) {
          // Passcode confirmed successfully
          console.log('Passcode set successfully');
          
          if (onPasscodeConfirmed) {
            onPasscodeConfirmed(passcode);
          } else if (isKycFlow) {
            console.log(`[PasscodeScreen] KYC flow confirmed. Storing passcode in backend...`);
            // Store passcode in backend during KYC flow
            storePasscodeInBackend(passcode);
          } else {
            // Default behavior for non-KYC flow
          setTimeout(() => {
            navigation.goBack();
            }, 500);
          }
        } else {
          // Passcode doesn't match
          console.log('Passcodes do not match');
          setPasscode('');
          // Show error message
        }
      }
    }
  }, [passcode, mode, originalPasscode, navigation, onPasscodeConfirmed, isKycFlow, sourceRoute]);

  const storePasscodeInBackend = async (confirmedPasscode: string) => {
    console.log(`[PasscodeScreen] 🚀 Starting professional KYC completion for passcode...`);

    // Use professional KYC completion system
    const result = await completeStep('setup_security', { passcode: confirmedPasscode }, {
      returnToTimeline,
      sourceRoute,
      showSuccessAlert: false,
      customSuccessMessage: 'Passcode setup completed successfully!',
      skipNavigation: !isKycFlow // Skip navigation if not in KYC flow
    });

    if (result.success) {
      console.log(`[PasscodeScreen] ✅ Professional passcode completion successful!`);

      // Add a small delay for better UX
      setTimeout(() => {
        if (!isKycFlow) {
          // Default behavior for non-KYC usage
          console.log(`[PasscodeScreen] Non-KYC flow, navigating to VerificationComplete`);
          navigation.navigate('VerificationComplete');
        }
        // KYC navigation is handled by the completion system
      }, 500);
    } else {
      console.log(`[PasscodeScreen] ❌ Professional passcode completion failed - handled by completion system`);
    }
  };

  const handleKeyPress = (key: number | 'delete') => {
    if (key === 'delete') {
      if (passcode.length > 0) {
        setPasscode(passcode.slice(0, -1));
      }
    } else if (passcode.length < 6) {
      setPasscode(passcode + key);
    }
  };

  const styles = useMemo(() => {
    // Responsive sizing based on screen size
    const keySize = isTinyScreen ? 60 : isSmallScreen ? 70 : 80;
    const keyMargin = isTinyScreen ? theme.spacing.xs : isSmallScreen ? theme.spacing.sm : theme.spacing.md;
    const dotSize = isSmallScreen ? 14 : 16;
    const dotMargin = isTinyScreen ? theme.spacing.sm : theme.spacing.md;
    const titleFontSize = isTinyScreen ? theme.typography.fontSize.xl : isSmallScreen ? theme.typography.fontSize.xxl - 2 : theme.typography.fontSize.xxl;
    const subtitleFontSize = isSmallScreen ? theme.typography.fontSize.sm : theme.typography.fontSize.md;
    const keyFontSize = isTinyScreen ? theme.typography.fontSize.lg : isSmallScreen ? theme.typography.fontSize.xl - 2 : theme.typography.fontSize.xl;
    const containerPadding = isSmallScreen ? theme.spacing.md : theme.spacing.lg;
    const verticalSpacing = isTinyScreen ? theme.spacing.md : isSmallScreen ? theme.spacing.lg : theme.spacing.xl;
    
    return StyleSheet.create({
      container: { flex: 1, backgroundColor: theme.colors.background },
      header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: theme.spacing.md, 
        paddingVertical: theme.spacing.sm + 2, 
        borderBottomWidth: 1, 
        borderBottomColor: theme.colors.border, 
        backgroundColor: theme.colors.card 
      },
      backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
      headerTitle: { fontSize: theme.typography.fontSize.lg, fontWeight: '600', color: theme.colors.textPrimary },
      passcodeContainer: { 
        flex: 1, 
        alignItems: 'center', 
        paddingHorizontal: containerPadding, 
        paddingTop: containerPadding, 
        justifyContent: isSmallScreen ? 'flex-start' : 'center' 
      },
      passcodeTitle: { 
        fontSize: titleFontSize, 
        fontWeight: '600', 
        color: theme.colors.textPrimary, 
        marginBottom: theme.spacing.sm, 
        textAlign: 'center',
        marginTop: isSmallScreen ? theme.spacing.md : 0
      },
      passcodeSubtitle: { 
        fontSize: subtitleFontSize, 
        color: theme.colors.textSecondary, 
        marginBottom: verticalSpacing, 
        textAlign: 'center', 
        paddingHorizontal: theme.spacing.md, 
        lineHeight: isSmallScreen ? 18 : 22 
      },
      passcodeDots: { 
        flexDirection: 'row', 
        justifyContent: 'center', 
        marginBottom: verticalSpacing 
      },
      passcodeDot: { 
        width: dotSize, 
        height: dotSize, 
        borderRadius: dotSize / 2, 
        backgroundColor: theme.colors.inputBorder, 
        marginHorizontal: dotMargin 
      },
      passcodeDotFilled: { backgroundColor: theme.colors.primary },
      passcodeKeypad: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        justifyContent: 'center', 
        width: '100%', 
        maxWidth: isTinyScreen ? 280 : isSmallScreen ? 320 : 350, 
        marginBottom: isSmallScreen ? theme.spacing.md : theme.spacing.lg 
      },
      passcodeKey: { 
        width: keySize, 
        height: keySize, 
        borderRadius: keySize / 2, 
        backgroundColor: theme.colors.card, 
        margin: keyMargin, 
        justifyContent: 'center', 
        alignItems: 'center', 
        ...theme.shadows.small 
      },
      passcodeKeyText: { 
        fontSize: keyFontSize, 
        fontWeight: '500', 
        color: theme.colors.textPrimary 
      },
      passcodeKeyEmpty: { 
        width: keySize, 
        height: keySize, 
        margin: keyMargin 
      },
      passcodeKeyDelete: { 
        width: keySize, 
        height: keySize, 
        borderRadius: keySize / 2, 
        margin: keyMargin, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: theme.colors.background 
      },
      securityText: { 
        fontSize: isSmallScreen ? theme.typography.fontSize.xs : theme.typography.fontSize.sm, 
        color: theme.colors.textSecondary, 
        textAlign: 'center', 
        marginHorizontal: theme.spacing.lg, 
        lineHeight: isSmallScreen ? 16 : 20, 
        marginTop: isSmallScreen ? 'auto' : 'auto', 
        paddingBottom: isSmallScreen ? theme.spacing.sm : theme.spacing.lg 
      },
    });
  }, [theme, isSmallScreen, isTinyScreen]);

  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < 6; i++) {
      dots.push(
        <View 
          key={i} 
          style={[
            styles.passcodeDot, 
            i < passcode.length && styles.passcodeDotFilled
          ]} 
        />
      );
    }
    return dots;
  };

  const renderKeypad = () => {
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'delete'];
    return keys.map((key, index) => {
      if (key === null) {
        return <View key={index} style={styles.passcodeKeyEmpty} />;
      }
      
      if (key === 'delete') {
        return (
          <TouchableOpacity
            key={index}
            style={styles.passcodeKeyDelete}
            onPress={() => handleKeyPress('delete')}
          >
            <Ionicons 
              name="backspace-outline" 
              size={isSmallScreen ? 20 : 24} 
              color={theme.colors.primary} 
            />
          </TouchableOpacity>
        );
      }
      
      return (
        <TouchableOpacity
          key={index}
          style={styles.passcodeKey}
          onPress={() => handleKeyPress(key as number)}
        >
          <Text style={styles.passcodeKeyText}>{key}</Text>
        </TouchableOpacity>
      );
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background}/>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Passcode
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.passcodeContainer}>
        <Text style={styles.passcodeTitle}>
          {mode === 'create' ? 'Create your passcode' : 'Confirm your passcode'}
        </Text>
        <Text style={styles.passcodeSubtitle}>
          {mode === 'create' 
            ? 'Enter a 6-digit passcode for your account.' 
            : 'Re-enter your 6-digit passcode to confirm.'}
        </Text>

        <View style={styles.passcodeDots}>
          {renderDots()}
        </View>

        <View style={styles.passcodeKeypad}>
          {renderKeypad()}
        </View>

        <Text style={styles.securityText}>
          This passcode will be used to access your account.{'\n'}
          Make sure it's secure and don't share it with anyone.
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default PasscodeScreen; 
 