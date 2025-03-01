import { fireEvent, renderWithTheme, screen } from '@/test-utils';
import { Button } from '../Button';

describe('Button', () => {
  it('calls onPress', () => {
    const onPress = jest.fn();
    renderWithTheme(<Button title="Save" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores presses while disabled', () => {
    const onPress = jest.fn();
    renderWithTheme(<Button title="Save" onPress={onPress} disabled />);

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows a spinner instead of the label when loading', () => {
    renderWithTheme(<Button title="Save" onPress={jest.fn()} loading />);

    expect(screen.queryByText('Save')).toBeNull();
    expect(screen.getByRole('button')).toBeBusy();
  });
});
