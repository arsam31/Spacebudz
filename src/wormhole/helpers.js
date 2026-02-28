// Re-export concat from lucid-cardano internal module
// The wormhole contract doesn't actually use concat at runtime for migration/burn,
// but we provide it here in case it's needed by other contract methods.
export function concat(...buf) {
  let length = 0;
  for (const b of buf) length += b.length;
  const result = new Uint8Array(length);
  let offset = 0;
  for (const b of buf) {
    result.set(b, offset);
    offset += b.length;
  }
  return result;
}
