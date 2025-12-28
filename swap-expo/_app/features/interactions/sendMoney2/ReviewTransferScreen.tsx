// Created: Added ReviewTransferScreen for transfer review process - 2025-03-22
// Updated: Refactored to use global theme system - YYYY-MM-DD
// Updated: Fixed navigation context for TransferCompletedScreen - 2025-05-23
// Updated: Simplified for backend-driven account resolution - removes toAccount dependency - 2025-06-28
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  TextStyle,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions, RouteProp, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../../theme/ThemeContext';
import { Theme } from '../../../theme/theme';
import { useAuthContext } from '../../auth/context/AuthContext';
import logger from '../../../utils/logger';
// LOCAL-FIRST ARCHITECTURE: SQLite is the source of truth
import { unifiedTimelineService } from '../../../services/UnifiedTimelineService';
import { backgroundSyncService } from '../../../services/BackgroundSyncService';
import { useInteraction } from '../../../tanstack-query/mutations/useInteraction';

interface ReviewTransferScreenProps {
  route: RouteProp<{
    params: {
      // Support both number and string for amount
      amount: number | string;
      recipientName: string;
      recipientInitial: string;
      recipientColor: string;
      message: string;
      toEntityId: string; // The entity ID of the recipient
      fromAccount: any; // Sender account object
      currency: string; // Currency code/ID
      reference?: string;
    };
  }, 'params'>;
}

