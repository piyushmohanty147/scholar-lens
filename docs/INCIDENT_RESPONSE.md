# If something leaks: the 72-hour checklist

India's data protection law (DPDP Act and Rules) expects you to report a personal-data breach quickly,
including a detailed report to the Data Protection Board within 72 hours. This is a working checklist, not legal advice.

## First hour: stop it
1. Rotate the keys that may be exposed: Supabase (anon key and JWT secret if needed), Gemini, OpenAlex, Razorpay. Update them in Vercel and redeploy.
2. If an account or provider login is suspected, change its password and turn on two-step verification.
3. In Supabase, check Logs for unusual API calls. In Vercel, check deployments for changes you did not make.

## First day: understand it
4. Write down: what happened, when you noticed it, what data (emails, saved reports), roughly how many people.
5. Save evidence: screenshots and log exports. Do not delete anything.

## Within 72 hours: tell people
6. Email affected users plainly: what happened, what data, what you did, what they should do.
7. Send the required report to the Data Protection Board (check the board's current process).
8. Keep a copy of everything you sent.

## After
9. Fix the cause, then write down what changed so it cannot happen again.
