import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const PasscodeSetup = () => {
  const navigation = useNavigation();
  const [passcode, setPasscode] = useState<string>('');
  const [confirmPasscode, setConfirmPasscode] = useState<string>('');
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  const handleDigitPress = (digit: string) => {
    if (isConfirming) {
      if (confirmPasscode.length < 4) {
        const newConfirmPasscode = confirmPasscode + digit;
        setConfirmPasscode(newConfirmPasscode);
        
        if (newConfirmPasscode.length === 4) {
          if (newConfirmPasscode === passcode) {
            // Passcodes match, but don't navigate here - let the button handle it
            console.log("Passcodes match!");
          } else {
            // Passcodes don't match, reset confirmation
            setTimeout(() => {
              Alert.alert("Passcodes don't match", "Please try again");
              setConfirmPasscode('');
            }, 200);
          }
        }
      }
    } else {
      if (passcode.length < 4) {
        const newPasscode = passcode + digit;
        setPasscode(newPasscode);
        
        if (newPasscode.length === 4) {
          // Proceed to confirmation
          setTimeout(() => {
            setIsConfirming(true);
          }, 200);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (isConfirming) {
      if (confirmPasscode.length > 0) {
        setConfirmPasscode(confirmPasscode.slice(0, -1));
      }
    } else {
      if (passcode.length > 0) {
        setPasscode(passcode.slice(0, -1));
      }
    }
  };

  const handleContinue = () => {
    // Handle different states
    if (isConfirming && confirmPasscode.length === 4) {
      if (confirmPasscode === passcode) {
        // Both passcodes match - now we can navigate
        console.log("Navigating to BiometricSetup");
        navigation.navigate('BiometricSetup' as never);
      } else {
        Alert.alert("Passcodes don't match", "Please try again");
        setConfirmPasscode('');
      }
    } else if (!isConfirming && passcode.length === 4) {
      // First passcode entry complete, move to confirmation
      setIsConfirming(true);
    } else {
      // Not enough digits entered
      Alert.alert("Enter complete passcode", "Please enter all 4 digits");
    }
  };

  const renderDots = () => {
    const dots = [];
    const code = isConfirming ? confirmPasscode : passcode;
    
    for (let i = 0; i < 4; i++) {
      dots.push(
        <View 
          key={i} 
          style={[
            styles.passcodeCircle, 
            { borderColor: "#E2E8F0" },
            i < code.length && [styles.filledCircle, { backgroundColor: '#8b14fd' }]
          ]} 
        />
      );
    }
    
    return (
      <View style={styles.dotsContainer}>
        {dots}
      </View>
    );
  };

  const renderKeypad = () => {
    const keypadButtons = [
      [{ num: '1', letters: '' }, { num: '2', letters: 'ABC' }, { num: '3', letters: 'DEF' }],
      [{ num: '4', letters: 'GHI' }, { num: '5', letters: 'JKL' }, { num: '6', letters: 'MNO' }],
      [{ num: '7', letters: 'PQRS' }, { num: '8', letters: 'TUV' }, { num: '9', letters: 'WXYZ' }],
      [{ num: '', letters: '' }, { num: '0', letters: '' }, { num: 'back', letters: '' }]
    ];
    
    return (
      <View style={styles.keypadContainer}>
        {keypadButtons.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.keypadRow}>
            {row.map((button, buttonIndex) => {
              if (button.num === '') {
                return <View key={`empty-${rowIndex}-${buttonIndex}`} style={styles.keypadButtonEmpty} />;
              }
              
              if (button.num === 'back') {
                return (
                  <TouchableOpacity 
                    key={`back-${rowIndex}-${buttonIndex}`}
                    style={styles.keypadButton}
                    onPress={handleBackspace}
                  >
                    <Ionicons name="backspace-outline" size={24} color="#64748B" />
                  </TouchableOpacity>
                );
              }
              
              return (
                <TouchableOpacity 
                  key={`${button.num}-${rowIndex}-${buttonIndex}`}
                  style={styles.keypadButton}
                  onPress={() => handleDigitPress(button.num)}
                >
                  <Text style={styles.keypadDigit}>
                    {button.num}
                  </Text>
                  {button.letters !== '' && (
                    <Text style={styles.keypadLetters}>
                      {button.letters}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => {
          if (isConfirming) {
            setIsConfirming(false);
            setConfirmPasscode('');
          } else {
            navigation.goBack();
          }
        }}
      >
        <Ionicons name="arrow-back" size={24} color="#64748B" />
      </TouchableOpacity>
      
      <View style={styles.contentContainer}>
        <Text style={styles.title}>
          {isConfirming ? 'Confirm your passcode' : 'Set your passcode'}
        </Text>
        <Text style={styles.subtitle}>
          Fast and easy login
        </Text>
        
        {renderDots()}
        {renderKeypad()}
      </View>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1A202C',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 48,
    color: '#64748B',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  passcodeCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 10,
  },
  filledCircle: {
    borderWidth: 0,
  },
  keypadContainer: {
    width: '100%',
    maxWidth: 280,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  keypadButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  keypadButtonEmpty: {
    width: 70,
    height: 70,
  },
  keypadDigit: {
    fontSize: 24,
    fontWeight: '500',
    color: '#1A202C',
  },
  keypadLetters: {
    fontSize: 10,
    fontWeight: '400',
    marginTop: 2,
    color: '#64748B',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 20,
    marginBottom: 10,
  },
  continueButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#8b14fd',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PasscodeSetup; 