import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/providers/app_providers.dart';
import '../../../app/router/app_router.dart';
import '../../components/components.dart';

/// Dashboard Screen
/// 
/// Main home screen showing user balance, recent transactions, and quick actions.
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppHeader(
        userName: 'John Doe',
        userEmail: 'john.doe@example.com',
        onNotificationTap: () {
          // TODO: Handle notifications
        },
        onSettingsTap: () {
          context.push(AppRoutes.settings);
        },
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          // TODO: Refresh dashboard data
        },
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Balance Card
              _buildBalanceCard(context, theme),
              const SizedBox(height: 24),
              
              // Quick Actions
              _buildQuickActions(context, theme),
              const SizedBox(height: 24),
              
              // Recent Transactions Section
              _buildRecentTransactionsSection(context, theme),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBalanceCard(BuildContext context, ThemeData theme) {
    return BaseCard(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Total Balance',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '\$12,345.67',
            style: theme.textTheme.headlineLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: theme.colorScheme.primary,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildBalanceItem(
                context,
                'Available',
                '\$10,234.56',
                Colors.green,
              ),
              const SizedBox(width: 24),
              _buildBalanceItem(
                context,
                'Pending',
                '\$2,111.11',
                theme.colorScheme.primary,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBalanceItem(BuildContext context, String label, String amount, Color color) {
    final theme = Theme.of(context);
    
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            amount,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context, ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Actions',
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildActionCard(
                context,
                'Send Money',
                Icons.send,
                () {
                  // TODO: Navigate to send money
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionCard(
                context,
                'Request Money',
                Icons.request_quote,
                () {
                  // TODO: Navigate to request money
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionCard(
                context,
                'Pay Bills',
                Icons.receipt,
                () {
                  // TODO: Navigate to pay bills
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionCard(
                context,
                'More',
                Icons.more_horiz,
                () {
                  // TODO: Show more actions
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActionCard(BuildContext context, String title, IconData icon, VoidCallback onTap) {
    final theme = Theme.of(context);
    
    return BaseCard(
      onTap: onTap,
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              color: theme.colorScheme.primary,
              size: 24,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            title,
            style: theme.textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildRecentTransactionsSection(BuildContext context, ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Recent Transactions',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            AppTextButton(
              text: 'View All',
              onPressed: () {
                context.go(AppRoutes.transactions);
              },
            ),
          ],
        ),
        const SizedBox(height: 16),
        // Mock recent transactions
        ...List.generate(3, (index) {
          return Padding(
            padding: EdgeInsets.only(bottom: index < 2 ? 12 : 0),
            child: TransactionCard(
              title: ['Coffee Shop', 'Salary Payment', 'Grocery Store'][index],
              subtitle: ['Purchase', 'Income', 'Purchase'][index],
              amount: ['15.99', '3,500.00', '67.45'][index],
              currency: 'USD',
              timestamp: DateTime.now().subtract(Duration(hours: index + 1)),
              type: [TransactionType.outgoing, TransactionType.incoming, TransactionType.outgoing][index],
              status: TransactionStatus.completed,
              onTap: () {
                // TODO: Navigate to transaction detail
              },
            ),
          );
        }),
      ],
    );
  }
}