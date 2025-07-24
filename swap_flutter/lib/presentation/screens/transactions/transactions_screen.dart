import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../components/components.dart';

/// Transactions Screen
/// 
/// Full list of user transactions with filtering and search capabilities.
class TransactionsScreen extends ConsumerStatefulWidget {
  const TransactionsScreen({super.key});

  @override
  ConsumerState<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends ConsumerState<TransactionsScreen> {
  final _searchController = TextEditingController();
  String _selectedFilter = 'All';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    // Mock transaction data
    final transactions = _generateMockTransactions();
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Transactions'),
        elevation: 0,
      ),
      body: Column(
        children: [
          // Search and Filter Section
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              border: Border(
                bottom: BorderSide(
                  color: theme.colorScheme.outline.withOpacity(0.2),
                ),
              ),
            ),
            child: Column(
              children: [
                // Search Bar
                AppTextField(
                  controller: _searchController,
                  hintText: 'Search transactions...',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _searchController.clear();
                            setState(() {});
                          },
                        )
                      : null,
                  onChanged: (value) => setState(() {}),
                ),
                const SizedBox(height: 16),
                
                // Filter Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      'All',
                      'Incoming',
                      'Outgoing',
                      'Pending',
                      'This Week',
                      'This Month',
                    ].map((filter) {
                      final isSelected = _selectedFilter == filter;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          label: Text(filter),
                          selected: isSelected,
                          onSelected: (selected) {
                            setState(() {
                              _selectedFilter = filter;
                            });
                          },
                          backgroundColor: theme.colorScheme.surface,
                          selectedColor: theme.colorScheme.primaryContainer,
                          labelStyle: TextStyle(
                            color: isSelected
                                ? theme.colorScheme.primary
                                : theme.colorScheme.onSurfaceVariant,
                            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
          
          // Transactions List
          Expanded(
            child: TransactionList(
              transactions: transactions,
              onTransactionTap: (transaction) {
                // TODO: Navigate to transaction detail
                _showTransactionDetail(context, transaction);
              },
              emptyMessage: 'No transactions found',
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          // TODO: Navigate to send money
          _showSendMoneySheet(context);
        },
        icon: const Icon(Icons.send),
        label: const Text('Send Money'),
      ),
    );
  }

  List<TransactionItem> _generateMockTransactions() {
    final mockData = [
      {
        'title': 'Coffee Shop',
        'subtitle': 'Starbucks Downtown',
        'amount': '15.99',
        'type': TransactionType.outgoing,
        'status': TransactionStatus.completed,
        'hoursAgo': 2,
      },
      {
        'title': 'Salary Payment',
        'subtitle': 'Monthly Salary',
        'amount': '3500.00',
        'type': TransactionType.incoming,
        'status': TransactionStatus.completed,
        'hoursAgo': 8,
      },
      {
        'title': 'Grocery Store',
        'subtitle': 'Whole Foods Market',
        'amount': '67.45',
        'type': TransactionType.outgoing,
        'status': TransactionStatus.completed,
        'hoursAgo': 12,
      },
      {
        'title': 'Transfer to John',
        'subtitle': 'Split dinner bill',
        'amount': '25.50',
        'type': TransactionType.outgoing,
        'status': TransactionStatus.pending,
        'hoursAgo': 24,
      },
      {
        'title': 'Freelance Payment',
        'subtitle': 'Design Project',
        'amount': '850.00',
        'type': TransactionType.incoming,
        'status': TransactionStatus.completed,
        'hoursAgo': 48,
      },
      {
        'title': 'Netflix Subscription',
        'subtitle': 'Monthly Subscription',
        'amount': '15.99',
        'type': TransactionType.outgoing,
        'status': TransactionStatus.completed,
        'hoursAgo': 72,
      },
      {
        'title': 'Refund',
        'subtitle': 'Return - Amazon',
        'amount': '42.99',
        'type': TransactionType.incoming,
        'status': TransactionStatus.completed,
        'hoursAgo': 96,
      },
    ];

    return mockData.asMap().entries.map((entry) {
      final index = entry.key;
      final data = entry.value;
      
      return TransactionItem(
        id: 'txn_${index + 1}',
        title: data['title'] as String,
        subtitle: data['subtitle'] as String,
        amount: data['amount'] as String,
        currency: 'USD',
        timestamp: DateTime.now().subtract(Duration(hours: data['hoursAgo'] as int)),
        type: data['type'] as TransactionType,
        status: data['status'] as TransactionStatus,
      );
    }).toList();
  }

  void _showTransactionDetail(BuildContext context, TransactionItem transaction) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.5,
        builder: (context, scrollController) => Container(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle bar
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.outline,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              
              // Transaction details
              Text(
                'Transaction Details',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 24),
              
              TransactionCard(
                title: transaction.title,
                subtitle: transaction.subtitle,
                amount: transaction.amount,
                currency: transaction.currency,
                timestamp: transaction.timestamp,
                type: transaction.type,
                status: transaction.status,
              ),
              
              const SizedBox(height: 24),
              
              // Additional details
              _buildDetailRow('Transaction ID', transaction.id),
              _buildDetailRow('Date', _formatDate(transaction.timestamp)),
              _buildDetailRow('Status', transaction.status.name.toUpperCase()),
              _buildDetailRow('Type', transaction.type.name.toUpperCase()),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    final theme = Theme.of(context);
    
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }

  void _showSendMoneySheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Container(
        padding: EdgeInsets.only(
          left: 24,
          right: 24,
          top: 24,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Send Money',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            
            const AppTextField(
              labelText: 'Recipient',
              hintText: 'Enter email or phone number',
              prefixIcon: Icon(Icons.person_outline),
            ),
            const SizedBox(height: 16),
            
            const AppTextField(
              labelText: 'Amount',
              hintText: '0.00',
              keyboardType: TextInputType.number,
              prefixIcon: Icon(Icons.attach_money),
            ),
            const SizedBox(height: 16),
            
            const AppTextField(
              labelText: 'Note (Optional)',
              hintText: 'What\'s this for?',
              prefixIcon: Icon(Icons.note_outlined),
            ),
            const SizedBox(height: 24),
            
            PrimaryButton(
              text: 'Send Money',
              onPressed: () {
                Navigator.of(context).pop();
                // TODO: Handle send money
              },
            ),
          ],
        ),
      ),
    );
  }
}