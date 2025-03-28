// Not a UUID and not meant to be unguessable. Time prefix keeps ids roughly sortable,
// the random part makes collisions between devices practically impossible.
export function createId(): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10).padEnd(8, '0');
  return `${time}${random}`;
}
