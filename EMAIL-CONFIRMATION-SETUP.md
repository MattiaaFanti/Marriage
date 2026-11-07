# Wedding RSVP confirmation — Gmail + Google Apps Script (free)

Use an existing personal Gmail account to send the RSVP confirmation postcard. No purchased domain or Resend account is needed.

## Google Apps Script setup

1. Open https://script.google.com in the Gmail account that will send the wedding emails. Create a new project.
2. Replace the contents of Code.gs with the complete source from **GMAIL-FREE-MAILER.gs** in this repository. Save.
3. In Project Settings → Script properties, add WEDDING_MAIL_TOKEN and set a new randomly generated string of **at least 32 characters**. This is not a Gmail password or Resend API key.
4. Run authorizeWeddingMailer() from the editor once; accept the Google authorization prompt.
5. Choose Deploy → New deployment → Web app. Set **Execute as: Me** and **Who has access: Anyone** (including anonymous visitors). Deploy and copy the URL ending in /exec.
6. In Cloudflare Workers & Pages → marriage → Settings → Variables and Secrets, create **two encrypted secrets**:
   - GMAIL_SCRIPT_URL — the Apps Script /exec deployment URL.
   - GMAIL_SCRIPT_TOKEN — exactly the same random value saved as WEDDING_MAIL_TOKEN in Apps Script.
7. Deploy the current Worker code from this GitHub repository using your established Cloudflare deployment workflow (or npm run deploy). GitHub Pages alone does not publish the Worker.
8. Test the full RSVP flow: select Attending, complete all guest decisions, enter your own email and click Send email. Check Gmail's Sent folder and the recipient inbox.

## How the RSVP flow works

- The final confirmation popup displays an email field and Send / Skip buttons when at least one member is Attending.
- Send creates a personalized JPEG using confirmation-image.js (chair icons, exact number of attending guests and their names), then forwards it to the Cloudflare Worker.
- Cloudflare validates the group token and attendees in D1 and sends via the Google Apps Script endpoint. The sender is the Gmail account that deployed the script.
- Email subject: **Mattia & Kirsten Marriage - 07 December 2026**. The email HTML body consists only of the inline image.
- Skip saves **NO** for the group. Sending successfully saves the recipient email for the entire group. A new RSVP clears previous email choices; resetting all guests clears them.
- The RSVP dashboard has an Email column beside a narrower Role column. Pending rows are blank; declined/no-email rows display NO. Full email addresses are visible without a password on the public admin dashboard and shared by the entire household.

## Notes and limits

- Google Apps Script MailApp consumer quota: typically **100 recipients per day**. Subject to changes and other associated Gmail limits.
- The Apps Script web-app URL can be public; the shared WEDDING_MAIL_TOKEN must not be public. Only Cloudflare sends requests authenticated with this secret.
- The sender integration is not active until the Apps Script app is deployed and the Worker is updated with both secrets.
- The previous Resend path remains available in the Worker as an unused fallback; Gmail is preferred whenever the two GMAIL_SCRIPT settings are present.

Official docs: https://developers.google.com/apps-script/guides/web
MailApp inline images: https://developers.google.com/apps-script/reference/mail/mail-app
Current quotas: https://developers.google.com/apps-script/guides/services/quotas
