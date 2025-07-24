import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers/app_providers.dart';
import '../../components/components.dart';

/// Settings Screen
/// 
/// App settings and preferences management.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDarkMode = ref.watch(themeModeProvider);
    final selectedTheme = ref.watch(selectedThemeProvider);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Appearance Section
            _buildSectionHeader(context, 'Appearance'),
            const SizedBox(height: 16),
            _buildThemeSelector(context, ref, selectedTheme),
            const SizedBox(height: 12),
            _buildDarkModeToggle(context, ref, isDarkMode),
            const SizedBox(height: 32),
            
            // Notifications Section
            _buildSectionHeader(context, 'Notifications'),
            const SizedBox(height: 16),
            _buildNotificationSettings(context, ref),
            const SizedBox(height: 32),
            
            // Security Section
            _buildSectionHeader(context, 'Security'),
            const SizedBox(height: 16),
            _buildSecuritySettings(context, ref),
            const SizedBox(height: 32),
            
            // About Section
            _buildSectionHeader(context, 'About'),
            const SizedBox(height: 16),
            _buildAboutSection(context),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, String title) {
    final theme = Theme.of(context);
    return Text(
      title,
      style: theme.textTheme.titleLarge?.copyWith(
        fontWeight: FontWeight.bold,
      ),
    );
  }

  Widget _buildThemeSelector(BuildContext context, WidgetRef ref, String selectedTheme) {
    final theme = Theme.of(context);
    const themes = [
      {'name': 'violet', 'label': 'Violet', 'color': Color(0xFF8B14FD)},
      {'name': 'oceanBlue', 'label': 'Ocean Blue', 'color': Color(0xFF0077B6)},
      {'name': 'green', 'label': 'Green', 'color': Color(0xFF059669)},
      {'name': 'amber', 'label': 'Amber', 'color': Color(0xFFF59E0B)},
    ];

    return BaseCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Theme Color',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: themes.map((themeData) {
              final isSelected = selectedTheme == themeData['name'];
              return GestureDetector(
                onTap: () {
                  ref.read(selectedThemeProvider.notifier).state = themeData['name'] as String;
                },
                child: Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: themeData['color'] as Color,
                    borderRadius: BorderRadius.circular(12),
                    border: isSelected
                        ? Border.all(
                            color: theme.colorScheme.primary,
                            width: 3,
                          )
                        : null,
                    boxShadow: isSelected
                        ? [
                            BoxShadow(
                              color: (themeData['color'] as Color).withOpacity(0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ]
                        : null,
                  ),
                  child: isSelected
                      ? Icon(
                          Icons.check,
                          color: Colors.white,
                          size: 24,
                        )
                      : null,
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildDarkModeToggle(BuildContext context, WidgetRef ref, bool isDarkMode) {
    return BaseCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Icon(
            isDarkMode ? Icons.dark_mode : Icons.light_mode,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Dark Mode',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isDarkMode ? 'Dark theme enabled' : 'Light theme enabled',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: isDarkMode,
            onChanged: (value) {
              ref.read(themeModeProvider.notifier).state = value;
            },
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationSettings(BuildContext context, WidgetRef ref) {
    return Column(
      children: [
        _buildSettingsTile(
          context,
          icon: Icons.notifications_outlined,
          title: 'Push Notifications',
          subtitle: 'Receive notifications on your device',
          trailing: Switch(
            value: true,
            onChanged: (value) {
              // TODO: Handle notification toggle
            },
          ),
        ),
        const SizedBox(height: 12),
        _buildSettingsTile(
          context,
          icon: Icons.email_outlined,
          title: 'Email Notifications',
          subtitle: 'Receive notifications via email',
          trailing: Switch(
            value: true,
            onChanged: (value) {
              // TODO: Handle email notification toggle
            },
          ),
        ),
        const SizedBox(height: 12),
        _buildSettingsTile(
          context,
          icon: Icons.sms_outlined,
          title: 'SMS Notifications',
          subtitle: 'Receive notifications via SMS',
          trailing: Switch(
            value: false,
            onChanged: (value) {
              // TODO: Handle SMS notification toggle
            },
          ),
        ),
      ],
    );
  }

  Widget _buildSecuritySettings(BuildContext context, WidgetRef ref) {
    return Column(
      children: [
        _buildSettingsTile(
          context,
          icon: Icons.fingerprint,
          title: 'Biometric Authentication',
          subtitle: 'Use fingerprint or face recognition',
          trailing: Switch(
            value: true,
            onChanged: (value) {
              // TODO: Handle biometric toggle
            },
          ),
        ),
        const SizedBox(height: 12),
        _buildSettingsTile(
          context,
          icon: Icons.security,
          title: 'Two-Factor Authentication',
          subtitle: 'Add an extra layer of security',
          trailing: const Icon(Icons.chevron_right),
          onTap: () {
            // TODO: Navigate to 2FA settings
          },
        ),
        const SizedBox(height: 12),
        _buildSettingsTile(
          context,
          icon: Icons.lock_outline,
          title: 'Change Password',
          subtitle: 'Update your account password',
          trailing: const Icon(Icons.chevron_right),
          onTap: () {
            // TODO: Navigate to change password
          },
        ),
      ],
    );
  }

  Widget _buildAboutSection(BuildContext context) {
    return Column(
      children: [
        _buildSettingsTile(
          context,
          icon: Icons.info_outline,
          title: 'Version',
          subtitle: '1.0.0 (Build 1)',
          trailing: null,
        ),
        const SizedBox(height: 12),
        _buildSettingsTile(
          context,
          icon: Icons.description_outlined,
          title: 'Terms of Service',
          subtitle: 'Read our terms and conditions',
          trailing: const Icon(Icons.chevron_right),
          onTap: () {
            // TODO: Show terms of service
          },
        ),
        const SizedBox(height: 12),
        _buildSettingsTile(
          context,
          icon: Icons.privacy_tip_outlined,
          title: 'Privacy Policy',
          subtitle: 'Learn how we protect your data',
          trailing: const Icon(Icons.chevron_right),
          onTap: () {
            // TODO: Show privacy policy
          },
        ),
      ],
    );
  }

  Widget _buildSettingsTile(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    Widget? trailing,
    VoidCallback? onTap,
  }) {
    final theme = Theme.of(context);
    
    return BaseCard(
      onTap: onTap,
      padding: const EdgeInsets.all(16),
      child: Row(
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
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          if (trailing != null) ...[
            const SizedBox(width: 16),
            trailing,
          ],
        ],
      ),
    );
  }
}