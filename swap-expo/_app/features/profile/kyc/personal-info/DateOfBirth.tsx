import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../../theme/ThemeContext';
import { Theme } from '../../../../theme/theme';
import { useFocusEffect } from '@react-navigation/native';
import { usePersonalInfoLoad } from '../../../../hooks-actions/usePersonalInfoLoad';

interface DateOfBirthProps {
  onBack: () => void;
  onContinue: (day: number, month: number, year: number) => void;
  day?: number;
  month?: number;
  year?: number;
}

const DateOfBirth: React.FC<DateOfBirthProps> = ({
  onBack,
  onContinue,
  day,
  month,
  year,
}) => {
  const { theme } = useTheme();
  const { personalInfo } = usePersonalInfoLoad();
  
  // Initialize with provided date, saved date, or default to 18 years ago
  const initialDate = React.useMemo(() => {
    // First priority: passed props
    if (day && month && year) {
      return new Date(year, month - 1, day);
    }
    
    // Second priority: saved personal info
    if (personalInfo?.birthDate) {
      const savedDate = new Date(personalInfo.birthDate);
      if (!isNaN(savedDate.getTime())) {
        return savedDate;
      }
    }
    
    // Default to 18 years ago from today
    const today = new Date();
    const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    return eighteenYearsAgo;
  }, [day, month, year, personalInfo]);

  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Update selected date when personal info loads (only if no props were passed)
  useEffect(() => {
    if (personalInfo?.birthDate && !day && !month && !year) {
      const savedDate = new Date(personalInfo.birthDate);
      if (!isNaN(savedDate.getTime())) {
        setSelectedDate(savedDate);
      }
    }
  }, [personalInfo, day, month, year]);

  // Create maximum date (must be at least 18 years old)
  const maxDate = React.useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  }, []);

  // Create minimum date (reasonable birth date limit)
  const minDate = React.useMemo(() => {
    return new Date(1900, 0, 1);
  }, []);

  const handleContinue = () => {
    const day = selectedDate.getDate();
    const month = selectedDate.getMonth() + 1; // getMonth() is 0-indexed
    const year = selectedDate.getFullYear();
    onContinue(day, month, year);
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // Keep open on iOS, close on Android
    if (date) {
      setSelectedDate(date);
    }
  };

  const formatDisplayDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Styles memoized with theme dependency
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.card
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: { 
      width: 40, 
      height: 40, 
      justifyContent: 'center', 
      alignItems: 'center' 
    },
    headerTitle: { 
      fontSize: theme.typography.fontSize.lg, 
      fontWeight: '600', 
      color: theme.colors.textPrimary 
    },
    content: { 
      flex: 1,
      backgroundColor: theme.colors.background, 
    },
    formContainer: { 
      padding: theme.spacing.lg, 
      flex: 1 
    },
    title: { 
      fontSize: theme.typography.fontSize.xl, 
      fontWeight: '600', 
      color: theme.colors.textPrimary, 
      marginBottom: theme.spacing.xs 
    },
    subtitle: { 
      fontSize: theme.typography.fontSize.md, 
      color: theme.colors.textSecondary, 
      marginBottom: theme.spacing.xl 
    },
    dateInputContainer: {
      marginBottom: theme.spacing.xl,
    },
    label: { 
      fontSize: theme.typography.fontSize.md, 
      fontWeight: '500', 
      color: theme.colors.textPrimary, 
      marginBottom: theme.spacing.sm,
    },
    dateInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.inputBackground,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 56,
    },
    dateInputFocused: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
    },
    dateText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textPrimary,
      fontWeight: '500',
    },
    placeholderText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
    },
    calendarIcon: {
      marginLeft: theme.spacing.sm,
    },
    continueButton: {
      backgroundColor: theme.colors.primary, 
      borderRadius: theme.borderRadius.md, 
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg, 
      alignItems: 'center',
      marginTop: 'auto',
    },
    continueButtonText: { 
      color: theme.colors.white, 
      fontSize: theme.typography.fontSize.md, 
      fontWeight: '500' 
    },
    helpText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      fontStyle: 'italic',
    },
    // New styles for better picker layout
    pickerContainer: {
      backgroundColor: theme.colors.background,
      paddingVertical: theme.spacing.md,
    },
    pickerWrapper: {
      backgroundColor: theme.colors.background,
      marginHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
    },
    continueButtonFixed: {
      backgroundColor: theme.colors.primary, 
      borderRadius: theme.borderRadius.md, 
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg, 
      alignItems: 'center',
      margin: theme.spacing.lg,
      marginTop: theme.spacing.md,
    },
  }), [theme, showDatePicker]);

  // Set status bar style when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const headerBackgroundColor = theme.colors.card;
      const isDarkBackground = theme.isDark;

      StatusBar.setBarStyle(isDarkBackground ? 'light-content' : 'dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(headerBackgroundColor);
        StatusBar.setTranslucent(false);
      }
      return () => {
        // Optional: Reset status bar styles when screen loses focus if needed
      };
    }, [theme])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Date of birth</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Date of birth</Text>
          <Text style={styles.subtitle}>
            Your birth date as it appears on your official documents.
          </Text>
          
          <View style={styles.dateInputContainer}>
            <Text style={styles.label}>Select your date of birth</Text>
            
            <TouchableOpacity 
              style={[styles.dateInput, showDatePicker && styles.dateInputFocused]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dateText}>
                {formatDisplayDate(selectedDate)}
              </Text>
              <Ionicons 
                name="calendar-outline" 
                size={24} 
                color={theme.colors.textSecondary}
                style={styles.calendarIcon}
              />
            </TouchableOpacity>
            
            <Text style={styles.helpText}>
              Tap to select your date of birth (you must be at least 18 years old)
            </Text>
          </View>

          {/* Show Continue button here only when picker is NOT visible */}
          {!showDatePicker && (
            <TouchableOpacity 
              style={styles.continueButton} 
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          )}
              </View>
            </View>
            
      {/* Date picker with better layout */}
      {showDatePicker && (
              <View style={styles.pickerContainer}>
          <View style={styles.pickerWrapper}>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              maximumDate={maxDate}
              minimumDate={minDate}
              textColor={theme.colors.textPrimary}
              style={{
                backgroundColor: theme.colors.background,
              }}
            />
          </View>
          
          {/* Continue button below picker */}
          <TouchableOpacity 
            style={styles.continueButtonFixed} 
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default DateOfBirth; 