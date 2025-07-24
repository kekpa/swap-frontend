import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../components/components.dart';

/// Chat Detail Screen
/// 
/// Individual chat conversation with message history and input.
class ChatDetailScreen extends ConsumerStatefulWidget {
  final String chatId;

  const ChatDetailScreen({
    super.key,
    required this.chatId,
  });

  @override
  ConsumerState<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends ConsumerState<ChatDetailScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final messages = _generateMockMessages();
    
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            CircleAvatar(
              radius: 16,
              backgroundColor: theme.colorScheme.primaryContainer,
              child: Text(
                'A',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Alice Johnson',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    'Online',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: Colors.green,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () {
              // TODO: Send money to this contact
              _showSendMoneySheet(context);
            },
            icon: const Icon(Icons.attach_money),
          ),
          IconButton(
            onPressed: () {
              // TODO: Show chat options
            },
            icon: const Icon(Icons.more_vert),
          ),
        ],
      ),
      body: Column(
        children: [
          // Messages List
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: messages.length,
              itemBuilder: (context, index) {
                final message = messages[index];
                return _buildMessageBubble(context, message);
              },
            ),
          ),
          
          // Message Input
          _buildMessageInput(context),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(BuildContext context, MessageItem message) {
    final theme = Theme.of(context);
    final isMe = message.senderId == 'me';
    
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!isMe) ...[
            CircleAvatar(
              radius: 12,
              backgroundColor: theme.colorScheme.primaryContainer,
              child: Text(
                'A',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.bold,
                  fontSize: 10,
                ),
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: isMe 
                    ? theme.colorScheme.primary
                    : theme.colorScheme.surfaceVariant,
                borderRadius: BorderRadius.circular(16).copyWith(
                  bottomLeft: isMe ? const Radius.circular(16) : const Radius.circular(4),
                  bottomRight: isMe ? const Radius.circular(4) : const Radius.circular(16),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (message.type == MessageType.payment)
                    _buildPaymentContent(context, message, isMe)
                  else
                    Text(
                      message.content,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: isMe 
                            ? theme.colorScheme.onPrimary
                            : theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _formatTime(message.timestamp),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: isMe 
                              ? theme.colorScheme.onPrimary.withOpacity(0.7)
                              : theme.colorScheme.onSurfaceVariant.withOpacity(0.7),
                          fontSize: 10,
                        ),
                      ),
                      if (isMe) ...[
                        const SizedBox(width: 4),
                        Icon(
                          message.isRead ? Icons.done_all : Icons.done,
                          size: 12,
                          color: message.isRead 
                              ? theme.colorScheme.secondary
                              : theme.colorScheme.onPrimary.withOpacity(0.7),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (isMe) ...[
            const SizedBox(width: 8),
            CircleAvatar(
              radius: 12,
              backgroundColor: theme.colorScheme.primary,
              child: Text(
                'M',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onPrimary,
                  fontWeight: FontWeight.bold,
                  fontSize: 10,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPaymentContent(BuildContext context, MessageItem message, bool isMe) {
    final theme = Theme.of(context);
    
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: (isMe ? theme.colorScheme.onPrimary : theme.colorScheme.surface).withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: (isMe ? theme.colorScheme.onPrimary : theme.colorScheme.outline).withOpacity(0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.attach_money,
                size: 20,
                color: isMe ? theme.colorScheme.onPrimary : theme.colorScheme.primary,
              ),
              const SizedBox(width: 8),
              Text(
                isMe ? 'You sent' : 'You received',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: isMe ? theme.colorScheme.onPrimary : theme.colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '\$${message.metadata?['amount'] ?? '0.00'}',
            style: theme.textTheme.titleLarge?.copyWith(
              color: isMe ? theme.colorScheme.onPrimary : theme.colorScheme.primary,
              fontWeight: FontWeight.bold,
            ),
          ),
          if (message.content.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              message.content,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: isMe 
                    ? theme.colorScheme.onPrimary.withOpacity(0.8)
                    : theme.colorScheme.onSurfaceVariant.withOpacity(0.8),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMessageInput(BuildContext context) {
    final theme = Theme.of(context);
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          top: BorderSide(
            color: theme.colorScheme.outline.withOpacity(0.2),
          ),
        ),
      ),
      child: SafeArea(
        child: Row(
          children: [
            IconButton(
              onPressed: () {
                // TODO: Show attachment options
              },
              icon: const Icon(Icons.add),
            ),
            Expanded(
              child: AppTextField(
                controller: _messageController,
                hintText: 'Type a message...',
                maxLines: null,
                textInputAction: TextInputAction.newline,
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              onPressed: _messageController.text.trim().isEmpty ? null : _sendMessage,
              icon: Icon(
                Icons.send,
                color: _messageController.text.trim().isEmpty 
                    ? theme.colorScheme.onSurfaceVariant.withOpacity(0.5)
                    : theme.colorScheme.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _sendMessage() {
    if (_messageController.text.trim().isEmpty) return;
    
    // TODO: Send message through API
    final message = _messageController.text.trim();
    _messageController.clear();
    
    // Scroll to bottom after sending
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
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
              'Send Money to Alice',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            
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

  String _formatTime(DateTime timestamp) {
    return '${timestamp.hour}:${timestamp.minute.toString().padLeft(2, '0')}';
  }

  List<MessageItem> _generateMockMessages() {
    return [
      MessageItem(
        id: 'msg_1',
        content: 'Hey! How was your day?',
        senderId: 'alice',
        timestamp: DateTime.now().subtract(const Duration(hours: 2)),
        type: MessageType.text,
        isRead: true,
      ),
      MessageItem(
        id: 'msg_2',
        content: 'It was great! Thanks for asking. How about yours?',
        senderId: 'me',
        timestamp: DateTime.now().subtract(const Duration(hours: 2, minutes: -5)),
        type: MessageType.text,
        isRead: true,
      ),
      MessageItem(
        id: 'msg_3',
        content: 'Pretty good! By the way, can you send me money for lunch?',
        senderId: 'alice',
        timestamp: DateTime.now().subtract(const Duration(hours: 1, minutes: 30)),
        type: MessageType.text,
        isRead: true,
      ),
      MessageItem(
        id: 'msg_4',
        content: 'For lunch yesterday',
        senderId: 'me',
        timestamp: DateTime.now().subtract(const Duration(minutes: 15)),
        type: MessageType.payment,
        isRead: false,
        metadata: {'amount': '25.50'},
      ),
      MessageItem(
        id: 'msg_5',
        content: 'Thanks for the payment!',
        senderId: 'alice',
        timestamp: DateTime.now().subtract(const Duration(minutes: 10)),
        type: MessageType.text,
        isRead: false,
      ),
    ];
  }
}

class MessageItem {
  final String id;
  final String content;
  final String senderId;
  final DateTime timestamp;
  final MessageType type;
  final bool isRead;
  final Map<String, dynamic>? metadata;

  const MessageItem({
    required this.id,
    required this.content,
    required this.senderId,
    required this.timestamp,
    required this.type,
    required this.isRead,
    this.metadata,
  });
}

enum MessageType { text, payment, image, file }