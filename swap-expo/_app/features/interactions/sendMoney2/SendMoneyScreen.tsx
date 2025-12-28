// Updated: Professional ID-centric recipient resolution - 2025-12-16
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  StatusBar,
  Platform,
  ScrollView,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../../theme/ThemeContext';
import { Theme } from '../../../theme/theme';
import { CreateDirectTransactionDto } from '../../../types/transaction.types';
import { useAuthContext } from '../../auth/context/AuthContext';
import AccountSelectionModal from '../../../components/AccountSelectionModal';
import apiClient from '../../../_api/apiClient';
import API_PATHS, { WALLET_PATHS } from '../../../_api/apiPaths';
import { getPresetAmounts, formatPresetAmount } from '../../../constants/currencyConstants';
import { getInitials, getAvatarColor } from '../../../utils/avatarUtils';

// Recipient interface - fetched fresh from API
interface Recipient {
  id: string;
  name: string;
  initial: string;
  color: string;
  type: 'entity' | 'external_account';
}

type AmountOption = string;

interface Account {
  id: string;
  currency_id: string;
  currency_code?: string;
  currency_symbol?: string;
  balance: number;
  account_name: string;
  entity_id: string;
  account_type: { name: string; display_name?: string };
  account_type_display_name?: string;
  account_number_last4?: string;
  is_recipient?: boolean;
  // Recipient display info
  recipientName?: string;
  toEntityId?: string;
  toEntityType?: string;
}

interface SendMoneyScreenProps {
  route?: {
    params?: {
      toEntityId: string; // Entity ID - the only param needed, display data fetched from API
    };
  };
}

