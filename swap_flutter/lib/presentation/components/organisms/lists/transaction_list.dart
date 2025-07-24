import 'package:flutter/material.dart';
import '../../molecules/cards/transaction_card.dart';
import '../../atoms/indicators/loading_indicator.dart';

/// Transaction List Organism
/// 
/// Complex component that manages a list of transactions.
/// Handles loading states, empty states, and infinite scrolling.
class TransactionList extends StatefulWidget {
  final List<TransactionItem> transactions;
  final bool isLoading;
  final bool hasMore;
  final VoidCallback? onLoadMore;
  final void Function(TransactionItem transaction)? onTransactionTap;
  final String? emptyMessage;
  final Widget? emptyWidget;

  const TransactionList({
    super.key,
    required this.transactions,
    this.isLoading = false,
    this.hasMore = false,
    this.onLoadMore,
    this.onTransactionTap,
    this.emptyMessage,
    this.emptyWidget,
  });

  @override
  State<TransactionList> createState() => _TransactionListState();
}

class _TransactionListState extends State<TransactionList> {
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= 
        _scrollController.position.maxScrollExtent * 0.8) {
      if (widget.hasMore && !widget.isLoading && widget.onLoadMore != null) {
        widget.onLoadMore!();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // Show loading indicator for initial load
    if (widget.isLoading && widget.transactions.isEmpty) {
      return const Center(
        child: LoadingIndicator.large(
          message: 'Loading transactions...',
          showMessage: true,
        ),
      );
    }

    // Show empty state
    if (widget.transactions.isEmpty) {
      return _buildEmptyState(theme);
    }

    return RefreshIndicator(
      onRefresh: () async {
        // Trigger refresh if callback provided
        widget.onLoadMore?.call();
      },
      child: ListView.separated(
        controller: _scrollController,
        padding: const EdgeInsets.all(16),
        itemCount: widget.transactions.length + (widget.hasMore ? 1 : 0),
        separatorBuilder: (context, index) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          // Show loading indicator at the end if loading more
          if (index == widget.transactions.length) {
            return const Padding(
              padding: EdgeInsets.all(16),
              child: Center(
                child: LoadingIndicator.medium(),
              ),
            );
          }

          final transaction = widget.transactions[index];
          return TransactionCard(
            title: transaction.title,
            subtitle: transaction.subtitle,
            amount: transaction.amount,
            currency: transaction.currency,
            timestamp: transaction.timestamp,
            type: transaction.type,
            status: transaction.status,
            onTap: () => widget.onTransactionTap?.call(transaction),
          );
        },
      ),
    );
  }

  Widget _buildEmptyState(ThemeData theme) {
    if (widget.emptyWidget != null) {
      return widget.emptyWidget!;
    }

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.receipt_long_outlined,
              size: 64,
              color: theme.colorScheme.onSurfaceVariant.withOpacity(0.5),
            ),
            const SizedBox(height: 24),
            Text(
              widget.emptyMessage ?? 'No transactions yet',
              style: theme.textTheme.headlineSmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Your transaction history will appear here',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant.withOpacity(0.8),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

/// Data class for transaction items
class TransactionItem {
  final String id;
  final String title;
  final String subtitle;
  final String amount;
  final String currency;
  final DateTime timestamp;
  final TransactionType type;
  final TransactionStatus status;
  final Map<String, dynamic>? metadata;

  const TransactionItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.currency,
    required this.timestamp,
    required this.type,
    required this.status,
    this.metadata,
  });
}