import 'package:flutter/material.dart';

/// Text Button Atom
/// 
/// Simple text button component following atomic design principles.
/// Used for tertiary actions and links throughout the app.
class AppTextButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isDisabled;
  final Widget? icon;
  final Color? textColor;
  final FontWeight? fontWeight;
  final double? fontSize;
  final EdgeInsetsGeometry? padding;

  const AppTextButton({
    super.key,
    required this.text,
    this.onPressed,
    this.isLoading = false,
    this.isDisabled = false,
    this.icon,
    this.textColor,
    this.fontWeight,
    this.fontSize,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isButtonDisabled = isDisabled || isLoading || onPressed == null;

    return TextButton(
      onPressed: isButtonDisabled ? null : onPressed,
      style: TextButton.styleFrom(
        foregroundColor: textColor ?? theme.colorScheme.primary,
        disabledForegroundColor: theme.colorScheme.onSurface.withOpacity(0.38),
        padding: padding ?? const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(6),
        ),
      ),
      child: isLoading
          ? SizedBox(
              height: 16,
              width: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(
                  textColor ?? theme.colorScheme.primary,
                ),
              ),
            )
          : Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[
                  icon!,
                  const SizedBox(width: 6),
                ],
                Text(
                  text,
                  style: theme.textTheme.labelMedium?.copyWith(
                    fontWeight: fontWeight ?? FontWeight.w500,
                    fontSize: fontSize,
                    color: textColor ?? theme.colorScheme.primary,
                  ),
                ),
              ],
            ),
    );
  }
}