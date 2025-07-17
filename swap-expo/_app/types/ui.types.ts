/**
 * UI related types for the frontend
 */

// Navigation param lists for stack navigators
export interface WalletStackParamList {
  Wallet: undefined;
  AddMoneyOptions: undefined;
  SendMoney: undefined;
  RequestMoney: undefined;
  AccountDetails: { accountId: string };
  Profile: undefined;
  CurrencyExchange: object;
  AddWidget: undefined;
  [key: string]: undefined | object | { accountId: string };
}

export interface AuthStackParamList {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VerifyEmail: { email: string };
  ResetPassword: { token: string };
}

export interface RootStackParamList {
  Splash: undefined;
  Auth: undefined;
  Main: { screen?: string };
  ModalStack: undefined;
}

// Widget types for the wallet screen
export interface Widget {
  id: string;
  title: string;
  balance?: string;
  icon: string;
  iconBgColor: string;
}

// Theme configuration
export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  card: string;
  text: string;
  border: string;
  notification: string;
  error: string;
  success: string;
  warning: string;
  info: string;
}

// Modal configuration
export interface ModalConfig {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  type?: 'info' | 'success' | 'error' | 'warning';
} 