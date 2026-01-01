/**
 * TimelineActivity.tsx
 *
 * Unified components for chat timeline items: transactions, messages, and date separators.
 * All components use theme colors - no hardcoded values.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../../theme/theme';
import { getTransactionStatusDisplay } from '../../../utils/transactionStatusDisplay';

// ============================================================================
// TYPES
// ============================================================================

export interface TransactionBubbleProps {
  amount: string;
  date?: string;
  time: string;
  source: string;
  type: 'sent' | 'received';
  transactionId: string;
  status?: string;
  theme: Theme;
  isFromCurrentUser: boolean;
  onPress?: () => void;
}

export interface MessageBubbleProps {
  content: string;
  time: string;
  isFromContact: boolean;
  theme: Theme;
}

export interface DateSeparatorProps {
  date: string;
  theme: Theme;
}

// ============================================================================
// STYLES
// ============================================================================

const createTransactionStyles = (theme: Theme) => StyleSheet.create({
  transactionContainer: {
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.sm,
  },
  // Sent transaction: rounded corners except bottom-right (tail pointing to sender)
  transactionBubble: {
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.xs,
    padding: theme.spacing.sm,
    minWidth: 160,
    maxWidth: '65%',
    borderWidth: 1,
    backgroundColor: theme.colors.primaryUltraLight,
    borderColor: theme.colors.primaryLight,
    alignSelf: 'flex-end',
  },
  // Received transaction: rounded corners except bottom-left (tail pointing to contact)
  receivedTransactionBubble: {
    backgroundColor: theme.colors.grayUltraLight,
    borderColor: theme.colors.border,
    alignSelf: 'flex-start',
    borderBottomRightRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: theme.borderRadius.xs,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  transactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryUltraLight,
    paddingVertical: 2,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
  },
  transactionBadgeText: {
    color: theme.colors.success,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
    marginLeft: 2,
  },
  transactionAmount: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  receivedTransactionAmount: {
    color: theme.colors.textPrimary,
  },
  transactionDetails: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  transactionStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    gap: 12,
  },
  transactionId: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    flex: 1,
  },
  transactionTime: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    flexShrink: 0,
  },
});

const createMessageStyles = (theme: Theme) => StyleSheet.create({
  messageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  receivedContainer: {
    justifyContent: 'flex-start',
  },
  // Sent message: rounded corners except bottom-right (tail pointing to sender)
  messageBubble: {
    backgroundColor: theme.colors.chatBubbleSent || theme.colors.primary,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    maxWidth: '70%',
  },
  // Received message: rounded corners except bottom-left (tail pointing to contact)
  receivedBubble: {
    backgroundColor: theme.colors.chatBubbleReceived,
    borderBottomRightRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: theme.borderRadius.xs,
  },
  messageText: {
    color: theme.colors.chatBubbleSentText,
    fontSize: theme.typography.fontSize.md,
  },
  receivedMessageText: {
    color: theme.colors.chatBubbleReceivedText,
  },
  messageTime: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.chatTimeText,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  receivedMessageTime: {
    color: theme.colors.chatTimeText,
  },
});

const createDateStyles = (theme: Theme) => StyleSheet.create({
  dateHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.divider,
  },
  dateHeaderText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.chatDateLabel,
    marginHorizontal: theme.spacing.sm,
    fontWeight: '500',
  },
});

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * TransactionBubble - Displays a transaction in the chat timeline
 */
export const TransactionBubble: React.FC<TransactionBubbleProps> = ({
  amount,
  time,
  source,
  transactionId,
  status = 'Completed',
  theme,
  isFromCurrentUser,
  onPress,
}) => {
  const styles = useMemo(() => createTransactionStyles(theme), [theme]);

  // Get status display properties from Saga-aware utility
  const statusDisplay = useMemo(() => getTransactionStatusDisplay(status), [status]);

  // Map color type to theme color
  const statusColor = useMemo(() => {
    switch (statusDisplay.color) {
      case 'success': return theme.colors.success;
      case 'error': return theme.colors.error;
      case 'warning': return theme.colors.warning;
      case 'info': return theme.colors.info;
      default: return theme.colors.success;
    }
  }, [statusDisplay.color, theme]);

  const justifyContentStyle: { justifyContent: 'flex-start' | 'flex-end' } =
    isFromCurrentUser ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' };

  const bubbleStyle = isFromCurrentUser
    ? styles.transactionBubble
    : [styles.transactionBubble, styles.receivedTransactionBubble];

  const amountStyle = isFromCurrentUser
    ? styles.transactionAmount
    : [styles.transactionAmount, styles.receivedTransactionAmount];

  return (
    <View style={[styles.transactionContainer, justifyContentStyle]}>
      <TouchableOpacity style={bubbleStyle} onPress={onPress}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionBadge}>
            {statusDisplay.isProcessing ? (
              <ActivityIndicator size={12} color={statusColor} />
            ) : (
              <Ionicons name={statusDisplay.icon} size={14} color={statusColor} />
            )}
            <Text style={[styles.transactionBadgeText, { color: statusColor }]}>
              {statusDisplay.label}
            </Text>
          </View>
        </View>
        <Text style={amountStyle}>{isFromCurrentUser ? '-' : '+'}{amount}</Text>
        {source && <Text style={styles.transactionDetails}>"{source}"</Text>}
        <View style={styles.transactionStatus}>
          <Text style={styles.transactionId}>#{transactionId?.slice(0, 8)}</Text>
          <Text style={styles.transactionTime}>{time}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

/**
 * MessageBubble - Displays a text message in the chat timeline
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  content,
  time,
  isFromContact,
  theme,
}) => {
  const styles = useMemo(() => createMessageStyles(theme), [theme]);

  return (
    <View style={[styles.messageContainer, isFromContact && styles.receivedContainer]}>
      <View style={[styles.messageBubble, isFromContact && styles.receivedBubble]}>
        <Text style={[styles.messageText, isFromContact && styles.receivedMessageText]}>
          {content}
        </Text>
        <Text style={[styles.messageTime, isFromContact && styles.receivedMessageTime]}>
          {time}
        </Text>
      </View>
    </View>
  );
};

/**
 * DateSeparator - Displays a date header between timeline items
 */
export const DateSeparator: React.FC<DateSeparatorProps> = ({ date, theme }) => {
  const styles = useMemo(() => createDateStyles(theme), [theme]);

  return (
    <View style={styles.dateHeaderContainer}>
      <View style={styles.dateHeaderLine} />
      <Text style={styles.dateHeaderText}>{date}</Text>
      <View style={styles.dateHeaderLine} />
    </View>
  );
};

// Legacy exports for backward compatibility
export const ThemedTransaction = TransactionBubble;
export const ThemedMessageBubble = MessageBubble;
export const ThemedDateHeader = DateSeparator;
