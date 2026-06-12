/** Basic magic-byte checks before persisting user uploads. */

export function isLikelyMp4(buffer: Buffer) {
  if (buffer.byteLength < 12) return false;
  const box = buffer.subarray(4, 8).toString("ascii");
  return box === "ftyp";
}

export function isLikelyWebm(buffer: Buffer) {
  if (buffer.byteLength < 4) return false;
  return (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  );
}

export function isLikelyMov(buffer: Buffer) {
  return isLikelyMp4(buffer);
}

export function validateReviewVideoBuffer(buffer: Buffer) {
  return isLikelyMp4(buffer) || isLikelyWebm(buffer) || isLikelyMov(buffer);
}
