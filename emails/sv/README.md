# FC Kindmark – svenska e-postmallar

Projekt: `rujzfmrkqvjolkbrpiwp`. Avsändare: FC Kindmark <portal@fckindmark.se>.

## Aktivering i Supabase

Authentication → Email Templates. Kopiera ämnet från respektive `.subject.txt` och hela HTML-filen till motsvarande mall. Spara varje mall. Filer i GitHub ändrar inte automatiskt inställningarna i det hostade Supabase-projektet.

| Supabase-mall | Fil |
|---|---|
| Reset password | recovery.html |
| Confirm sign up | confirmation.html |
| Invite user | invite.html |
| Magic link | magic_link.html |
| Change email address | email_change.html |
| Reauthentication | reauthentication.html |

`auth-templates.json` är ett färdigt PATCH-underlag för Management API:s `/v1/projects/rujzfmrkqvjolkbrpiwp/config/auth`. Det innehåller endast mallar och ämnesrader. Använd en behörig Management API-session; inga hemligheter ska läggas i GitHub.

Behåll `{{ .ConfirmationURL }}` och `{{ .Token }}` exakt. Bekräftelselänken hanteras av Supabase och ska inte ersättas med portalens vanliga adress. Ändra inte SMTP-inställningarna när mallarna installeras.

## Godkänt medlemskap

`welcome-member.html` är en separat välkomstmall som bara ska skickas efter att klubben faktiskt godkänt medlemskapet. Den är inte en Supabase Auth-mall och skickas ännu inte automatiskt genom detta mallpaket. Konto/inbjudan och godkänt medlemskap är olika händelser. Koppla till godkännandehändelsen med serverbaserad utskickstjänst och unik leveransnyckel för att undvika dubbla utskick. Skicka aldrig lösenord via mejl.

## Verifiering

Prova återställning för ett befintligt konto och registrering för ett testkonto. Kontrollera svenska ämnesrader, utseende i mobil och dator och att länken öppnar rätt flöde på portal.fckindmark.se. Prova inbjudan först när appens accepterande av inbjudan och val av lösenord har verifierats. Ingen leverans kan verifieras enbart genom att mallfilerna finns i GitHub.

## Leverans till inkorgen

Kontrollera mottagna meddelandets Authentication-Results: SPF, DKIM och DMARC. Korrekt SMTP och ett snyggt mejl garanterar inte inkorgsplacering. one.com anger SPF `v=spf1 include:_custspf.one.com ~all`; granska befintligt SPF först och lägg inte till ett andra SPF-record. Behåll andra legitima avsändare. DKIM-värden är domänspecifika och fås från one.com. Ändra inte MX eller namnservrar för att rätta portalens mallar. Markera testmeddelandet som Inte skräppost och testa om efter DNS-verifiering.
