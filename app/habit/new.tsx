import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { HabitForm } from '@/components/HabitForm';
import { Screen } from '@/components/Screen';
import { useHabits } from '@/store/habits';

export default function NewHabitScreen() {
  const { t } = useTranslation();
  const createHabit = useHabits((s) => s.createHabit);

  return (
    <Screen>
      <HabitForm
        submitLabel={t('common.save')}
        onSubmit={async (input) => {
          await createHabit(input);
          router.back();
        }}
      />
    </Screen>
  );
}
