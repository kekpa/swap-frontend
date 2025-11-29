/**
 * usePasswordStrength Hook Tests
 *
 * Tests password validation and strength scoring
 *
 * Key behaviors tested:
 * - Empty/null password handling
 * - Length requirements (8+ characters, bonus for 12+)
 * - Character type requirements (uppercase, lowercase, numbers, special)
 * - Common password detection
 * - Sequential character detection
 * - Repeated character detection
 * - Strength scoring (very-weak to strong)
 * - isValid flag for minimum requirements
 */

import { renderHook } from '@testing-library/react-native';
import { usePasswordStrength, PasswordStrengthResult } from '../usePasswordStrength';

describe('usePasswordStrength', () => {
  describe('empty password handling', () => {
    it('should return very-weak for empty string', () => {
      const { result } = renderHook(() => usePasswordStrength(''));

      expect(result.current.score).toBe(0);
      expect(result.current.strength).toBe('very-weak');
      expect(result.current.isValid).toBe(false);
      expect(result.current.feedback).toContain('Password is required');
    });

    it('should handle undefined-like empty password', () => {
      const { result } = renderHook(() => usePasswordStrength(''));

      expect(result.current.isValid).toBe(false);
    });
  });

  describe('length requirements', () => {
    it('should fail for password shorter than 8 characters', () => {
      // Use password missing multiple requirements so feedback isn't cleared
      const { result } = renderHook(() => usePasswordStrength('short'));

      expect(result.current.feedback).toContain('At least 8 characters required');
      expect(result.current.isValid).toBe(false);
    });

    it('should pass length check for 8+ characters', () => {
      const { result } = renderHook(() => usePasswordStrength('longpassword'));

      expect(result.current.feedback).not.toContain('At least 8 characters required');
    });

    it('should give bonus score for 12+ characters', () => {
      // Both passwords missing special char to prevent "Good password" override
      const shortPassword = renderHook(() => usePasswordStrength('Pass12ab'));
      const longPassword = renderHook(() => usePasswordStrength('VeryLongPass12ab'));

      // Long password should have higher score due to length bonus
      expect(longPassword.result.current.score).toBeGreaterThan(shortPassword.result.current.score);
    });
  });

  describe('character type requirements', () => {
    it('should require uppercase letter', () => {
      // Missing uppercase - will have feedback (not strong enough to clear)
      const { result } = renderHook(() => usePasswordStrength('lowercase1'));

      expect(result.current.feedback).toContain('Add at least one uppercase letter');
    });

    it('should pass with uppercase letter', () => {
      const { result } = renderHook(() => usePasswordStrength('Lowercase1'));

      expect(result.current.feedback).not.toContain('Add at least one uppercase letter');
    });

    it('should require lowercase letter', () => {
      // Missing lowercase - will have feedback
      const { result } = renderHook(() => usePasswordStrength('UPPERCASE1'));

      expect(result.current.feedback).toContain('Add at least one lowercase letter');
    });

    it('should pass with lowercase letter', () => {
      const { result } = renderHook(() => usePasswordStrength('UPPERCASe1'));

      expect(result.current.feedback).not.toContain('Add at least one lowercase letter');
    });

    it('should require number', () => {
      // Missing number - use lowercase only to stay at score 2 (weak) so feedback shows
      // 'nonumber' = 8 (+1), lowercase (+1) = 2 (weak)
      const { result } = renderHook(() => usePasswordStrength('nonumber'));

      expect(result.current.feedback).toContain('Add at least one number');
    });

    it('should pass with number', () => {
      const { result } = renderHook(() => usePasswordStrength('HasNumber1'));

      expect(result.current.feedback).not.toContain('Add at least one number');
    });

    it('should require special character', () => {
      // Use password that scores fair (3) so feedback isn't cleared
      // lowercase1 = length 10 (+1), lowercase (+1), number (+1) = 3 (fair), missing uppercase and special
      const { result } = renderHook(() => usePasswordStrength('lowercase1'));

      expect(result.current.feedback).toContain('Add at least one special character (!@#$%^&*...)');
    });

    it('should pass with special character', () => {
      const { result } = renderHook(() => usePasswordStrength('Special123!'));

      expect(result.current.feedback).not.toContain('Add at least one special character (!@#$%^&*...)');
    });

    it('should accept various special characters', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '='];

      specialChars.forEach((char) => {
        const { result } = renderHook(() => usePasswordStrength(`Password1${char}`));
        expect(result.current.feedback).not.toContain('Add at least one special character (!@#$%^&*...)');
      });
    });
  });

  describe('common password detection', () => {
    it('should detect common passwords', () => {
      const commonPasswords = ['password', 'Password', 'PASSWORD', '123456', 'qwerty', 'admin'];

      commonPasswords.forEach((pwd) => {
        const { result } = renderHook(() => usePasswordStrength(pwd));
        expect(result.current.feedback).toContain('Avoid common passwords');
      });
    });

    it('should reduce score for common passwords', () => {
      const { result } = renderHook(() => usePasswordStrength('password'));

      expect(result.current.score).toBeLessThanOrEqual(2);
    });

    it('should not flag uncommon passwords', () => {
      const { result } = renderHook(() => usePasswordStrength('UniqueP@ss123'));

      expect(result.current.feedback).not.toContain('Avoid common passwords');
    });
  });

  describe('sequential character detection', () => {
    it('should detect 123 sequence', () => {
      // Use password without special char so feedback isn't cleared by "Strong password"
      const { result } = renderHook(() => usePasswordStrength('Has123AB'));

      expect(result.current.feedback).toContain('Avoid sequential characters');
    });

    it('should detect abc sequence', () => {
      const { result } = renderHook(() => usePasswordStrength('Hasabc12'));

      expect(result.current.feedback).toContain('Avoid sequential characters');
    });

    it('should detect qwe sequence', () => {
      const { result } = renderHook(() => usePasswordStrength('Hasqwe12'));

      expect(result.current.feedback).toContain('Avoid sequential characters');
    });

    it('should reduce score for sequential characters', () => {
      // Both passwords without special char to avoid hitting score 5
      const withSequence = renderHook(() => usePasswordStrength('Pass123A'));
      const withoutSequence = renderHook(() => usePasswordStrength('Pass147A'));

      expect(withSequence.result.current.score).toBeLessThan(withoutSequence.result.current.score);
    });
  });

  describe('repeated character detection', () => {
    it('should detect 3+ repeated characters', () => {
      // Use password without special char so feedback isn't cleared by "Strong password"
      const { result } = renderHook(() => usePasswordStrength('Passsss1'));

      expect(result.current.feedback).toContain('Avoid repeated characters');
    });

    it('should allow 2 repeated characters', () => {
      const { result } = renderHook(() => usePasswordStrength('Password11'));

      expect(result.current.feedback).not.toContain('Avoid repeated characters');
    });

    it('should reduce score for repeated characters', () => {
      // Use passwords without numbers to keep scores lower
      // Passssss = 8 (+1), upper (+1), lower (+1), repeated (-1) = 2
      // Passwork = 8 (+1), upper (+1), lower (+1) = 3
      const withRepeated = renderHook(() => usePasswordStrength('Passssss'));
      const withoutRepeated = renderHook(() => usePasswordStrength('Passwork'));

      expect(withRepeated.result.current.score).toBeLessThan(withoutRepeated.result.current.score);
    });
  });

  describe('strength scoring', () => {
    it('should return very-weak for score <= 1', () => {
      const { result } = renderHook(() => usePasswordStrength('weak'));

      expect(result.current.strength).toBe('very-weak');
    });

    it('should return weak for score 2', () => {
      const { result } = renderHook(() => usePasswordStrength('weakpass'));

      expect(result.current.strength).toBe('weak');
    });

    it('should return fair for score 3', () => {
      // Score 3: length 8+ (+1), uppercase (+1), lowercase (+1) = 3 (missing number and special)
      const { result } = renderHook(() => usePasswordStrength('Fairpass'));

      expect(result.current.strength).toBe('fair');
    });

    it('should return good for score 4', () => {
      // Score 4: length 8-11 (+1), uppercase (+1), lowercase (+1), number (+1) = 4 (missing special)
      const { result } = renderHook(() => usePasswordStrength('GoodPass1'));

      expect(result.current.strength).toBe('good');
      expect(result.current.feedback).toContain('Good password');
    });

    it('should return strong for score >= 5', () => {
      const { result } = renderHook(() => usePasswordStrength('VeryStrongPass1!@'));

      expect(result.current.strength).toBe('strong');
      expect(result.current.feedback).toContain('Strong password!');
    });

    it('should cap score at 5', () => {
      const { result } = renderHook(() => usePasswordStrength('SuperLongAndStrong!@#$Password123'));

      expect(result.current.score).toBeLessThanOrEqual(5);
    });
  });

  describe('isValid flag', () => {
    it('should be false for short passwords', () => {
      const { result } = renderHook(() => usePasswordStrength('Short1!'));

      expect(result.current.isValid).toBe(false);
    });

    it('should be false for low score passwords', () => {
      const { result } = renderHook(() => usePasswordStrength('password'));

      expect(result.current.isValid).toBe(false);
    });

    it('should be true for passwords meeting minimum requirements', () => {
      const { result } = renderHook(() => usePasswordStrength('ValidPass1!'));

      expect(result.current.isValid).toBe(true);
    });

    it('should require both length >= 8 AND score >= 3', () => {
      // Long but low score password (only lowercase = score 2)
      // 'weakpass' = length 8 (+1), lowercase (+1) = score 2 (weak)
      const longWeak = renderHook(() => usePasswordStrength('weakpass'));
      expect(longWeak.result.current.isValid).toBe(false);

      // Short but complex password (length < 8)
      const shortComplex = renderHook(() => usePasswordStrength('Abc1!@'));
      expect(shortComplex.result.current.isValid).toBe(false);

      // Both requirements met
      const valid = renderHook(() => usePasswordStrength('ValidPass1!'));
      expect(valid.result.current.isValid).toBe(true);
    });
  });

  describe('memoization', () => {
    it('should return same result for same password', () => {
      const { result, rerender } = renderHook(
        ({ password }) => usePasswordStrength(password),
        { initialProps: { password: 'TestPass1!' } }
      );

      const firstResult = result.current;

      rerender({ password: 'TestPass1!' });

      // Result object should be referentially equal due to useMemo
      expect(result.current).toBe(firstResult);
    });

    it('should update when password changes', () => {
      const { result, rerender } = renderHook(
        ({ password }) => usePasswordStrength(password),
        { initialProps: { password: 'WeakPass' } }
      );

      const firstStrength = result.current.strength;

      rerender({ password: 'StrongPass1!@#' });

      expect(result.current.strength).not.toBe(firstStrength);
    });
  });

  describe('edge cases', () => {
    it('should handle very long passwords', () => {
      const longPassword = 'A'.repeat(100) + 'a1!';
      const { result } = renderHook(() => usePasswordStrength(longPassword));

      expect(result.current).toBeDefined();
      expect(result.current.score).toBeGreaterThan(0);
    });

    it('should handle unicode characters', () => {
      const { result } = renderHook(() => usePasswordStrength('Password1!émoji'));

      expect(result.current).toBeDefined();
    });

    it('should handle whitespace in password', () => {
      const { result } = renderHook(() => usePasswordStrength('Pass word 1!'));

      expect(result.current).toBeDefined();
      expect(result.current.score).toBeGreaterThan(0);
    });

    it('should handle only special characters', () => {
      const { result } = renderHook(() => usePasswordStrength('!@#$%^&*'));

      expect(result.current.isValid).toBe(false);
      expect(result.current.feedback).toContain('Add at least one uppercase letter');
      expect(result.current.feedback).toContain('Add at least one lowercase letter');
      expect(result.current.feedback).toContain('Add at least one number');
    });
  });

  describe('real-world password examples', () => {
    it('should reject "password123"', () => {
      const { result } = renderHook(() => usePasswordStrength('password123'));

      expect(result.current.isValid).toBe(false);
      expect(result.current.feedback).toContain('Avoid common passwords');
    });

    it('should accept "MyS3cur3P@ssw0rd"', () => {
      const { result } = renderHook(() => usePasswordStrength('MyS3cur3P@ssw0rd'));

      expect(result.current.isValid).toBe(true);
      expect(result.current.strength).toBe('strong');
    });

    it('should accept "Sw@pN30b@nk2025!"', () => {
      const { result } = renderHook(() => usePasswordStrength('Sw@pN30b@nk2025!'));

      expect(result.current.isValid).toBe(true);
      expect(result.current.strength).toBe('strong');
    });
  });
});
