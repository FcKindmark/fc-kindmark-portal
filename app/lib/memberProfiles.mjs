export const PLAYER_ACCOUNT_LAST_BIRTH_YEAR = 2012;
export function canHavePlayerAccount(player) {
  const year = Number(player?.birth_year);
  return Number.isInteger(year) && year >= 1900 && year <= PLAYER_ACCOUNT_LAST_BIRTH_YEAR;
}
export function memberProfileKind(card) {
  if (card?.player_id) return 'player';
  return card?.membership_type === 'supporter' ? 'supporter' : 'member';
}
export function memberMatchesProfileFilter(card, filter) {
  const kind = memberProfileKind(card);
  return filter === 'all' ? kind !== 'supporter' : kind === filter;
}
export function ownPlayerAccounts(accounts, player) {
  const guardians = new Set([player?.mother_email, player?.father_email].filter(Boolean).map(email => email.trim().toLowerCase()));
  return (accounts || []).filter(account => !['admin', 'coach'].includes(account.role) && !guardians.has(account.email?.trim().toLowerCase()));
}
