import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IconName) {
  function TabIcon({ color, size }: { color: string; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.today'),
          tabBarIcon: tabIcon('checkmark-circle-outline'),
          headerRight: () => (
            <Link href="/habit/new" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('today.add')}
                hitSlop={12}
                style={{ marginRight: 16 }}
              >
                <Ionicons name="add" size={28} color={colors.primary} />
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{ title: t('tabs.stats'), tabBarIcon: tabIcon('stats-chart-outline') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: t('tabs.settings'), tabBarIcon: tabIcon('settings-outline') }}
      />
    </Tabs>
  );
}
