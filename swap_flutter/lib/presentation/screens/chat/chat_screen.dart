import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router/app_router.dart';
import '../../components/components.dart';

/// Chat Screen
/// 
/// Lists all chat conversations/interactions.
class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final chats = _generateMockChats();
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Messages'),
        elevation: 0,
        actions: [
          IconButton(
            onPressed: () {
              // TODO: Start new chat
              _showNewChatSheet(context);
            },
            icon: const Icon(Icons.add_comment_outlined),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Bar
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
            child: AppTextField(
              controller: _searchController,
              hintText: 'Search messages...',
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
          ),
          
          // Chat List
          Expanded(
            child: chats.isEmpty
                ? _buildEmptyState(theme)
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: chats.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final chat = chats[index];
                      return _buildChatItem(context, chat);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildChatItem(BuildContext context, ChatItem chat) {
    final theme = Theme.of(context);
    
    return BaseCard(
      onTap: () {
        context.push('/chat/${chat.id}');
      },
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          // Avatar
          Stack(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: theme.colorScheme.primaryContainer,
                backgroundImage: chat.avatarUrl != null 
                    ? NetworkImage(chat.avatarUrl!) 
                    : null,
                child: chat.avatarUrl == null
                    ? Text(
                        chat.name.substring(0, 1).toUpperCase(),
                        style: theme.textTheme.titleMedium?.copyWith(
                          color: theme.colorScheme.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      )
                    : null,
              ),
              if (chat.isOnline)
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: Colors.green,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: theme.colorScheme.surface,
                        width: 2,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 16),
          
          // Chat Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      chat.name,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      _formatTimestamp(chat.lastMessageTime),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    if (chat.lastMessageSenderId == 'me')
                      Icon(
                        Icons.done_all,
                        size: 16,
                        color: chat.isRead ? theme.colorScheme.primary : theme.colorScheme.onSurfaceVariant,
                      ),
                    if (chat.lastMessageSenderId == 'me')
                      const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        chat.lastMessage,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: chat.unreadCount > 0
                              ? theme.colorScheme.onSurface
                              : theme.colorScheme.onSurfaceVariant,
                          fontWeight: chat.unreadCount > 0 ? FontWeight.w500 : FontWeight.normal,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (chat.unreadCount > 0) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          chat.unreadCount > 99 ? '99+' : chat.unreadCount.toString(),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onPrimary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.chat_bubble_outline,
              size: 64,
              color: theme.colorScheme.onSurfaceVariant.withOpacity(0.5),
            ),
            const SizedBox(height: 24),
            Text(
              'No conversations yet',
              style: theme.textTheme.headlineSmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Start a conversation with your contacts',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant.withOpacity(0.8),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            PrimaryButton(
              text: 'Start New Chat',
              onPressed: () => _showNewChatSheet(context),
              width: 200,
            ),
          ],
        ),
      ),
    );
  }

  void _showNewChatSheet(BuildContext context) {
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
              'Start New Chat',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            
            const AppTextField(
              labelText: 'Search contacts',
              hintText: 'Enter name, email or phone number',
              prefixIcon: Icon(Icons.search),
            ),
            const SizedBox(height: 24),
            
            PrimaryButton(
              text: 'Search',
              onPressed: () {
                Navigator.of(context).pop();
                // TODO: Handle contact search
              },
            ),
          ],
        ),
      ),
    );
  }

  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}m';
    } else if (difference.inDays < 1) {
      return '${difference.inHours}h';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d';
    } else {
      return '${timestamp.day}/${timestamp.month}';
    }
  }

  List<ChatItem> _generateMockChats() {
    return [
      ChatItem(
        id: 'chat_1',
        name: 'Alice Johnson',
        lastMessage: 'Thanks for the payment!',
        lastMessageTime: DateTime.now().subtract(const Duration(minutes: 15)),
        lastMessageSenderId: 'alice',
        unreadCount: 2,
        isOnline: true,
        isRead: false,
      ),
      ChatItem(
        id: 'chat_2',
        name: 'Bob Smith',
        lastMessage: 'Can you split the dinner bill?',
        lastMessageTime: DateTime.now().subtract(const Duration(hours: 2)),
        lastMessageSenderId: 'bob',
        unreadCount: 1,
        isOnline: false,
        isRead: false,
      ),
      ChatItem(
        id: 'chat_3',
        name: 'Team Lunch Group',
        lastMessage: 'You: Perfect! See you at 12:30',
        lastMessageTime: DateTime.now().subtract(const Duration(hours: 4)),
        lastMessageSenderId: 'me',
        unreadCount: 0,
        isOnline: false,
        isRead: true,
      ),
    ];
  }
}

class ChatItem {
  final String id;
  final String name;
  final String lastMessage;
  final DateTime lastMessageTime;
  final String lastMessageSenderId;
  final int unreadCount;
  final bool isOnline;
  final bool isRead;
  final String? avatarUrl;

  const ChatItem({
    required this.id,
    required this.name,
    required this.lastMessage,
    required this.lastMessageTime,
    required this.lastMessageSenderId,
    required this.unreadCount,
    required this.isOnline,
    required this.isRead,
    this.avatarUrl,
  });
}