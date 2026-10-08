// Token refresh and tab refocus update the user, but do not reload the profile.
export function sessionIdentity(user) {
  return `${user?.id || ''}:${user?.app_metadata?.club_role || ''}`;
}
