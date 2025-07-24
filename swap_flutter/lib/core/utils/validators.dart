/// Input Validators
/// 
/// Collection of validation functions for common input types
/// used throughout the app.
class Validators {
  /// Email validation
  static String? email(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Email is required';
    }
    
    final emailRegex = RegExp(
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
    );
    
    if (!emailRegex.hasMatch(value.trim())) {
      return 'Please enter a valid email address';
    }
    
    return null;
  }

  /// Password validation
  static String? password(String? value) {
    if (value == null || value.isEmpty) {
      return 'Password is required';
    }
    
    if (value.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    
    if (!RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)').hasMatch(value)) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    
    return null;
  }

  /// Simple password validation (for login)
  static String? simplePassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Password is required';
    }
    
    if (value.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    
    return null;
  }

  /// Phone number validation
  static String? phoneNumber(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Phone number is required';
    }
    
    // Remove all non-digit characters
    final digitsOnly = value.replaceAll(RegExp(r'\D'), '');
    
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return 'Please enter a valid phone number';
    }
    
    return null;
  }

  /// Required field validation
  static String? required(String? value, [String? fieldName]) {
    if (value == null || value.trim().isEmpty) {
      return '${fieldName ?? 'This field'} is required';
    }
    return null;
  }

  /// Amount validation (for financial transactions)
  static String? amount(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Amount is required';
    }
    
    final amount = double.tryParse(value.trim());
    if (amount == null) {
      return 'Please enter a valid amount';
    }
    
    if (amount <= 0) {
      return 'Amount must be greater than zero';
    }
    
    if (amount > 1000000) {
      return 'Amount cannot exceed \$1,000,000';
    }
    
    // Check for more than 2 decimal places
    if (value.contains('.') && value.split('.')[1].length > 2) {
      return 'Amount cannot have more than 2 decimal places';
    }
    
    return null;
  }

  /// PIN validation (for security)
  static String? pin(String? value) {
    if (value == null || value.isEmpty) {
      return 'PIN is required';
    }
    
    if (value.length != 4 && value.length != 6) {
      return 'PIN must be 4 or 6 digits';
    }
    
    if (!RegExp(r'^\d+$').hasMatch(value)) {
      return 'PIN must contain only numbers';
    }
    
    return null;
  }

  /// Name validation
  static String? name(String? value, [String? fieldName]) {
    if (value == null || value.trim().isEmpty) {
      return '${fieldName ?? 'Name'} is required';
    }
    
    if (value.trim().length < 2) {
      return '${fieldName ?? 'Name'} must be at least 2 characters long';
    }
    
    if (value.trim().length > 50) {
      return '${fieldName ?? 'Name'} cannot exceed 50 characters';
    }
    
    // Allow letters, spaces, hyphens, and apostrophes
    if (!RegExp(r"^[a-zA-Z\s\-']+$").hasMatch(value.trim())) {
      return '${fieldName ?? 'Name'} can only contain letters, spaces, hyphens, and apostrophes';
    }
    
    return null;
  }

  /// Username validation
  static String? username(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Username is required';
    }
    
    if (value.length < 3) {
      return 'Username must be at least 3 characters long';
    }
    
    if (value.length > 20) {
      return 'Username cannot exceed 20 characters';
    }
    
    // Allow letters, numbers, underscores, and hyphens
    if (!RegExp(r'^[a-zA-Z0-9_-]+$').hasMatch(value)) {
      return 'Username can only contain letters, numbers, underscores, and hyphens';
    }
    
    // Must start with a letter
    if (!RegExp(r'^[a-zA-Z]').hasMatch(value)) {
      return 'Username must start with a letter';
    }
    
    return null;
  }

  /// Date validation (for date of birth, etc.)
  static String? date(String? value, [String? fieldName]) {
    if (value == null || value.trim().isEmpty) {
      return '${fieldName ?? 'Date'} is required';
    }
    
    try {
      final date = DateTime.parse(value);
      final now = DateTime.now();
      
      // Check if date is in the future
      if (date.isAfter(now)) {
        return '${fieldName ?? 'Date'} cannot be in the future';
      }
      
      // For date of birth, check minimum age (13 years)
      if (fieldName?.toLowerCase().contains('birth') == true) {
        final age = now.difference(date).inDays / 365;
        if (age < 13) {
          return 'You must be at least 13 years old';
        }
        if (age > 120) {
          return 'Please enter a valid date of birth';
        }
      }
      
      return null;
    } catch (e) {
      return 'Please enter a valid date';
    }
  }

  /// URL validation
  static String? url(String? value, [String? fieldName]) {
    if (value == null || value.trim().isEmpty) {
      return null; // URL is usually optional
    }
    
    try {
      final uri = Uri.parse(value.trim());
      if (!uri.hasScheme || (uri.scheme != 'http' && uri.scheme != 'https')) {
        return 'Please enter a valid URL starting with http:// or https://';
      }
      return null;
    } catch (e) {
      return 'Please enter a valid URL';
    }
  }

  /// Custom length validation
  static String? length(String? value, int minLength, int maxLength, [String? fieldName]) {
    if (value == null || value.isEmpty) {
      return '${fieldName ?? 'This field'} is required';
    }
    
    if (value.length < minLength) {
      return '${fieldName ?? 'This field'} must be at least $minLength characters long';
    }
    
    if (value.length > maxLength) {
      return '${fieldName ?? 'This field'} cannot exceed $maxLength characters';
    }
    
    return null;
  }

  /// Confirmation field validation (for password confirmation)
  static String? confirmation(String? value, String? originalValue, [String? fieldName]) {
    if (value == null || value.isEmpty) {
      return '${fieldName ?? 'Confirmation'} is required';
    }
    
    if (value != originalValue) {
      return '${fieldName ?? 'Values'} do not match';
    }
    
    return null;
  }

  /// Numeric validation
  static String? numeric(String? value, [String? fieldName]) {
    if (value == null || value.trim().isEmpty) {
      return '${fieldName ?? 'This field'} is required';
    }
    
    if (double.tryParse(value.trim()) == null) {
      return 'Please enter a valid number';
    }
    
    return null;
  }

  /// Positive number validation
  static String? positiveNumber(String? value, [String? fieldName]) {
    final numericResult = numeric(value, fieldName);
    if (numericResult != null) return numericResult;
    
    final number = double.parse(value!.trim());
    if (number <= 0) {
      return '${fieldName ?? 'Value'} must be greater than zero';
    }
    
    return null;
  }

  /// Combine multiple validators
  static String? Function(String?) combine(List<String? Function(String?)> validators) {
    return (String? value) {
      for (final validator in validators) {
        final result = validator(value);
        if (result != null) return result;
      }
      return null;
    };
  }
}

