// Updated: Simplified transaction flow - removed complex frontend account matching, backend now handles account resolution/creation automatically - 2025-06-28
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
import API_PATHS from '../../../_api/apiPaths';

type AmountOption = `${string}5` | `${string}10` | `${string}15` | `${string}20` | `${string}50` | 'Other';

interface Account {
  id: string;
  currency_id: string;
  currency_code?: string;
  currency_symbol?: string;
  balance: number;
  account_name: string;
  entity_id: string;
  account_type: { name: string };
  account_number_last4?: string;
  is_recipient?: boolean;
  // Recipient display info
  recipientName?: string;
  recipientEntityId?: string;
  recipientEntityType?: string;
}

interface SendMoneyScreenProps {
  route?: {
    params?: {
      recipientId?: string;
      recipientName?: string;
      recipientInitial?: string;
      recipientColor?: string;
      contactId?: string; // Legacy
      contactName?: string; // Legacy
      contactInitials?: string; // Legacy
      contactAvatarColor?: string; // Legacy
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

  const params = route?.params || {};
  const recipientId = params.recipientId || params.contactId;
  const recipientName = params.recipientName || params.contactName || 'Unknown User';
  const recipientInitial = params.recipientInitial || params.contactInitials || 'U';
  const recipientColor = params.recipientColor || params.contactAvatarColor || theme.colors.secondary;

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


  useEffect(() => {
    const fetchSenderAccounts = async () => {
      if (!currentUser?.profileId) return;
      setIsLoadingSenderAccounts(true);

      try {
        // First get current user's entity ID
        let entityId = currentUser.entityId; // Try using entityId from JWT if available
        
        if (!entityId) {
          // If not available in JWT, fetch it from the entities service
          try {
            const entityResp = await apiClient.get(`/entities/reference/profile/${currentUser.profileId}`);
            entityId = entityResp?.data?.id || currentUser.profileId;
          } catch (err) {
            console.warn('Failed to fetch entity ID for current user', err);
            // Fall back to profile endpoint if entity lookup fails
            const resp = await apiClient.get(`${API_PATHS.ACCOUNT.LIST}?includeDetails=true`);
            const raw = Array.isArray(resp.data) ? resp.data : resp.data?.data || [];
            const mapped: Account[] = (raw as any[]).map((acc) => ({
              id: acc.id,
              currency_id: acc.currency_id,
              currency_code: acc.currencies?.code || acc.currency_id,
              currency_symbol: acc.currencies?.symbol || '',
              balance: parseFloat(acc.balance ?? 0),
              account_name: acc.name || acc.account_name || `${acc.currencies?.code || ''} Account`,
              entity_id: acc.entity_id || acc.profile_id,
              account_type: { name: acc.account_types?.name || '' },
              account_number_last4: acc.account_number_last4 || acc.id.substring(acc.id.length - 4),
            }));
            
            setSenderAccounts(mapped);
            if (mapped.length > 0) setSelectedSenderAccount(mapped[0]);
            return; // Exit the function since we've already set accounts
          }
        }
        
        // Use entity endpoint with the resolved entityId
        const resp = await apiClient.get(`${API_PATHS.ACCOUNT.BY_ENTITY(entityId)}?includeDetails=true`);
        const raw = Array.isArray(resp.data) ? resp.data : resp.data?.data || [];
        const mapped: Account[] = (raw as any[]).map((acc) => ({
          id: acc.id,
          currency_id: acc.currency_id,
          currency_code: acc.currencies?.code || acc.currency_id,
          currency_symbol: acc.currencies?.symbol || '',
          balance: parseFloat(acc.balance ?? 0),
          account_name: acc.name || acc.account_name || `${acc.currencies?.code || ''} Account`,
          entity_id: acc.entity_id || acc.profile_id,
          account_type: { name: acc.account_types?.name || '' },
          account_number_last4: acc.account_number_last4 || acc.id.substring(acc.id.length - 4),
          is_recipient: true, // This is a recipient account - hide balance
        }));

        setSenderAccounts(mapped);
        if (mapped.length > 0) setSelectedSenderAccount(mapped[0]);
      } catch (err) {
        console.warn('Failed to fetch sender accounts', err);
        // Show mock accounts if API fails in development
        if (__DEV__) {
          const mockAccounts: Account[] = [
            { 
              id: 'sender-acc-usd', 
              currency_id: 'USD', 
              currency_code: 'USD',
              currency_symbol: '$',
              balance: 2458.65, 
              account_name: `My Wallet`, 
              entity_id: currentUser.profileId!, 
              account_type: { name: 'Primary' },
              account_number_last4: '1234'
            },
            { 
              id: 'sender-acc-eur', 
              currency_id: 'EUR', 
              currency_code: 'EUR',
              currency_symbol: '€',
              balance: 1500.00, 
              account_name: 'My Savings', 
              entity_id: currentUser.profileId!, 
              account_type: { name: 'Savings' },
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
    fetchSenderAccounts();
  }, [currentUser?.profileId, currentUser?.entityId]);

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
    
    if (!recipientId) {
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

    // Simplified DTO - let backend handle recipient account resolution
    const reviewParams = {
      amount: amountValue,
      recipientName,
      recipientInitial,
      recipientColor,
      message: message || '',
      recipientId, // Just pass the entity ID
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

    messageContainer: { flexDirection: 'row', marginBottom: theme.spacing.lg, gap: theme.spacing.sm },
    messageInputTouchable: { flex: 1, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, flexDirection: 'row', alignItems: 'center', ...theme.shadows.small, minHeight: 52 },
    messageIcon: { marginRight: theme.spacing.sm },
    messageTextInput: { color: theme.colors.inputText, flex: 1, fontSize: theme.typography.fontSize.md },
    attachButton: { width: 52, height: 52, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, alignItems: 'center', justifyContent: 'center', ...theme.shadows.small },
    customAmountContainer: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.lg },
    customAmountLabel: { fontWeight: '500', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
    customAmountInput: { ...theme.commonStyles.input, fontSize: theme.typography.fontSize.lg, fontWeight: '600' },
    sendButton: { ...theme.commonStyles.primaryButton, padding: theme.spacing.md, marginHorizontal: theme.spacing.md, marginBottom: Platform.OS === 'ios' ? theme.spacing.md : theme.spacing.lg, marginTop: 'auto' },
    sendButtonText: { ...(theme.commonStyles.primaryButtonText as any), fontSize: theme.typography.fontSize.lg } as TextStyle,
  }), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background}/>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose}><Ionicons name="close" size={24} color={theme.colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Send money</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={{flex: 1}} contentContainerStyle={{flexGrow:1, padding: theme.spacing.md}}>
        <View style={styles.amountGrid}>
          {selectedSenderAccount && (
            [
              `${selectedSenderAccount.currency_symbol || ''}5`, 
              `${selectedSenderAccount.currency_symbol || ''}10`, 
              `${selectedSenderAccount.currency_symbol || ''}15`, 
              `${selectedSenderAccount.currency_symbol || ''}20`, 
              `${selectedSenderAccount.currency_symbol || ''}50`, 
              'Other'
            ].map((amount, index) => (
              <TouchableOpacity 
                key={amount} 
                style={[styles.amountOption, selectedAmount === amount && styles.selectedAmountOption]} 
                onPress={() => handleAmountSelect(amount as AmountOption)}
              >
                <Text style={[styles.amountText, selectedAmount === amount && styles.selectedAmountText]}>{amount}</Text>
              </TouchableOpacity>
            ))
          )}
          {!selectedSenderAccount && (
            (['$5', '$10', '$15', '$20', '$50', 'Other'] as AmountOption[]).map((amount) => (
            <TouchableOpacity key={amount} style={[styles.amountOption, selectedAmount === amount && styles.selectedAmountOption]} onPress={() => handleAmountSelect(amount)}>
              <Text style={[styles.amountText, selectedAmount === amount && styles.selectedAmountText]}>{amount}</Text>
            </TouchableOpacity>
            ))
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
                  {selectedSenderAccount.account_name.replace(/ Account$/, '')}
                  <Text style={styles.accountId}>•{selectedSenderAccount.account_number_last4}</Text>
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
            {selectedSenderAccount ? (
              <>
                <View style={[styles.avatar, { backgroundColor: recipientColor }]}><Text style={styles.avatarText}>{recipientInitial}</Text></View>
                                  <Text style={styles.accountName} numberOfLines={1} ellipsizeMode="tail">
                    {recipientName}
                    <Text style={styles.accountId}>•{selectedSenderAccount.currency_code}</Text>
                  </Text>
              </>
            ) : (
              <Text style={styles.loadingText}>Select sender account first</Text>
            )}
        </View>
          {selectedSenderAccount && (
            <Text style={styles.accountBalance}>
              {selectedSenderAccount.currency_code}
            </Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.messageContainer}>
          <TouchableOpacity style={styles.messageInputTouchable} onPress={() => { /* Potentially focus TextInput */ }}>
            <Ionicons name="chatbubble-outline" size={20} color={theme.colors.textSecondary} style={styles.messageIcon} />
            <TextInput placeholder="Add message" placeholderTextColor={theme.colors.textTertiary} style={styles.messageTextInput} value={message} onChangeText={setMessage}/>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachButton}><Ionicons name="image-outline" size={20} color={theme.colors.textSecondary} /></TouchableOpacity>
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
          (!selectedSenderAccount || !selectedAmount || (selectedAmount === 'Other' && !parseFloat(customAmount))) && {backgroundColor: theme.colors.grayMedium}
        ]} 
        onPress={handleSend}
        disabled={!selectedSenderAccount || !selectedAmount || (selectedAmount === 'Other' && !parseFloat(customAmount))}
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