import 'package:flutter/material.dart';
import '../../atoms/cards/base_card.dart';

/// Transaction Card Molecule
/// 
/// Displays transaction information in a card format.
/// Combines base card with transaction-specific content.
class TransactionCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final String amount;
  final String currency;
  final DateTime timestamp;
  final TransactionType type;
  final TransactionStatus status;
  final VoidCallback? onTap;
  final Widget? leading;

  const TransactionCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.currency,
    required this.timestamp,
    required this.type,
    required this.status,
    this.onTap,
    this.leading,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    Color amountColor;
    IconData statusIcon;
    
    switch (type) {
      case TransactionType.incoming:
        amountColor = Colors.green;
        break;
      case TransactionType.outgoing:
        amountColor = theme.colorScheme.error;
        break;
      case TransactionType.pending:
        amountColor = theme.colorScheme.onSurfaceVariant;
        break;
    }

    switch (status) {
      case TransactionStatus.completed:
        statusIcon = Icons.check_circle;
        break;
      case TransactionStatus.pending:
        statusIcon = Icons.access_time;
        break;
      case TransactionStatus.failed:
        statusIcon = Icons.error;
        break;
    }

    return BaseCard(
      onTap: onTap,
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          // Leading widget or default transaction icon
          leading ?? Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              _getTransactionIcon(type),
              color: theme.colorScheme.primary,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          // Transaction details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  _formatTimestamp(timestamp),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant.withOpacity(0.8),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          // Amount and status
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${type == TransactionType.incoming ? '+' : '-'}$currency $amount',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: amountColor,
                ),
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    statusIcon,
                    size: 16,
                    color: _getStatusColor(status, theme),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    status.name.toUpperCase(),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: _getStatusColor(status, theme),
                      fontWeight: FontWeight.w500,
                      fontSize: 10,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  IconData _getTransactionIcon(TransactionType type) {
    switch (type) {
      case TransactionType.incoming:
        return Icons.arrow_downward;
      case TransactionType.outgoing:
        return Icons.arrow_upward;
      case TransactionType.pending:
        return Icons.schedule;
    }
  }

  Color _getStatusColor(TransactionStatus status, ThemeData theme) {
    switch (status) {
      case TransactionStatus.completed:
        return Colors.green;
      case TransactionStatus.pending:
        return theme.colorScheme.primary;
      case TransactionStatus.failed:
        return theme.colorScheme.error;
    }
  }

  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inDays < 1) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${timestamp.day}/${timestamp.month}/${timestamp.year}';
    }
  }
}

enum TransactionType { incoming, outgoing, pending }
enum TransactionStatus { completed, pending, failed }