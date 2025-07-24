import 'package:flutter/material.dart';
import '../../atoms/buttons/text_button.dart';

/// App Header Organism
/// 
/// Complex header component with user info, notifications, and actions.
/// Adapts to different screen sizes and states.
class AppHeader extends StatelessWidget implements PreferredSizeWidget {
  final String? userName;
  final String? userEmail;
  final String? avatarUrl;
  final bool showNotifications;
  final int notificationCount;
  final bool showSettings;
  final VoidCallback? onAvatarTap;
  final VoidCallback? onNotificationTap;
  final VoidCallback? onSettingsTap;
  final List<Widget>? actions;
  final Widget? title;
  final bool showBackButton;
  final VoidCallback? onBackPressed;

  const AppHeader({
    super.key,
    this.userName,
    this.userEmail,
    this.avatarUrl,
    this.showNotifications = true,
    this.notificationCount = 0,
    this.showSettings = true,
    this.onAvatarTap,
    this.onNotificationTap,
    this.onSettingsTap,
    this.actions,
    this.title,
    this.showBackButton = false,
    this.onBackPressed,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mediaQuery = MediaQuery.of(context);
    final isCompact = mediaQuery.size.width < 400;

    return AppBar(
      elevation: 0,
      scrolledUnderElevation: 1,
      backgroundColor: theme.colorScheme.surface,
      surfaceTintColor: theme.colorScheme.surfaceTint,
      leading: showBackButton
          ? IconButton(
              onPressed: onBackPressed ?? () => Navigator.of(context).pop(),
              icon: const Icon(Icons.arrow_back),
            )
          : null,
      title: title ?? _buildUserInfo(context, isCompact),
      centerTitle: title != null,
      actions: actions ?? _buildDefaultActions(context),
    );
  }

  Widget _buildUserInfo(BuildContext context, bool isCompact) {
    final theme = Theme.of(context);

    if (userName == null && userEmail == null) {
      return Text(
        'Swap',
        style: theme.textTheme.titleLarge?.copyWith(
          fontWeight: FontWeight.bold,
          color: theme.colorScheme.primary,
        ),
      );
    }

    return Row(
      children: [
        GestureDetector(
          onTap: onAvatarTap,
          child: CircleAvatar(
            radius: 20,
            backgroundColor: theme.colorScheme.primaryContainer,
            backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl!) : null,
            child: avatarUrl == null
                ? Icon(
                    Icons.person,
                    color: theme.colorScheme.primary,
                    size: 24,
                  )
                : null,
          ),
        ),
        if (!isCompact) ...[
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (userName != null)
                  Text(
                    'Hello, $userName',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                if (userEmail != null && userName != null)
                  Text(
                    userEmail!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                if (userEmail != null && userName == null)
                  Text(
                    userEmail!,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),
        ] else ...[
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              userName ?? userEmail ?? 'User',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ],
    );
  }

  List<Widget> _buildDefaultActions(BuildContext context) {
    final theme = Theme.of(context);
    final actions = <Widget>[];

    if (showNotifications) {
      actions.add(
        Stack(
          children: [
            IconButton(
              onPressed: onNotificationTap,
              icon: const Icon(Icons.notifications_outlined),
            ),
            if (notificationCount > 0)
              Positioned(
                right: 8,
                top: 8,
                child: Container(
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.error,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  constraints: const BoxConstraints(
                    minWidth: 16,
                    minHeight: 16,
                  ),
                  child: Text(
                    notificationCount > 99 ? '99+' : notificationCount.toString(),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onError,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
          ],
        ),
      );
    }

    if (showSettings) {
      actions.add(
        IconButton(
          onPressed: onSettingsTap,
          icon: const Icon(Icons.more_vert),
        ),
      );
    }

    return actions;
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}