import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { drugSearchUrl } from '@/domain/search';
import type { DoseStatus, TimelineItem } from '@/domain/timeline';
import { formatMinute } from '@/domain/timeline';
import { strings } from '@/i18n/strings';
import { radius, spacing, useTheme, type ColorTokens } from '@/theme';
import { AppText } from './AppText';

export type DoseDetails = { form?: string | null; doctor?: string | null; when?: string };

type Props = {
  item: TimelineItem;
  details: DoseDetails;
  /** The soonest dose still to take today, shown larger with its actions up front. */
  nextUp?: boolean;
  onTaken: () => void;
  onSkip: () => void;
  onSnooze: () => void;
  onSnoozeFor: (minutes: number) => void;
  onUndo: () => void;
};

const QUICK_SNOOZE = 15;

const FORM_ICON: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  tablet: 'pill',
  capsule: 'pill',
  syrup: 'flask-outline',
  injection: 'needle',
  drops: 'eye-outline',
};

function statusStyle(s: DoseStatus, c: ColorTokens) {
  switch (s) {
    case 'taken':
      return { fg: c.success, bg: c.successSoft, icon: 'checkmark' as const };
    case 'skipped':
      return { fg: c.warning, bg: c.warningSoft, icon: 'remove' as const };
    case 'missed':
    case 'overdue':
      return { fg: c.danger, bg: c.dangerSoft, icon: 'alert' as const };
    case 'due':
      return { fg: c.accent, bg: c.accentSoft, icon: 'alarm-outline' as const };
    case 'snoozed':
      return { fg: c.accent, bg: c.accentSoft, icon: 'moon-outline' as const };
    default:
      return { fg: c.textMuted, bg: c.surfaceAlt, icon: 'time-outline' as const };
  }
}

const lookUp = async (name: string) => {
  await Clipboard.setStringAsync(name);
  await WebBrowser.openBrowserAsync(drugSearchUrl(name));
};

