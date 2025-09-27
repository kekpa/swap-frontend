import { useMemo } from 'react';

export interface PasswordStrengthResult {
  score: number; // 0-4 (0 = very weak, 4 = very strong)
  strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
  isValid: boolean;
}

const COMMON_PASSWORDS = [
  'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
  'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1',
  'qwerty123', 'welcome123', 'admin123', 'root', 'toor', 'pass',
  'test', 'guest', 'user', 'temp', 'demo', '000000', '111111'
];

export const usePasswordStrength = (password: string): PasswordStrengthResult => {
  return useMemo(() => {
    if (!password) {
      return {
        score: 0,
        strength: 'very-weak',
        feedback: ['Password is required'],
        isValid: false,
      };
    }

    const feedback: string[] = [];
    let score = 0;

    // Length check with bonus for longer passwords
    if (password.length < 8) {
      feedback.push('At least 8 characters required');
    } else if (password.length >= 8) {
      score += 1;
      // Bonus points for longer passwords
      if (password.length >= 12) {
        score += 1; // Extra point for 12+ characters
      }
    }

    // Uppercase letter check
    if (!/[A-Z]/.test(password)) {
      feedback.push('Add at least one uppercase letter');
    } else {
      score += 1;
    }

    // Lowercase letter check
    if (!/[a-z]/.test(password)) {
      feedback.push('Add at least one lowercase letter');
    } else {
      score += 1;
    }

    // Number check
    if (!/\d/.test(password)) {
      feedback.push('Add at least one number');
    } else {
      score += 1;
    }

    // Special character check
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      feedback.push('Add at least one special character (!@#$%^&*...)');
    } else {
      score += 1;
    }

    // Common password check
    if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
      feedback.push('Avoid common passwords');
      score = Math.max(0, score - 2);
    }

    // Sequential characters check
    if (/123|abc|qwe|asd|zxc/i.test(password)) {
      feedback.push('Avoid sequential characters');
      score = Math.max(0, score - 1);
    }

    // Repeated characters check
    if (/(.)\1{2,}/.test(password)) {
      feedback.push('Avoid repeated characters');
      score = Math.max(0, score - 1);
    }

    // Determine strength based on score
    let strength: PasswordStrengthResult['strength'];
    if (score <= 1) {
      strength = 'very-weak';
    } else if (score === 2) {
      strength = 'weak';
    } else if (score === 3) {
      strength = 'fair';
    } else if (score === 4) {
      strength = 'good';
    } else if (score >= 5) {
      strength = 'strong';
    } else {
      strength = 'good';
    }

    // Password is valid if it meets minimum requirements
    const isValid = password.length >= 8 && score >= 3;

    // If password is strong, provide positive feedback
    if (strength === 'strong') {
      feedback.length = 0;
      feedback.push('Strong password!');
    } else if (strength === 'good') {
      feedback.length = 0;
      feedback.push('Good password');
    }

    return {
      score: Math.min(5, score),
      strength,
      feedback,
      isValid,
    };
  }, [password]);
};