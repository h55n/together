const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

export function normalizeInviteCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isInviteCode(value: string): boolean {
  return INVITE_PATTERN.test(normalizeInviteCode(value));
}

export function createInviteCode(random = Math.random): string {
  let value = '';
  for (let i = 0; i < 6; i += 1) {
    value += ALPHABET[Math.floor(random() * ALPHABET.length) % ALPHABET.length];
  }
  return value;
}
