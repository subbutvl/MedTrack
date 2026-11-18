import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { strings } from '@/i18n/strings';

export default function CheckupsScreen() {
  return (
    <Screen>
      <AppText variant="display">{strings.checkups.title}</AppText>
      <EmptyState icon="calendar-outline" title={strings.checkups.emptyTitle} body={strings.checkups.emptyBody} />
    </Screen>
  );
}