/// Validation helper functions
class ValidationHelpers {
  /// Clean and format phone number
  static String cleanPhoneNumber(String phoneNumber) {
    return phoneNumber.replaceAll(RegExp(r'\D'), '');
  }

  /// Format phone number for display
  static String formatPhoneNumber(String phoneNumber) {
    final cleaned = cleanPhoneNumber(phoneNumber);
    if (cleaned.length == 10) {
      return '(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}';
    }
    return phoneNumber;
  }

  /// Clean and format amount
  static String cleanAmount(String amount) {
    return amount.replaceAll(RegExp(r'[^\d.]'), '');
  }

  /// Format amount for display
  static String formatAmount(double amount) {
    return '\$${amount.toStringAsFixed(2)}';
  }

  /// Check if string contains only digits
  static bool isNumeric(String str) {
    return RegExp(r'^\d+$').hasMatch(str);
  }

  /// Check if email format is valid (basic check)
  static bool isValidEmail(String email) {
    return RegExp(r'^[^@]+@[^@]+\.[^@]+').hasMatch(email);
  }

  /// Generate validation error map for forms
  static Map<String, String> generateErrorMap(Map<String, String?> validationResults) {
    final errors = <String, String>{};
    validationResults.forEach((key, value) {
      if (value != null) {
        errors[key] = value;
      }
    });
    return errors;
  }
}