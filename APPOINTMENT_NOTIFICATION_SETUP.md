# Appointment notifications — Medical Records Organizer

This change is staged on a feature branch until the backend is configured and tested. No changes are needed in the Recurring Charges Supabase project or repository.

## Medical Supabase project

1. Run `supabase/appointment_notifications.sql` in the **Medical Records** project's SQL Editor. This creates separate tables for appointment reminder preferences, device push subscriptions, and send history, with RLS.
2. Generate a **new**, independent VAPID key pair. Set the public key in the Medical Records GitHub Actions secret `VITE_MEDICAL_VAPID_PUBLIC_KEY` (injected at Vite build time). Set Supabase Edge Function secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (e.g., a valid mailto contact), and `APPOINTMENT_CRON_SECRET` (a strong random secret).
3. Deploy `supabase/functions/send-appointment-reminders` to the **Medical Records** Supabase project with JWT verification disabled **only for this endpoint**; the function independently requires an Authorization Bearer matching `APPOINTMENT_CRON_SECRET`. Keep all other functions' security settings unchanged.
4. Configure a Supabase scheduled job (pg_cron + pg_net or dashboard Cron) to POST to that function **hourly** with Authorization `Bearer <APPOINTMENT_CRON_SECRET>`. The function sends notifications at 9 AM America/New_York (including daylight-saving changes), and deduplicates them by appointment, device, and local date.
5. Update `.github/workflows` build environment to expose `VITE_MEDICAL_VAPID_PUBLIC_KEY: ${{ secrets.VITE_MEDICAL_VAPID_PUBLIC_KEY }}` to the build. Do not publish until configured and validated.
6. After deploying, open the installed app on each device and select **Appointments > Enable Notifications Here**. iPad web push requires the installed Home Screen app. Select reminders for each desired appointment and run test notifications.

Notifications are opt-in per appointment and per device. Reminder choices are 0,1,2,3,5,7,14,30 days. A single daily reminder is sent from the configured start day through the appointment date. The payload intentionally avoids doctor names and sensitive details.

**Important:** Without the SQL, deployment, job, secrets, and device opt-in, the UI alone does not deliver notifications. The existing Recurring Charges system is not read from or modified.