const SendMoneyScreen: React.FC<SendMoneyScreenProps> = ({ route }) => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { theme } = useTheme();
  const { user: currentUser } = useAuthContext();

  const [selectedAmount, setSelectedAmount] = useState<AmountOption | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  const [senderAccounts, setSenderAccounts] = useState<Account[]>([]);
  const [selectedSenderAccount, setSelectedSenderAccount] = useState<Account | null>(null);

  const [isLoadingSenderAccounts, setIsLoadingSenderAccounts] = useState(false);
  const [isSenderAccountModalVisible, setIsSenderAccountModalVisible] = useState(false);

  // Recipient state - fetched fresh from API (professional best practice)
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [isLoadingRecipient, setIsLoadingRecipient] = useState(false);

  const toEntityId = route?.params?.toEntityId;
  console.log('[SendMoney] toEntityId from params:', toEntityId, 'full params:', route?.params);

  const senderInitial = useMemo(() => {
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
    if (currentUser?.firstName && currentUser.lastName) {
      return `${currentUser.firstName[0]}${currentUser.lastName[0]}`.toUpperCase();
    }
    if (currentUser?.firstName) {
      return currentUser.firstName.substring(0, 2).toUpperCase();
    }
    return 'Me';
  }, [currentUser]);

  // Fetch recipient data fresh from API (single source of truth)
  useEffect(() => {
    const fetchRecipient = async () => {
      if (!toEntityId) return;

      setIsLoadingRecipient(true);
      try {
        // Fetch entity (internal Swap user/business)
        const resp = await apiClient.get(`/entities/${toEntityId}`);
        const entity = resp.data;

        if (entity?.display_name) {
          setRecipient({
            id: entity.id,
            name: entity.display_name,
            initial: getInitials(entity.display_name),
            color: getAvatarColor(entity.id),
            type: 'entity',
          });
          console.log('[SendMoney] Fetched recipient:', entity.display_name);
        }
      } catch (err) {
        console.error('[SendMoney] Failed to fetch recipient:', err);
        // No fallback - UI shows error state when recipient is null
      } finally {
        setIsLoadingRecipient(false);
      }
    };

    fetchRecipient();
  }, [toEntityId]);

  useEffect(() => {
    const fetchSenderWallets = async () => {
      if (!currentUser?.entityId) return;
      setIsLoadingSenderAccounts(true);

      try {
        const entityId = currentUser.entityId;

        // Use new wallet endpoint to get all wallets for the entity
        const resp = await apiClient.get(WALLET_PATHS.BY_ENTITY(entityId));
        const wallets = Array.isArray(resp.data) ? resp.data : resp.data?.data || resp.data?.result || [];
        console.log('[SendMoney] Fetched wallets:', JSON.stringify(wallets).substring(0, 500));

        // Map wallet response to Account interface
        // API returns flat fields: wallet_id, currency_code, currency_symbol, currency_name, account_type_display_name
        const mapped: Account[] = wallets.map((wallet: any) => {
          const walletId = wallet.wallet_id || wallet.id || '';
          // Use account_type_display_name (e.g. "Main") for better UX, fallback to currency name
          const displayName = wallet.account_type_display_name || wallet.currency_name || wallet.currency?.name || wallet.currency_code || 'Wallet';
          return {
            id: walletId,
            currency_id: wallet.currency_id,
            currency_code: wallet.currency_code || wallet.currency?.code || '',
            currency_symbol: wallet.currency_symbol || wallet.currency?.symbol || '',
            balance: parseFloat(wallet.available_balance ?? wallet.balance ?? 0),
            account_name: displayName,
            entity_id: entityId,
            account_type: { name: wallet.account_type_name || 'Wallet', display_name: wallet.account_type_display_name },
            account_type_display_name: wallet.account_type_display_name,
            account_number_last4: walletId.substring(walletId.length - 4),
          };
        });
        console.log('[SendMoney] Mapped accounts:', mapped.map(m => ({ code: m.currency_code, symbol: m.currency_symbol, balance: m.balance })));

        setSenderAccounts(mapped);
        if (mapped.length > 0) {
          // Select HTG wallet by default if available, otherwise first wallet
          const htgWallet = mapped.find(w => w.currency_code === 'HTG');
          setSelectedSenderAccount(htgWallet || mapped[0]);
        }
      } catch (err) {
        console.warn('Failed to fetch sender wallets', err);
        // Show mock wallets if API fails in development
        if (__DEV__) {
          const mockAccounts: Account[] = [
            {
              id: 'sender-wallet-htg',
              currency_id: 'HTG',
              currency_code: 'HTG',
              currency_symbol: 'G',
              balance: 1000.00,
              account_name: 'Main',
              entity_id: currentUser.entityId!,
              account_type: { name: 'regular', display_name: 'Main' },
              account_type_display_name: 'Main',
              account_number_last4: '1234'
            },
            {
              id: 'sender-wallet-usd',
              currency_id: 'USD',
              currency_code: 'USD',
              currency_symbol: '$',
              balance: 250.00,
              account_name: 'Main',
              entity_id: currentUser.entityId!,
              account_type: { name: 'regular', display_name: 'Main' },
              account_type_display_name: 'Main',
              account_number_last4: '5678'
            }
          ];
          setSenderAccounts(mockAccounts);
          setSelectedSenderAccount(mockAccounts[0]);
        }
      } finally {
        setIsLoadingSenderAccounts(false);
      }
    };
    fetchSenderWallets();
  }, [currentUser?.entityId]);

  const handleClose = () => {
    navigation.goBack();
  };

  const handleAmountSelect = (amount: AmountOption) => {
    setSelectedAmount(amount);
    // Clear custom amount when selecting predefined amount
    if (amount !== 'Other') {
      setCustomAmount('');
    }
  };

  const handleSend = async () => {
    // This shouldn't happen since button is disabled when no amount selected
    if (!selectedAmount) return;

    const amountValue = selectedAmount === 'Other'
      ? parseFloat(customAmount || '0')
      : parseFloat(selectedAmount.replace(/[^0-9.]/g, '')); // Strip any currency symbols or non-numeric chars

    if (!toEntityId || !recipient) {
      alert('Recipient not found.');
      return;
    }
    if (!selectedSenderAccount) {
      alert('Please select an account to send from.');
      return;
    }
    if (amountValue <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    // Use fresh recipient data from API (single source of truth)
    const reviewParams = {
      amount: amountValue,
      recipientName: recipient.name,
      recipientInitial: recipient.initial,
      recipientColor: recipient.color,
      message: message || '',
      toEntityId: recipient.id,
      fromAccount: selectedSenderAccount,
      currency: selectedSenderAccount.currency_id
    };

    navigation.navigate('ReviewTransfer', reviewParams);
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    headerTitle: { fontSize: theme.typography.fontSize.lg, fontWeight: '600', color: theme.colors.textPrimary },
    content: { padding: theme.spacing.md, flex: 1 },
    amountGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
    amountOption: { width: '32%', backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.sm, minHeight: 60 },
    selectedAmountOption: { borderColor: theme.colors.primary, borderWidth: 2 },
    amountText: { fontWeight: 'bold', fontSize: theme.typography.fontSize.xl, color: theme.colors.textPrimary } as TextStyle,
    selectedAmountText: { color: theme.colors.primary },
    
    accountSelectButton: { 
      backgroundColor: theme.colors.card, 
      borderRadius: theme.borderRadius.lg, 
      padding: theme.spacing.md, 
      marginBottom: theme.spacing.sm, 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      ...theme.shadows.small 
    },
    accountRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    accountLabel: { width: 40, fontWeight: '500', color: theme.colors.textSecondary, marginRight: theme.spacing.sm },
    avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.sm },
    avatarText: { color: theme.colors.white, fontWeight: '600', fontSize: theme.typography.fontSize.md },
    accountName: { fontSize: theme.typography.fontSize.md, color: theme.colors.textPrimary, flexShrink: 1, marginRight: theme.spacing.xs },
    accountId: { fontSize: theme.typography.fontSize.sm, color: theme.colors.textTertiary, marginLeft: 4 },
    accountBalance: { fontWeight: '600', color: theme.colors.textPrimary, marginLeft: 'auto' },
    loadingText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontStyle: 'italic'
    },

    messageContainer: { marginBottom: theme.spacing.lg },
    messageInputTouchable: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, flexDirection: 'row', alignItems: 'center', ...theme.shadows.small, minHeight: 52 },
    messageIcon: { marginRight: theme.spacing.sm },
    messageTextInput: { color: theme.colors.inputText, flex: 1, fontSize: theme.typography.fontSize.md },
    customAmountContainer: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.lg },
    customAmountLabel: { fontWeight: '500', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
    customAmountInput: { ...theme.commonStyles.input, fontSize: theme.typography.fontSize.lg, fontWeight: '600' },
    sendButton: { ...theme.commonStyles.primaryButton, padding: theme.spacing.md, marginHorizontal: theme.spacing.md, marginBottom: Platform.OS === 'ios' ? theme.spacing.md : theme.spacing.lg, marginTop: 'auto' },
    sendButtonText: { ...(theme.commonStyles.primaryButtonText as any), fontSize: theme.typography.fontSize.lg } as TextStyle,
  }), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background}/>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose}><Ionicons name="close" size={24} color={theme.colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Send money</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={{flex: 1}} contentContainerStyle={{flexGrow:1, padding: theme.spacing.md}}>
        <View style={styles.amountGrid}>
          {isLoadingSenderAccounts ? (
            // Show loading placeholder while fetching wallets
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <View key={i} style={[styles.amountOption, { backgroundColor: theme.colors.inputBackground }]}>
                  <ActivityIndicator size="small" color={theme.colors.textTertiary} />
                </View>
              ))}
            </>
          ) : (
            (() => {
              // Get currency-specific presets based on selected wallet
              const currencyCode = selectedSenderAccount?.currency_code || 'USD';
              const symbol = selectedSenderAccount?.currency_symbol || '$';
              const presets = getPresetAmounts(currencyCode);

              // Generate amount options with proper formatting
              const amountOptions = [
                ...presets.map(amount => formatPresetAmount(amount, symbol)),
                'Other'
              ];

              return amountOptions.map((displayAmount) => (
                <TouchableOpacity
                  key={displayAmount}
                  style={[styles.amountOption, selectedAmount === displayAmount && styles.selectedAmountOption]}
                  onPress={() => handleAmountSelect(displayAmount)}
                >
                  <Text style={[styles.amountText, selectedAmount === displayAmount && styles.selectedAmountText]}>
                    {displayAmount}
                  </Text>
                </TouchableOpacity>
              ));
            })()
          )}
        </View>

        <TouchableOpacity 
          style={styles.accountSelectButton} 
          onPress={() => setIsSenderAccountModalVisible(true)}
          disabled={isLoadingSenderAccounts}
        >
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>From</Text>
            {isLoadingSenderAccounts ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : selectedSenderAccount ? (
              <>
                <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}><Text style={styles.avatarText}>{senderInitial}</Text></View>
                <Text style={styles.accountName} numberOfLines={1} ellipsizeMode="tail">
                  {selectedSenderAccount.account_name}
                  <Text style={styles.accountId}>•{selectedSenderAccount.currency_code}</Text>
                </Text>
              </>
            ) : (
              <Text style={styles.accountName}>Select Account</Text>
            )}
        </View>
          {selectedSenderAccount && !isLoadingSenderAccounts && (
            <Text style={styles.accountBalance}>
              {selectedSenderAccount.currency_symbol || ''}{selectedSenderAccount.balance.toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.accountSelectButton}
          disabled={!selectedSenderAccount}
        >
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>To</Text>
            {isLoadingRecipient ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : recipient ? (
              <>
                <View style={[styles.avatar, { backgroundColor: recipient.color }]}>
                  <Text style={styles.avatarText}>{recipient.initial}</Text>
                </View>
                <Text style={styles.accountName} numberOfLines={1} ellipsizeMode="tail">
                  {recipient.name}
                  {selectedSenderAccount && (
                    <Text style={styles.accountId}>•{selectedSenderAccount.currency_code}</Text>
                  )}
                </Text>
              </>
            ) : !selectedSenderAccount ? (
              <Text style={styles.loadingText}>Select sender account first</Text>
            ) : (
              <Text style={styles.loadingText}>No recipient selected</Text>
            )}
          </View>
          {selectedSenderAccount && recipient && (
            <Text style={styles.accountBalance}>
              {selectedSenderAccount.currency_code}
            </Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.messageContainer}>
          <TouchableOpacity style={styles.messageInputTouchable} onPress={() => { /* Potentially focus TextInput */ }}>
            <Ionicons name="chatbubble-outline" size={20} color={theme.colors.textSecondary} style={styles.messageIcon} />
            <TextInput placeholder="Add message (optional)" placeholderTextColor={theme.colors.textTertiary} style={styles.messageTextInput} value={message} onChangeText={setMessage}/>
          </TouchableOpacity>
        </View>

        {selectedAmount === 'Other' && (
          <View style={styles.customAmountContainer}>
            <Text style={styles.customAmountLabel}>Enter custom amount:</Text>
            <TextInput 
              style={styles.customAmountInput} 
              keyboardType="decimal-pad" 
              placeholder="0.00" 
              placeholderTextColor={theme.colors.textTertiary} 
              value={customAmount} 
              onChangeText={setCustomAmount} 
              autoFocus
            />
          </View>
        )}
        <View style={{flexGrow: 1}} /> 
      </ScrollView>
      <TouchableOpacity
        style={[
          styles.sendButton,
          (!selectedSenderAccount || !recipient || !selectedAmount || (selectedAmount === 'Other' && !parseFloat(customAmount))) && {backgroundColor: theme.colors.grayMedium}
        ]}
        onPress={handleSend}
        disabled={!selectedSenderAccount || !recipient || !selectedAmount || (selectedAmount === 'Other' && !parseFloat(customAmount))}
      >
        <Text style={styles.sendButtonText}>Send</Text>
      </TouchableOpacity>

      <AccountSelectionModal
        visible={isSenderAccountModalVisible}
        accounts={senderAccounts}
        onSelectAccount={(account) => {
          setSelectedSenderAccount(account as any);
          setIsSenderAccountModalVisible(false);
        }}
        onClose={() => setIsSenderAccountModalVisible(false)}
        title={`Select ${currentUser?.businessName || currentUser?.firstName || 'Your'}'s Account`}
        highlightCurrency={selectedSenderAccount?.currency_id}
      />
    </SafeAreaView>
  );
};

export default SendMoneyScreen; 