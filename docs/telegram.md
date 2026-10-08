# FC Kindmark Telegram

The integration is deployed but inactive until an administrator configures a bot.

## Activate

1. In Telegram, open the verified BotFather account and create a bot using `/newbot`.
2. Sign into the portal as an administrator. Open **Min profil → Telegram → Aktivera föreningens Telegram-bot**.
3. Enter the token directly in this password field and select **Aktivera bot**. Never put it in chat, source files or browser storage.
4. The server verifies the bot, stores credentials in encrypted Supabase Vault and configures the authenticated webhook. Status changes to **Aktiv**.
5. Each parent, player or coach opens **Min profil → Koppla Telegram → Öppna Telegram och tryck Start**. The private one-use account link expires in ten minutes.
6. Send a new kallelse from the portal. Within the next scheduled delivery minute, linked recipients receive the Swedish message. Test both Kommer and Kommer inte and verify the saved answer in the same event in the portal.

Linking is opt-in and does not send historical messages. Signing out of the portal does not disconnect Telegram. **Koppla bort Telegram** or `/stop` removes the link, pending delivery jobs and reply actions. The optional Telegram username on Spelarprofil is not used as authentication.

## Behavior

- Kallelser use the existing messages and training/match notice mappings. Regular messages link directly to their message view.
- Parents get one response row per called child, players for themselves, and assigned coaches for their own invitation. A parent who is also a coach can respond separately in both roles.
- All answers write to the existing training_attendance, club_match_replies and club_coach_calls RSVP tables. Actual coach attendance remains a separate feature.
- Buttons use opaque IDs and permissions are rechecked when clicked. Removed invitations, revoked team access and events which have started cannot be answered from an old Telegram message.
- Webhook requests require a random server secret. Private chat identity must match the sender. Updates are deduplicated transactionally. No groups or Telegram usernames grant account access.
- A Supabase minute job claims a small batch using locks and leases. Failures retry, Telegram rate-limit delays are honored, permanent errors stop retrying, and delivery can be duplicated if the provider accepts a request but the acknowledgement is lost.
- The bot token, webhook and worker secrets are service-only Vault data. Member-facing status contains only readiness, bot username and their own connection state. Browser actions verify JWT and administrator setup checks trusted app_metadata.club_role.

## Verification

`npm test` covers Telegram payload parsing, single-use token utilities, response buttons, sanitized provider errors and the Edge handler authorization paths with a mocked Telegram provider.

`tests/telegram.sql` verifies real database writes, parent and coach buttons, member credential isolation, single-use linking, private chat collisions, deduplication, changing an answer, cross-account rejection, revoked coach/call permissions, past-event rejection and disconnect cleanup. It rolls back all fixtures and sends no real messages.

Run a real phone test after activation; without an actual bot token, live Telegram delivery cannot be verified.
