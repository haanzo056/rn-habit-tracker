import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { Text } from '@/components/Text';
import { useHabits } from '@/store/habits';
import { useSettings, type LanguagePreference, type ThemePreference } from '@/store/settings';
import { useSyncStatus } from '@/store/sync';
import { retryFailedChanges, syncNow } from '@/sync/useSync';
import { radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { theme, language, setTheme, setLanguage } = useSettings();
  const sync = useSyncStatus();
  const habits = useHabits((s) => s.habits);
  const archived = useMemo(() => habits.filter((h) => h.archived), [habits]);

  const lastSynced = sync.lastSyncedAt
    ? t('settings.lastSynced', {
        time: new Date(sync.lastSyncedAt).toLocaleTimeString(i18n.language, {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })
    : t('settings.neverSynced');

  return (
    <Screen>
      <Section title={t('settings.appearance')}>
        <Segmented<ThemePreference>
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'system', label: t('settings.theme_system') },
            { value: 'light', label: t('settings.theme_light') },
            { value: 'dark', label: t('settings.theme_dark') },
          ]}
        />
      </Section>

      <Section title={t('settings.language')}>
        <Segmented<LanguagePreference>
          value={language}
          onChange={setLanguage}
          options={[
            { value: 'system', label: t('settings.language_system') },
            { value: 'en', label: 'English' },
            { value: 'uk', label: 'Українська' },
          ]}
        />
      </Section>

      <Section title={t('settings.sync')}>
        {sync.status === 'disabled' ? (
          <Text muted>{t('settings.syncDisabled')}</Text>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text>{sync.status === 'syncing' ? t('settings.syncing') : lastSynced}</Text>
            {sync.status === 'offline' ? (
              <Text variant="caption" muted>
                {t('settings.offline')}
              </Text>
            ) : null}
            {sync.pending > 0 ? (
              <Text variant="caption" muted>
                {t('settings.pending', { count: sync.pending })}
              </Text>
            ) : null}
            {sync.status === 'error' && sync.lastError ? (
              <Text variant="caption" color={colors.danger}>
                {sync.lastError}
              </Text>
            ) : null}
            {sync.failed > 0 ? (
              <View style={styles.failedRow}>
                <Text variant="caption" color={colors.danger} style={styles.flex}>
                  {t('settings.failed', { count: sync.failed })}
                </Text>
                <Button
                  title={t('settings.retry')}
                  variant="ghost"
                  onPress={() => void retryFailedChanges()}
                />
              </View>
            ) : null}
            <Button
              title={t('settings.syncNow')}
              variant="secondary"
              loading={sync.status === 'syncing'}
              onPress={() => void syncNow()}
            />
          </View>
        )}
      </Section>

      {archived.length > 0 ? (
        <Section title={t('settings.archived')}>
          {archived.map((habit) => (
            <Pressable
              key={habit.id}
              accessibilityRole="button"
              onPress={() => router.push(`/habit/${habit.id}`)}
              style={[styles.archivedRow, { backgroundColor: colors.surface }]}
            >
              <View style={[styles.dot, { backgroundColor: habit.color }]} />
              <Text numberOfLines={1} style={styles.flex}>
                {habit.name}
              </Text>
            </Pressable>
          ))}
        </Section>
      ) : null}

      <Text variant="caption" muted style={styles.version}>
        {t('settings.version', { version: Constants.expoConfig?.version ?? '?' })}
      </Text>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label" muted>
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  card: { padding: spacing.lg, borderRadius: radius.lg, gap: spacing.sm },
  failedRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  archivedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  version: { textAlign: 'center', marginTop: spacing.lg },
});
