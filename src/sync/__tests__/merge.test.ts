import { shouldApplyRemote } from '../merge';

const at = (updatedAt: string) => ({ updatedAt, deletedAt: null });

describe('shouldApplyRemote', () => {
  it('applies when there is no local copy', () => {
    expect(shouldApplyRemote(null, at('2024-06-01T10:00:00.000Z'))).toBe(true);
  });

  it('applies a newer remote', () => {
    expect(shouldApplyRemote(at('2024-06-01T10:00:00.000Z'), at('2024-06-01T10:00:00.001Z'))).toBe(
      true,
    );
  });

  it('keeps a newer local', () => {
    expect(shouldApplyRemote(at('2024-06-01T10:05:00.000Z'), at('2024-06-01T10:00:00.000Z'))).toBe(
      false,
    );
  });

  it('lets the server win ties', () => {
    expect(shouldApplyRemote(at('2024-06-01T10:00:00.000Z'), at('2024-06-01T10:00:00.000Z'))).toBe(
      true,
    );
  });

  it('compares instants, not strings', () => {
    // Same instant as 10:00Z, but lexically "greater"
    const local = at('2024-06-01T10:30:00.000Z');
    const remote = at('2024-06-01T13:00:00+03:00');
    expect(shouldApplyRemote(local, remote)).toBe(false);
  });

  it('treats tombstones like any other write', () => {
    const local = at('2024-06-01T10:00:00.000Z');
    const remote = { updatedAt: '2024-06-01T11:00:00.000Z', deletedAt: '2024-06-01T11:00:00.000Z' };
    expect(shouldApplyRemote(local, remote)).toBe(true);
  });
});