const ReviewTransferScreen: React.FC<ReviewTransferScreenProps> = ({ route }) => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { theme } = useTheme();
  const { user: currentUser } = useAuthContext();
  const [editingMessage, setEditingMessage] = React.useState(false);
  const [messageText, setMessageText] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);

  // LOCAL-FIRST: ONE hook for interaction management
  const { ensureInteraction } = useInteraction();
  
  const params = route.params || {
    amount: 0,
    recipientName: 'Unknown',
    recipientInitial: 'U',
    recipientColor: theme.colors.secondary,
    message: '',
  };
  
  // Normalize parameters
  const contactName = params.recipientName || 'Unknown';
  const contactInitial = params.recipientInitial || 'U';
  const contactColor = params.recipientColor || theme.colors.secondary;
  const reference = params.message || params.reference || '';
  const toEntityId = params.toEntityId || '';
  
  const fromAccount = params.fromAccount;
  const currencyId = params.currency || 'USD';
  
  // Format currency properly
  const currencySymbol = fromAccount?.currency_symbol || '';
  const currencyCode = fromAccount?.currency_code || fromAccount?.currencies?.code || currencyId;
  
  // Get last 4 digits of account ID for sender account
  const fromAccountLast4 = fromAccount?.id ? fromAccount.id.slice(-4) : fromAccount?.account_number_last4 || '';
  
  // Convert amount to number if it's a string
  const amount = typeof params.amount === 'string' ? parseFloat(params.amount) : params.amount;
  
  // Calculate fees (currently 0, but prepared for future implementation)
  const feeAmount = 0;
  const totalAmount = amount + feeAmount;
  
  // Initialize message text
  React.useEffect(() => {
    setMessageText(reference);
  }, [reference]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleEditMessage = () => {
    setEditingMessage(true);
  };
  
  const handleSaveMessage = () => {
    setEditingMessage(false);
  };

  const handleSend = async () => {
    if (isSending) return;

    const fromEntityId = currentUser?.entityId;

    logger.debug(`[ReviewTransferScreen] 🚀 LOCAL-FIRST: Starting transaction`, "ReviewTransferScreen");

    // Validation (entity-first: only need entityId)
    if (!fromEntityId) {
      alert('Authentication error: Please log in again');
      return;
    }

    if (!toEntityId) {
      alert('Error: No recipient selected');
      return;
    }

    if (fromEntityId === toEntityId) {
      alert('Error: Cannot send transaction to yourself');
      return;
    }

    if (!fromAccount?.id) {
      alert('Error: No wallet selected');
      return;
    }

    setIsSending(true);

    try {
      // STEP 1: Get or create interaction ID (ONE function handles both)
      const interactionId = await ensureInteraction(toEntityId);
      if (!interactionId) {
        throw new Error('Failed to establish connection with recipient');
      }
      logger.debug(`[ReviewTransferScreen] ✅ Interaction: ${interactionId}`, "ReviewTransferScreen");

      // STEP 2: LOCAL-FIRST - Write to SQLite INSTANTLY (UI updates immediately)
      // Uses from_entity_id/to_entity_id for consistency with Supabase
      const { localId, success, error } = await unifiedTimelineService.sendTransaction({
        interactionId,
        entityId: fromEntityId,  // Current user's entity_id (entity-first architecture)
        fromEntityId,            // Who is sending money
        toEntityId,        // Who is receiving money
        amount,
        currencyId,
        currencyCode,
        currencySymbol,
        description: messageText,
        fromWalletId: fromAccount.id,
        transactionType: 'p2p',
        metadata: {
          sender_account_id: fromAccount.id,
          recipient_name: contactName,
        },
      });

      if (!success) {
        throw new Error(error || 'Failed to create transaction');
      }

      logger.debug(`[ReviewTransferScreen] ✅ LOCAL-FIRST: Transaction ${localId} written to SQLite`, "ReviewTransferScreen");

      // STEP 3: Trigger background sync immediately
      backgroundSyncService.triggerSync();

      // STEP 4: Navigate IMMEDIATELY (don't wait for API!)
      navigation.navigate('ContactInteractionHistory2' as any, {
        contactId: toEntityId,
        contactName: contactName,
        contactInitials: contactInitial,
        contactAvatarColor: contactColor,
        interactionId,
        forceRefresh: true,
        showTransferCompletedModal: true,
        transferDetails: {
          amount,
          recipientName: contactName,
          recipientInitial: contactInitial,
          recipientColor: contactColor,
          message: messageText,
          transactionId: localId,
          status: 'processing', // Will update via SQLite reactive query
          createdAt: new Date().toISOString(),
          contactId: toEntityId,
          interactionId,
          currencyCode,
        },
      } as any);

    } catch (error: any) {
      logger.error(`[ReviewTransferScreen] ❌ Transaction failed:`, error);
      alert(`Transfer failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  // Styles memoized with theme dependency
  const styles = useMemo(() => StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: theme.colors.background 
    },
    header: { 
      padding: theme.spacing.md, 
      backgroundColor: theme.colors.background 
    },
    titleContainer: { 
      paddingHorizontal: theme.spacing.md, 
      paddingBottom: theme.spacing.lg 
    },
    title: { 
      fontSize: theme.typography.fontSize.xxxl, 
      fontWeight: '600', 
      color: theme.colors.textPrimary, 
      lineHeight: 34 
    },
    card: { 
      backgroundColor: theme.colors.card, 
      marginHorizontal: theme.spacing.md, 
      marginBottom: theme.spacing.sm, 
      borderRadius: theme.borderRadius.lg, 
      padding: theme.spacing.md, 
      ...theme.shadows.small 
    },
    detailRow: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: theme.spacing.md 
    },
    detailLabel: { 
      fontSize: theme.typography.fontSize.md, 
      color: theme.colors.textSecondary 
    },
    detailValue: { 
      fontSize: theme.typography.fontSize.md, 
      color: theme.colors.textPrimary 
    },
    totalValue: { 
      fontSize: theme.typography.fontSize.md, 
      fontWeight: '600', 
      color: theme.colors.textPrimary 
    },
    recipientContainer: { 
      flexDirection: 'row', 
      alignItems: 'center' 
    },
    avatar: { 
      width: 24, 
      height: 24, 
      borderRadius: 12, 
      alignItems: 'center', 
      justifyContent: 'center', 
      marginLeft: theme.spacing.sm 
    },
    avatarText: { 
      color: theme.colors.white, 
      fontSize: theme.typography.fontSize.xs, 
      fontWeight: '600' 
    },
    accountContainer: { 
      flexDirection: 'row', 
      alignItems: 'center' 
    },
    currencyEmoji: { 
      fontSize: 18, 
      marginRight: theme.spacing.sm 
    },
    messageContainer: { 
      flexDirection: 'row', 
      alignItems: 'center' 
    },
    sendButton: { 
      ...theme.commonStyles.primaryButton, 
      marginHorizontal: theme.spacing.md, 
      marginTop: 'auto', 
      marginBottom: theme.spacing.lg, 
      padding: theme.spacing.md 
    },
    sendButtonDisabled: {
      opacity: 0.6,
      backgroundColor: theme.colors.textSecondary,
    },
    sendButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonText: { 
      ...(theme.commonStyles.primaryButtonText as TextStyle),
      fontSize: theme.typography.fontSize.lg,
    } as TextStyle,
  }), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background}/>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Review transfer</Text>
      </View>

      {/* Recipient Details Card */}
      <View style={styles.card}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>To</Text>
          <View style={styles.recipientContainer}>
            <Text style={styles.detailValue}>
              {contactName} • {currencyCode}
            </Text>
            <View style={[styles.avatar, { backgroundColor: contactColor }]}>
              <Text style={styles.avatarText}>{contactInitial}</Text>
            </View>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>From</Text>
          <View style={styles.recipientContainer}>
            <Text style={styles.detailValue}>
              {currencyCode}
              {fromAccountLast4 ? ` •${fromAccountLast4}` : ''}
            </Text>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.avatarText}>
                {(() => {
                  // For business users, use business name initials
                  if (currentUser?.businessName) {
                    const words = currentUser.businessName.split(' ').filter(word => word.length > 0);
                    if (words.length >= 2) {
                      return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
                    }
                    if (words.length === 1) {
                      return words[0].substring(0, 2).toUpperCase();
                    }
                  }

                  // For personal users, use first/last name
                  if (currentUser?.firstName && currentUser?.lastName) {
                    return `${currentUser.firstName[0]}${currentUser.lastName[0]}`.toUpperCase();
                  }
                  if (currentUser?.firstName) {
                    return currentUser.firstName.substring(0, 2).toUpperCase();
                  }
                  return 'ME';
                })()}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.detailRow, { marginBottom: 0 }]}>
          <Text style={styles.detailLabel}>Estimated arrival</Text>
          <Text style={styles.detailValue}>Immediately</Text>
        </View>
      </View>

      {/* Message Card */}
      <View style={styles.card}>
        <View style={[styles.detailRow, { marginBottom: 0 }]}>
          <Text style={styles.detailLabel}>Message</Text>
          {editingMessage ? (
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
              <TextInput
                style={[styles.detailValue, { flex: 1, textAlign: 'right', marginRight: 8 }]}
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Add a message..."
                autoFocus
              />
              <TouchableOpacity onPress={handleSaveMessage}>
                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          ) : (
          <View style={styles.messageContainer}>
              <Text style={styles.detailValue}>{messageText}</Text>
              <TouchableOpacity onPress={handleEditMessage}>
              <Ionicons name="pencil" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          )}
        </View>
      </View>

      {/* Amount Details Card */}
      <View style={styles.card}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{contactName.split(' ')[0]} gets</Text>
          <Text style={styles.detailValue}>
            {currencyCode} {isNaN(amount) ? '0.00' : amount.toFixed(2)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Fees</Text>
          <Text style={styles.detailValue}>
            {feeAmount > 0 ? `${currencyCode} ${feeAmount.toFixed(2)}` : 'No fees'}
          </Text>
        </View>

        <View style={[styles.detailRow, { marginBottom: 0 }]}>
          <Text style={styles.detailLabel}>Your total</Text>
          <Text style={styles.totalValue}>
            {currencyCode} {isNaN(totalAmount) ? '0.00' : totalAmount.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Send Button */}
      <View style={{flex:1}} />
      <TouchableOpacity
        style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
        onPress={handleSend}
        disabled={isSending}
      >
        {isSending ? (
          <View style={styles.sendButtonContent}>
            <ActivityIndicator size="small" color={theme.colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.sendButtonText}>Sending...</Text>
          </View>
        ) : (
          <Text style={styles.sendButtonText}>Send</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default ReviewTransferScreen; 