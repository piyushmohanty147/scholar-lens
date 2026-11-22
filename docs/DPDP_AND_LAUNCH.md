# Scholar Lens: DPDP preparation, data inventory and launch notes

This is a working document, not legal advice. Items marked **[CONFIRM]** need your decision or a lawyer's review.
Nothing here claims legal compliance.

## 1. What personal data we hold

| Data | Where | Why | Kept for |
|---|---|---|---|
| Email, name/photo (Google sign-in) | Supabase `auth.users`, `profiles` | Sign-in, account | Until account deleted |
| Questions / project descriptions saved | `saved_reports` | Saved outlooks | Until user deletes or account deleted |
| Saved papers and summaries | `saved_papers` | My library | Same |
| Share links | `shared_reports` | Public report links | Expire after 90 days (new links); user can stop earlier |
| Daily usage counts | `usage_counts` | Free-plan limits | Until account deleted |
| Consent record (policy version, time) | `consent_log` | Proof of consent | Until account deleted |
| Pro waitlist email | `waitlist` | Waitlist | Until account deleted |
| Newsletter email | `subscribers` | Trend emails | Until unsubscribe or account deleted |
| IP request counters | `ip_hits` | Abuse prevention | About 6 hours |
| Server logs (IP, requests) | Vercel | Operation, security | Per Vercel's retention **[CONFIRM plan and period]** |
| On-device history | Browser storage | Reopen recent outlooks | Until user clears it; cleared on account deletion |

## 2. Processors (who receives data)

| Provider | What they receive | Purpose | Location **[CONFIRM region in each dashboard]** |
|---|---|---|---|
| Supabase | Accounts, saved data | Sign-in, database | Check project region in Supabase settings |
| Vercel | Requests, IP, logs | Hosting | Global edge |
| Google (Gemini API) | Question/project text (up to 1,500 characters), paper titles and abstracts. No email or user ID | AI summaries and outlooks | Google. Free-tier terms may allow product improvement. **[CONFIRM your key's plan and data terms]** |
| Google (sign-in) | Sign-in event | Google login | Google |
| OpenAlex, Semantic Scholar, Crossref, Europe PMC | Search text, from our server (not tied to a user) | Paper data | Their servers |
| Razorpay | Not connected yet | Payments | Add when live |

## 3. Rights and requests process

- **Access / summary, correction, erasure, withdrawal, nominee:** user emails the contact address; reply within 30 days **[CONFIRM you can meet this]**.
- **Self-service erasure:** account menu, Delete my account (also `/delete-account` page).
- **Newsletter:** `/unsubscribe`.
- **Grievance contact:** currently the contact email only. **[CONFIRM name and contact of the person who answers complaints]**.
- **Breach response:** `docs/INCIDENT_RESPONSE.md`.
- **Children:** 18+ only, self-declared at sign-up (no age verification). **[CONFIRM with lawyer whether this is enough]**.

## 4. Details only you can supply **[CONFIRM]**

- Legal name of the business or individual operating the service, and a postal address (a mailbox is common).
- Grievance contact name.
- Final product name (see the trademark conflict). The name appears in `lib/site.ts`.
- Whether to keep the newsletter before an email sender exists (there is no email confirmation yet, so addresses are unverified).

## 5. Remaining risks after this change

1. `package-lock.json` is missing, so installs are not pinned. It could not be created offline. Dependabot is configured, and `npm audit` has not been run.
2. The usage limit is checked before and counted after each request, so many simultaneous requests can exceed a daily limit. Per-IP hourly limits and a Google spending cap reduce the cost.
3. Newsletter signups are unverified. Anyone can add an address, and anyone can unsubscribe an address (by design, privacy-protective).
4. `rate_hit` is still callable with the public key; keys are now restricted to the shapes the server uses, with sane limits.
5. CSP still allows inline scripts and styles because Next.js needs them.
6. Live Supabase settings (auth redirect URLs, JWT expiry, email limits, backups, region) are unverified.
7. Git history was only partially visible, so older commits are unchecked for secrets.

## 6. Google Search launch

Already in place: `sitemap.xml`, `robots.txt`, canonical URLs, titles, descriptions, Open Graph tags, legal pages, `noindex` on shared reports (header and page), and `/api/` blocked.

Steps from your phone:
1. Open Google Search Console and choose Add property, then URL prefix. Enter your site address.
2. Pick the HTML tag method. Copy the code after `content=`.
3. In Vercel, Settings, Environment Variables, add `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` with that code, then redeploy.
4. Back in Search Console, tap Verify.
5. Open Sitemaps and submit `sitemap.xml`.
6. In URL Inspection, paste the home page address and tap Request indexing.
7. Wait a few days. New sites often take weeks to appear.

Before public launch, decide the final name and domain. Changing it later resets search ranking. **[CONFIRM]**

## 7. Google Play plan

Status: there is **no Android project** in the repository. The site has a web app manifest and icons, so it can be packaged as a Trusted Web Activity (TWA), which wraps the real website without changing how sign-in works.

Safest route:
1. Pick the final name and a custom domain first. A `vercel.app` address is a poor long-term base.
2. Use PWABuilder (pwabuilder.com) or Bubblewrap to generate the Android App Bundle (.aab). This needs a computer or a cloud build, and could not be done here.
3. Host `/.well-known/assetlinks.json` on the domain so the app and site verify each other.
4. Create a Google Play developer account. **This costs money (a one-time registration fee, about US$25). Confirm before paying.** Google also requires identity verification, and new personal accounts must run a closed test with a minimum number of testers for a set period before production. **[CONFIRM current requirement in Play Console]**
5. Fill in the store listing: description, icon (the pink one is in `app/pwa-icon`), and phone screenshots.
6. Privacy policy URL: `/privacy`. Account deletion URL: `/delete-account`.

Data Safety answers (be accurate; the app does collect data):

| Question | Answer |
|---|---|
| Collects data? | Yes |
| Personal info | Email, name (optional via Google sign-in). Collected, needed for the account |
| App activity | Search questions, project descriptions, saved items. Collected |
| Shared with third parties | Text is sent to AI and paper-search providers to produce results |
| Data encrypted in transit | Yes |
| Users can request deletion | Yes (in app and on the web page) |
| Ads / analytics | None |

Content rating: answer the questionnaire honestly (informational app, no user-to-user content, no mature content). Target audience: adults 18+.

Do not describe the app as approved until Google confirms.
