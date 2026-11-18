import { Text, type TextProps } from 'react-native';

import { textVariants, useTheme, type TextVariant } from '@/theme';

type Props = TextProps & {
  variant?: TextVariant;
  tone?: 'default' | 'muted' | 'primary' | 'onPrimary' | 'success' | 'warning' | 'danger';
};

export function AppText({ variant = 'body', tone = 'default', style, ...rest }: Props) {
  const { colors } = useTheme();
  const color = {
    default: colors.text,
    muted: colors.textMuted,
    primary: colors.primary,
    onPrimary: colors.onPrimary,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  }[tone];

  return <Text maxFontSizeMultiplier={1.6} style={[textVariants[variant], { color }, style]} {...rest} />;
}
