# LUNA 0.1 API Contract

All application API routes are server-side Next.js Route Handlers. Authentication is required unless explicitly marked public. The browser never receives provider secrets.

## Public

### GET /api/health
Returns `{ "ok": true, "service": "luna" }`.

## Chat

### POST /api/chat
Request:
```json
{ "message": "string", "conversationId": "uuid?" }
```
Response:
```json
{ "ok": true, "conversationId": "uuid", "decision": "chat", "reply": "string" }
```

### GET /api/conversations
Returns the authenticated user's conversations, newest first.

### GET /api/conversations/:id
Returns one owned conversation and its messages.

### DELETE /api/conversations/:id
Deletes one owned conversation and its messages.

## Memory

### GET /api/memory
Lists the authenticated user's memories.

### POST /api/memory
Creates or updates a memory by `memory_key`.
Request: `{ "memory_key": "string", "memory_value": {}, "category": "general", "importance": 3 }`.

### DELETE /api/memory/:id
Deletes one owned memory.

## Profile

### GET /api/profile
Returns the authenticated user's LUNA profile.

### PUT /api/profile
Creates or updates the authenticated user's profile.

## Notes

### GET /api/notes
Lists owned notes.

### POST /api/notes
Creates a note.

### PUT /api/notes/:id
Updates an owned note.

### DELETE /api/notes/:id
Deletes an owned note.

## Reminders

### GET /api/reminders
Lists owned reminders.

### POST /api/reminders
Creates a reminder.

### PUT /api/reminders/:id
Updates an owned reminder.

### DELETE /api/reminders/:id
Deletes an owned reminder.

## Plans / Projects

### GET /api/plans
Lists owned plans.

### POST /api/plans
Creates a plan.

### PUT /api/plans/:id
Updates an owned plan.

### DELETE /api/plans/:id
Deletes an owned plan.

## Design rules

1. Every user-owned query is scoped by `auth.uid()`.
2. RLS remains enabled on all user-owned tables.
3. Service/provider API keys stay server-side in environment variables.
4. API handlers validate input before database/provider calls.
5. Tool execution is routed through the Luna Core; the UI does not call tools directly.
6. New modules should add their own tables/routes without changing existing core contracts unless a migration is explicitly required.
