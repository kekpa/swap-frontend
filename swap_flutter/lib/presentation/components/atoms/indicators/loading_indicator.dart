import 'package:flutter/material.dart';

/// Loading Indicator Atom
/// 
/// Consistent loading indicators following atomic design principles.
/// Provides various loading states and sizes.
class LoadingIndicator extends StatelessWidget {
  final double? size;
  final Color? color;
  final double strokeWidth;
  final String? message;
  final bool showMessage;

  const LoadingIndicator({
    super.key,
    this.size,
    this.color,
    this.strokeWidth = 4.0,
    this.message,
    this.showMessage = false,
  });

  const LoadingIndicator.small({
    super.key,
    this.color,
    this.message,
    this.showMessage = false,
  }) : size = 20,
       strokeWidth = 2.0;

  const LoadingIndicator.medium({
    super.key,
    this.color,
    this.message,
    this.showMessage = false,
  }) : size = 32,
       strokeWidth = 3.0;

  const LoadingIndicator.large({
    super.key,
    this.color,
    this.message,
    this.showMessage = false,
  }) : size = 48,
       strokeWidth = 4.0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final indicatorColor = color ?? theme.colorScheme.primary;

    Widget indicator = SizedBox(
      width: size,
      height: size,
      child: CircularProgressIndicator(
        strokeWidth: strokeWidth,
        valueColor: AlwaysStoppedAnimation<Color>(indicatorColor),
      ),
    );

    if (showMessage && message != null) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          indicator,
          const SizedBox(height: 16),
          Text(
            message!,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      );
    }

    return indicator;
  }
}

/// Fullscreen Loading Overlay
class LoadingOverlay extends StatelessWidget {
  final Widget child;
  final bool isLoading;
  final String? message;
  final Color? backgroundColor;

  const LoadingOverlay({
    super.key,
    required this.child,
    required this.isLoading,
    this.message,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child,
        if (isLoading)
          Container(
            color: backgroundColor ?? Colors.black.withOpacity(0.5),
            child: Center(
              child: LoadingIndicator.large(
                message: message,
                showMessage: message != null,
              ),
            ),
          ),
      ],
    );
  }
}