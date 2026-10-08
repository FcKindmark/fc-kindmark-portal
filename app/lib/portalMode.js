export function portalModeKey(userId) {
  return `kindmark:portal:v1:${userId}`;
}
export function validPortalMode(value) {
  return value === "coach" || value === "parent" ? value : null;
}
