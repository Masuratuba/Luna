# LUNA 0.3 checkpoint

Date: 2026-08-28

Current stable capabilities:
- OpenAI chat via `gpt-5.6-luna`
- Up to 100 recent conversation messages passed to the model
- Optional Supabase authentication
- Authenticated conversations persisted in `conversations` and `messages`
- Saved conversations restored on the next visit for authenticated users
- Authenticated long-term memories loaded into the model context
- Explicit "merke dir / speichere / vergiss nicht" requests saved as memory candidates
- Existing authenticated APIs for memories, projects and tasks remain available
- Existing auth callback and login flow remain in place

Important:
- Guest chat remains available when no authenticated Supabase session exists.
- External integrations (for example Outlook/GitHub) are not claimed as connected by this checkpoint; they still require their respective connection/auth flows.
- This checkpoint is a recovery point before further feature work.
