import '@testing-library/react-native/extend-expect';

require('react-native-reanimated').setUpTests();

jest.mock('expo-sqlite/kv-store', () => {
  const store = new Map<string, string>();
  const storage = {
    getItem: jest.fn(async (key: string) => store.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => void store.set(key, value)),
    removeItem: jest.fn(async (key: string) => void store.delete(key)),
  };
  return { __esModule: true, default: storage };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

// expo-font's native mock in jest-expo 52 returns the wrong shape for
// getLoadedFonts, which crashes vector-icons on render.
jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  const Icon = ({ name }: { name: string }) => <Text>{name}</Text>;
  return { Ionicons: Icon };
});
