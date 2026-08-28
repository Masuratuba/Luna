# LUNA 0.4 checkpoint

This checkpoint preserves the LUNA 0.3 behavior while adding the runtime foundation for:

1. durable conversation persistence
2. intelligent long-term memory via model tool calling
3. project actions via chat tools
4. task actions via chat tools
5. scheduled automations with a Vercel cron runner
6. private user file upload/storage/signed access

Important deployment requirements:
- Apply `lib/database/migrations/002_assistant_runtime.sql` in Supabase.
- Configure `SUPABASE_SERVICE_ROLE_KEY` server-side.
- Configure `CRON_SECRET` if cron endpoint protection is desired.
- Deploy through Vercel and verify the production build/live flows.

No existing LUNA UI was intentionally replaced by these runtime changes.
