import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  FlatList,
  Modal,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/theme';

interface Transaction {
  id: string;
  merchant: string;
  amount: string;
  date: string;
  dateGroup: string;
  icon: string;
  iconBgColor: string;
  isPositive?: boolean;
}

interface HashTag {
  id: string;
  name: string;
  isSelected: boolean;
}

interface TransactionSearchScreenProps {
  onBack: () => void;
  onSettings: () => void;
  onTransactionPress: (transactionId: string) => void;
}

const TransactionSearchScreen: React.FC<TransactionSearchScreenProps> = ({
  onBack,
  onSettings,
  onTransactionPress,
}) => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Transaction[]>([]);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [dateFrom, setDateFrom] = useState('07/06/2023');
  const [dateTo, setDateTo] = useState('07/06/2023');
  const [transactionType, setTransactionType] = useState('both');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [activeDateField, setActiveDateField] = useState<'from' | 'to'>('from');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [hashTags, setHashTags] = useState<HashTag[]>([
    { id: '1', name: 'weekend', isSelected: false },
    { id: '2', name: 'groceries', isSelected: false },
    { id: '3', name: 'department_store', isSelected: false },
    { id: '4', name: 'black', isSelected: false },
    { id: '5', name: 'first', isSelected: false },
    { id: '6', name: 'fitness', isSelected: false },
  ]);
  const [noResults, setNoResults] = useState(false);
  
  const searchInputRef = useRef<TextInput>(null);
  
  // Mock transaction data with theme-based colors
  const allTransactions: Transaction[] = useMemo(() => [
    {
      id: '1',
      merchant: 'Fitness First',
      amount: '-49,80 €',
      date: 'Yesterday',
      dateGroup: 'YESTERDAY',
      icon: 'fitness',
      iconBgColor: theme.colors.error,
    },
    {
      id: '2',
      merchant: 'TransferWise',
      amount: '50,00 €',
      date: 'Yesterday',
      dateGroup: 'YESTERDAY',
      icon: 'swap-horizontal',
      iconBgColor: theme.colors.background,
      isPositive: true,
    },
    {
      id: '3',
      merchant: 'Fitness First',
      amount: '-127,80 €',
      date: 'Tuesday 23 May',
      dateGroup: 'TUESDAY 23 MAY',
      icon: 'fitness',
      iconBgColor: theme.colors.error,
    },
    {
      id: '4',
      merchant: 'TransferWise',
      amount: '130,00 €',
      date: 'Tuesday 23 May',
      dateGroup: 'TUESDAY 23 MAY',
      icon: 'swap-horizontal',
      iconBgColor: theme.colors.background,
      isPositive: true,
    },
    {
      id: '5',
      merchant: 'Dia',
      amount: '-2,86 €',
      date: 'Sunday 16 April',
      dateGroup: 'SUNDAY 16 APRIL',
      icon: 'basket',
      iconBgColor: theme.colors.error,
    },
  ], [theme]);
  
  useEffect(() => {
    // Simulate search results based on query and filters
    if (searchQuery.trim() === '') {
      setSearchResults(allTransactions);
      setNoResults(false);
      return;
    }
    
    const filteredResults = allTransactions.filter(transaction => 
      transaction.merchant.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (filteredResults.length === 0) {
      setNoResults(true);
    } else {
      setNoResults(false);
    }
    
    setSearchResults(filteredResults);
    
    // Generate suggestions
    if (searchQuery.trim() !== '') {
      const suggestionList = ['Dia', 'Día', 'Días'];
      setSuggestions(suggestionList.filter(s => 
        s.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, hashTags, allTransactions]);
  
  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };
  
  const handleTagPress = (tagId: string) => {
    setHashTags(prevTags => 
      prevTags.map(tag => 
        tag.id === tagId ? { ...tag, isSelected: !tag.isSelected } : tag
      )
    );
  };
  
  const handleApplyFilter = () => {
    // Apply filters to search results
    setIsFilterModalVisible(false);
  };
  
  const handleResetFilter = () => {
    setDateFrom('07/06/2023');
    setDateTo('07/06/2023');
    setTransactionType('both');
  };
  
  const handleSuggestionPress = (suggestion: string) => {
    setSearchQuery(suggestion);
    Keyboard.dismiss();
  };
  
  const renderTransactionIcon = (transaction: Transaction) => {
    return (
      <View style={[styles.transactionIcon, { backgroundColor: transaction.iconBgColor }]}>
        <Ionicons 
          name={transaction.icon as any} 
          size={24} 
          color={transaction.iconBgColor === theme.colors.background ? theme.colors.textSecondary : theme.colors.white} 
        />
      </View>
    );
  };
  
  const renderDateHeader = (dateGroup: string) => {
    return (
      <Text style={styles.dateHeader}>{dateGroup}</Text>
    );
  };
  
  const renderTransaction = ({ item }: { item: Transaction }) => {
    return (
      <TouchableOpacity
        style={styles.transactionItem}
        onPress={() => onTransactionPress(item.id)}
      >
        {renderTransactionIcon(item)}
        
        <View style={styles.transactionDetails}>
          <Text style={styles.merchantName}>{item.merchant}</Text>
        </View>
        
        <Text style={[
          styles.transactionAmount,
          item.isPositive && styles.positiveAmount
        ]}>
          {item.amount}
        </Text>
      </TouchableOpacity>
    );
  };
  
  const renderNoResults = () => {
    return (
      <View style={styles.noResultsContainer}>
        <Ionicons name="search" size={48} color="#ccc" />
        <Text style={styles.noResultsTitle}>No results found</Text>
        <Text style={styles.noResultsMessage}>
          We couldn't find transactions related to your search.
          Try typing another search term.
        </Text>
      </View>
    );
  };
  
  const renderSuggestions = () => {
    if (suggestions.length === 0) return null;
    
    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>SUGGESTIONS</Text>
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestionItem}
            onPress={() => handleSuggestionPress(suggestion)}
          >
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </TouchableOpacity>
        ))}
        
        <View style={styles.keyboardSuggestions}>
          <TouchableOpacity style={styles.keyboardSuggestion}>
            <Text style={styles.keyboardSuggestionText}>«Dia»</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keyboardSuggestion}>
            <Text style={styles.keyboardSuggestionText}>Día</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keyboardSuggestion}>
            <Text style={styles.keyboardSuggestionText}>Días</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  const renderSearchResults = () => {
    if (noResults) {
      return renderNoResults();
    }
    
    if (searchQuery && suggestions.length > 0) {
      return renderSuggestions();
    }
    
    const selectedTags = hashTags.filter(tag => tag.isSelected);
    
    return (
      <View style={styles.resultsContainer}>
        {selectedTags.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.selectedTagsContainer}
          >
            {selectedTags.map(tag => (
              <View key={tag.id} style={styles.selectedTag}>
                <Text style={styles.selectedTagText}>#{tag.name}</Text>
              </View>
            ))}
          </ScrollView>
        )}
        
        <Text style={styles.resultsTitle}>Search results</Text>
        
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {searchResults.length} Transactions
          </Text>
          <Text style={styles.resultsDateRange}>
            {searchResults.length > 0 ? '4/04/23 - 6/6/23' : '6/6/23 - 6/6/23'}
          </Text>
          <Text style={styles.resultsTotalAmount}>
            {searchResults.length > 0 ? '€4.07' : '-€49,80'}
          </Text>
        </View>
        
        <FlatList
          data={searchResults}
          renderItem={renderTransaction}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.transactionsList}
          ListHeaderComponent={() => searchResults.length > 0 ? renderDateHeader(searchResults[0].dateGroup) : null}
        />
      </View>
    );
  };
  
  const renderFilterModal = () => {
    return (
      <Modal
        visible={isFilterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsFilterModalVisible(false)}
              >
                <Ionicons name="chevron-down" size={24} color="#000" />
              </TouchableOpacity>
              
              <Text style={styles.modalTitle}>Filter</Text>
              
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleResetFilter}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.filterSectionTitle}>Date range</Text>
              
              <View style={styles.dateRangeContainer}>
                <TouchableOpacity 
                  style={styles.dateInput}
                  onPress={() => {
                    setActiveDateField('from');
                    setIsDatePickerVisible(true);
                  }}
                >
                  <Text style={styles.dateInputLabel}>From</Text>
                  <View style={styles.dateInputValue}>
                    <Text style={styles.dateText}>{dateFrom}</Text>
                    <Ionicons name="chevron-down" size={16} color="#666" />
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.dateInput}
                  onPress={() => {
                    setActiveDateField('to');
                    setIsDatePickerVisible(true);
                  }}
                >
                  <Text style={styles.dateInputLabel}>To</Text>
                  <View style={styles.dateInputValue}>
                    <Text style={styles.dateText}>{dateTo}</Text>
                    <Ionicons name="chevron-down" size={16} color="#666" />
                  </View>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.filterSectionTitle}>Transaction type</Text>
              
              <View style={styles.transactionTypeContainer}>
                <TouchableOpacity 
                  style={styles.transactionTypeOption}
                  onPress={() => setTransactionType('both')}
                >
                  <Text style={styles.transactionTypeText}>Both incoming & outgoing</Text>
                  <View style={[
                    styles.radioButton,
                    transactionType === 'both' && styles.radioButtonSelected
                  ]}>
                    {transactionType === 'both' && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.transactionTypeOption}
                  onPress={() => setTransactionType('incoming')}
                >
                  <Text style={styles.transactionTypeText}>Incoming only</Text>
                  <View style={[
                    styles.radioButton,
                    transactionType === 'incoming' && styles.radioButtonSelected
                  ]}>
                    {transactionType === 'incoming' && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.transactionTypeOption}
                  onPress={() => setTransactionType('outgoing')}
                >
                  <Text style={styles.transactionTypeText}>Outgoing only</Text>
                  <View style={[
                    styles.radioButton,
                    transactionType === 'outgoing' && styles.radioButtonSelected
                  ]}>
                    {transactionType === 'outgoing' && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApplyFilter}
              >
                <Text style={styles.applyButtonText}>See results</Text>
              </TouchableOpacity>
              
              {isDatePickerVisible && (
                <View style={styles.datePickerContainer}>
                  <View style={styles.datePickerHeader}>
                    <Text style={styles.datePickerTitle}>Month</Text>
                    <Text style={styles.datePickerTitle}>Year</Text>
                  </View>
                  
                  <View style={styles.datePickerContent}>
                    <View style={styles.monthColumn}>
                      <Text style={[styles.monthOption, styles.monthOptionInactive]}>5</Text>
                      <Text style={[styles.monthOption, styles.monthOptionInactive]}>6</Text>
                      <Text style={[styles.monthOption, styles.monthOptionActive]}>7</Text>
                      <Text style={[styles.monthOption, styles.monthOptionInactive]}>8</Text>
                      <Text style={[styles.monthOption, styles.monthOptionInactive]}>9</Text>
                    </View>
                    
                    <View style={styles.monthColumn}>
                      <Text style={[styles.monthOption, styles.monthOptionInactive]}>April</Text>
                      <Text style={[styles.monthOption, styles.monthOptionInactive]}>May</Text>
                      <Text style={[styles.monthOption, styles.monthOptionActive]}>June</Text>
                      <Text style={[styles.monthOption, styles.monthOptionInactive]}>July</Text>
                      <Text style={[styles.monthOption, styles.monthOptionInactive]}>August</Text>
                    </View>
                    
                    <View style={styles.yearColumn}>
                      <Text style={[styles.yearOption, styles.yearOptionInactive]}>2021</Text>
                      <Text style={[styles.yearOption, styles.yearOptionInactive]}>2022</Text>
                      <Text style={[styles.yearOption, styles.yearOptionActive]}>2023</Text>
                      <Text style={[styles.yearOption, styles.yearOptionInactive]}>2024</Text>
                      <Text style={[styles.yearOption, styles.yearOptionInactive]}>2025</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => setIsDatePickerVisible(false)}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };
  
  // Styles memoized with theme dependency
  const styles = useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
      backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      marginHorizontal: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 40,
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textPrimary,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
  },
  tagButton: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.inputBackground,
      marginRight: theme.spacing.sm,
  },
  tagButtonSelected: {
      backgroundColor: theme.colors.inputBorder,
  },
  tagText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
  },
  tagTextSelected: {
      color: theme.colors.textPrimary,
  },
  resultsContainer: {
    flex: 1,
  },
  selectedTagsContainer: {
    flexDirection: 'row',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
  },
  selectedTag: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.inputBackground,
      marginRight: theme.spacing.sm,
  },
  selectedTagText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
  },
  resultsTitle: {
      fontSize: theme.typography.fontSize.md,
    fontWeight: 'bold',
      color: theme.colors.textPrimary,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xs,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
  },
  resultsCount: {
      fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
      color: theme.colors.textPrimary,
  },
  resultsDateRange: {
    flex: 1,
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  resultsTotalAmount: {
      fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
      color: theme.colors.textPrimary,
  },
  transactionsList: {
      paddingBottom: theme.spacing.md,
  },
  dateHeader: {
      fontSize: theme.typography.fontSize.xs,
    fontWeight: '500',
      color: theme.colors.textSecondary,
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
      marginRight: theme.spacing.sm,
  },
  transactionDetails: {
    flex: 1,
  },
  merchantName: {
      fontSize: theme.typography.fontSize.md,
    fontWeight: '500',
      color: theme.colors.textPrimary,
  },
  transactionAmount: {
      fontSize: theme.typography.fontSize.md,
    fontWeight: '500',
      color: theme.colors.textPrimary,
  },
  positiveAmount: {
      color: theme.colors.success,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
  },
  noResultsTitle: {
      fontSize: theme.typography.fontSize.lg,
    fontWeight: 'bold',
      color: theme.colors.textPrimary,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
  },
  noResultsMessage: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  suggestionsContainer: {
    flex: 1,
      paddingTop: theme.spacing.md,
  },
  suggestionsTitle: {
      fontSize: theme.typography.fontSize.xs,
    fontWeight: '500',
      color: theme.colors.textSecondary,
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
  },
  suggestionItem: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
  },
  suggestionText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textPrimary,
  },
  keyboardSuggestions: {
    flexDirection: 'row',
    borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    marginTop: 'auto',
  },
  keyboardSuggestion: {
    flex: 1,
      paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRightWidth: 1,
      borderRightColor: theme.colors.border,
  },
  keyboardSuggestionText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.borderRadius.lg,
      borderTopRightRadius: theme.borderRadius.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    flex: 1,
      fontSize: theme.typography.fontSize.lg,
    fontWeight: 'bold',
      color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  resetButton: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
  },
  resetButtonText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
  },
  modalBody: {
      padding: theme.spacing.md,
  },
  filterSectionTitle: {
      fontSize: theme.typography.fontSize.md,
    fontWeight: 'bold',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
  },
  dateRangeContainer: {
    flexDirection: 'row',
      marginBottom: theme.spacing.xl,
  },
  dateInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  dateInputLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
  },
  dateInputValue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
  },
  dateText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
  },
  transactionTypeContainer: {
      marginBottom: theme.spacing.xl,
  },
  transactionTypeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
  },
  transactionTypeText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textPrimary,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
      borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
      borderColor: theme.colors.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
      backgroundColor: theme.colors.primary,
  },
  modalFooter: {
      padding: theme.spacing.md,
    borderTopWidth: 1,
      borderTopColor: theme.colors.border,
  },
  applyButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  applyButtonText: {
      fontSize: theme.typography.fontSize.md,
    fontWeight: '500',
      color: theme.colors.white,
  },
  datePickerContainer: {
      backgroundColor: theme.colors.inputBackground,
    borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingVertical: theme.spacing.md,
  },
  datePickerHeader: {
    flexDirection: 'row',
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
  },
  datePickerTitle: {
    flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  datePickerContent: {
    flexDirection: 'row',
      paddingHorizontal: theme.spacing.md,
  },
  monthColumn: {
    flex: 1,
    alignItems: 'center',
  },
  yearColumn: {
    flex: 1,
    alignItems: 'center',
  },
  monthOption: {
      fontSize: theme.typography.fontSize.md,
      paddingVertical: theme.spacing.sm,
    width: '100%',
    textAlign: 'center',
  },
  monthOptionActive: {
      color: theme.colors.textPrimary,
    fontWeight: 'bold',
  },
  monthOptionInactive: {
      color: theme.colors.textTertiary,
  },
  yearOption: {
      fontSize: theme.typography.fontSize.md,
      paddingVertical: theme.spacing.sm,
    width: '100%',
    textAlign: 'center',
  },
  yearOptionActive: {
      color: theme.colors.textPrimary,
    fontWeight: 'bold',
  },
  yearOptionInactive: {
      color: theme.colors.textTertiary,
  },
  doneButton: {
    alignSelf: 'flex-end',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      marginTop: theme.spacing.md,
  },
  doneButtonText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.primary,
    fontWeight: '500',
  },
  }), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBack}
        >
          <Ionicons name="chevron-down" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.searchContainer}>
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search in Main Account"
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearSearch}
            >
              <Ionicons name="close-circle" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setIsFilterModalVisible(true)}
        >
          <Ionicons name="options" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>
      
      {!searchQuery && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tagsContainer}
        >
          {hashTags.map(tag => (
            <TouchableOpacity
              key={tag.id}
              style={[
                styles.tagButton,
                tag.isSelected && styles.tagButtonSelected
              ]}
              onPress={() => handleTagPress(tag.id)}
            >
              <Text style={[
                styles.tagText,
                tag.isSelected && styles.tagTextSelected
              ]}>
                #{tag.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      
      {renderSearchResults()}
      {renderFilterModal()}
    </SafeAreaView>
  );
};

export default TransactionSearchScreen;