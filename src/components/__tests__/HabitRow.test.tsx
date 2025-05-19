import { fireEvent, renderWithTheme, screen } from '@/test-utils';
import type { Habit } from '@/types/habit';
import { HabitRow } from '../HabitRow';

const habit: Habit = {
  id: 'h1',
  name: 'Stretch',
  color: '#37B24D',
  schedule: { type: 'daily' },
  reminderTime: null,
  archived: false,
  createdAt: '2024-06-01T08:00:00.000Z',
  updatedAt: '2024-06-01T08:00:00.000Z',
  deletedAt: null,
};

function setup(completedDays: string[]) {
  const onToggle = jest.fn();
  const onPress = jest.fn();
  renderWithTheme(
    <HabitRow
      habit={habit}
      completedDays={completedDays}
      today="2024-06-20"
      onToggle={onToggle}
      onPress={onPress}
    />,
  );
  return { onToggle, onPress };
}

describe('HabitRow', () => {
  it('shows the name and current streak', () => {
    setup(['2024-06-18', '2024-06-19', '2024-06-20']);

    expect(screen.getByText('Stretch')).toBeOnTheScreen();
    expect(screen.getByText('3 days')).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: 'Stretch' })).toBeChecked();
  });

  it('uses singular for a one day streak', () => {
    setup(['2024-06-19']);

    expect(screen.getByText('1 day')).toBeOnTheScreen();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('toggles without opening the habit', () => {
    const { onToggle, onPress } = setup([]);

    fireEvent.press(screen.getByRole('checkbox'));

    expect(onToggle).toHaveBeenCalledWith('h1');
    expect(onPress).not.toHaveBeenCalled();
  });

  it('opens the habit when the row is pressed', () => {
    const { onPress } = setup([]);

    fireEvent.press(screen.getByText('Stretch'));

    expect(onPress).toHaveBeenCalledWith('h1');
  });
});