export function DoseCard({ item, details, nextUp, onTaken, onSkip, onSnooze, onSnoozeFor, onUndo }: Props) {
  const { colors } = useTheme();
  const done = item.status === 'taken' || item.status === 'skipped';
  const st = statusStyle(item.status, colors);
  const searchName = item.strength ? `${item.name} ${item.strength}` : item.name;
  const formLabel = details.form ? (strings.medication.forms as Record<string, string>)[details.form] ?? details.form : null;
  const icon = FORM_ICON[details.form ?? ''] ?? 'pill';
  const time = formatMinute(item.minute);
  const dose = `${strings.today.doseCount(item.amount)} (${time})`;
  const subtitle = [details.when, dose].filter(Boolean).join('  •  ');

  const Title = (
    <View style={styles.titleRow}>
      <AppText variant="heading" numberOfLines={2} style={styles.shrink}>
        {item.name}
      </AppText>
      {item.strength ? (
        <View style={[styles.chip, { backgroundColor: nextUp ? colors.surfaceAlt : colors.accentSoft }]}>
          <AppText variant="caption" style={{ color: nextUp ? colors.text : colors.accent, fontWeight: '600' }}>
            {item.strength}
          </AppText>
        </View>
      ) : null}
      {formLabel && !nextUp ? (
        <AppText variant="caption" tone="muted">
          {formLabel}
        </AppText>
      ) : null}
    </View>
  );

  if (nextUp && !done) {
    return (
      <View style={[styles.card, styles.nextCard, { backgroundColor: colors.surface, borderColor: colors.accent }]}>
        <View style={[styles.nextTag, { backgroundColor: colors.accent }]}>
          <AppText variant="caption" style={styles.nextTagText}>
            {strings.today.nextUp.toUpperCase()}
          </AppText>
        </View>
        <View style={styles.row}>
          <View style={[styles.iconBox, styles.iconBoxLarge, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft }]}>
            <MaterialCommunityIcons name={icon} size={28} color={colors.accent} />
          </View>
          <View style={styles.flex}>
            {Title}
            <AppText tone="muted">{[formLabel, strings.today.doseCount(item.amount), details.when].filter(Boolean).join(' • ')}</AppText>
          </View>
        </View>
        <View style={styles.metaRow}>
          <View style={[styles.meta, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="time-outline" size={16} color={colors.textMuted} />
            <View>
              <AppText variant="bodyStrong">{time}</AppText>
              <AppText variant="caption" tone={item.status === 'overdue' ? 'danger' : 'muted'}>
                {item.status === 'pending' ? (item.minute >= 18 * 60 ? strings.today.tonight : strings.today.status.pending) : strings.today.status[item.status]}
              </AppText>
            </View>
          </View>
          {details.doctor ? (
            <View style={[styles.meta, styles.shrink, { backgroundColor: colors.successSoft }]}>
              <AppText variant="caption" tone="success" numberOfLines={2} style={styles.shrink}>
                {details.doctor}
              </AppText>
            </View>
          ) : null}
        </View>
        <View style={styles.nextActions}>
          <Pressable
            accessibilityRole="button"
            onPress={onTaken}
            style={({ pressed }) => [styles.takeButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Ionicons name="checkmark" size={20} color={colors.onPrimary} />
            <AppText variant="bodyStrong" tone="onPrimary">
              {strings.today.takeDose}
            </AppText>
          </Pressable>
          <SquareButton label={strings.today.snoozeForLabel(QUICK_SNOOZE)} onPress={() => onSnoozeFor(QUICK_SNOOZE)} onLongPress={onSnooze} wide>
            <Ionicons name="time-outline" size={18} color={colors.text} />
            <AppText variant="bodyStrong">{strings.today.snoozeFor(QUICK_SNOOZE)}</AppText>
          </SquareButton>
          <SquareButton label={strings.today.skip} onPress={onSkip}>
            <Ionicons name="close" size={20} color={colors.text} />
          </SquareButton>
          <SquareButton label={strings.medication.copyAndSearch(searchName)} onPress={() => void lookUp(searchName)}>
            <Ionicons name="search" size={20} color={colors.text} />
          </SquareButton>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: item.status === 'due' ? colors.accent : colors.border }]}>
      <View style={styles.row}>
        <View style={[styles.iconBox, { borderColor: colors.border }]}>
          <MaterialCommunityIcons name={icon} size={22} color={colors.text} />
        </View>
        <View style={styles.flex}>
          {Title}
          <AppText variant="caption" tone="muted">
            {subtitle}
          </AppText>
          {details.doctor ? (
            <AppText variant="caption" tone="muted" style={styles.faint} numberOfLines={1}>
              {strings.today.prescribedBy(details.doctor)}
            </AppText>
          ) : null}
        </View>
        <View style={[styles.pill, { backgroundColor: st.bg, borderColor: st.fg }]}>
          <Ionicons name={st.icon} size={14} color={st.fg} />
          <AppText variant="caption" style={[styles.pillText, { color: st.fg }]}>
            {strings.today.status[item.status].toUpperCase()}
          </AppText>
        </View>
      </View>
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <FooterLink icon="search" label={strings.medication.lookUp} onPress={() => void lookUp(searchName)} />
        <View style={styles.flex} />
        {done ? (
          <FooterLink icon="arrow-undo-outline" label={strings.today.undo} onPress={onUndo} />
        ) : (
          <>
            <FooterLink icon="close" label={strings.today.skip} onPress={onSkip} />
            <FooterLink icon="alarm-outline" label={strings.today.snooze} onPress={onSnooze} />
            <FooterLink icon="checkmark" label={strings.today.taken} onPress={onTaken} strong />
          </>
        )}
      </View>
    </View>
  );
}

function FooterLink({ icon, label, onPress, strong }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; strong?: boolean }) {
  const { colors } = useTheme();
  const color = strong ? colors.accent : colors.textMuted;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name={icon} size={16} color={color} />
      <AppText variant="caption" style={{ color, fontWeight: strong ? '600' : '400' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

function SquareButton({
  label,
  onPress,
  onLongPress,
  wide,
  children,
}: {
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.square,
        wide && styles.squareWide,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg + 4, padding: spacing.lg, gap: spacing.md },
  nextCard: { borderWidth: 1.5, overflow: 'hidden', paddingTop: spacing.xl },
  nextTag: { position: 'absolute', top: 0, right: 0, paddingHorizontal: spacing.md, paddingVertical: 3, borderBottomLeftRadius: radius.md },
  nextTagText: { color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.6, fontSize: 11 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginBottom: 2 },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  iconBox: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  iconBoxLarge: { width: 56, height: 56, borderRadius: radius.lg },
  faint: { opacity: 0.8, marginTop: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1 },
  pillText: { fontWeight: '700', letterSpacing: 0.4, fontSize: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, borderTopWidth: 1, paddingTop: spacing.md },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 28 },
  metaRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  nextActions: { flexDirection: 'row', gap: spacing.sm },
  takeButton: { flex: 1, minHeight: 52, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  square: { width: 52, minHeight: 52, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  squareWide: { width: undefined, paddingHorizontal: spacing.md, flexDirection: 'row', gap: 4 },
});
