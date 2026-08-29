# LUNA 0.1 API Contract

All application API routes are server-side Next.js Route Handlers. Protected routes require a Supabase-authenticated user. Provider secrets never reach the browser.

## Public

### GET /api/health
Returns service health and version.

## Authentication

### GET /auth/callback
Exchanges the Supabase email-login code for a browser session and redirects to the requested safe local path.

## Chat

### POST /api/chat
Request:
```json
{ "message": "string", "conversationId": "uuid?" }
```
The route authenticates the user, creates or validates the owned conversation, stores the user message, loads recent conversation history and durable memory, calls the configured OpenAI model, and stores the assistant response.

Response:
```json
{ "ok": true, "conversationId": "uuid", "decision": "ANSWER", "reply": "string" }
```

### GET /api/conversations
Lists the authenticated user's conversations, newest first.

### POST /api/conversations
Creates an owned conversation.

### GET /api/conversations/:id
Returns one owned conversation and its messages.

### DELETE /api/conversations/:id
Deletes one owned conversation and its messages through the database cascade.

## Memory

### GET /api/memory?q=term
Lists up to 50 owned memories; `q` optionally filters memory content.

### POST /api/memory
Creates a memory.
Request:
```json
{ "type": "personal|preference|project|decision|fact|instruction", "content": "string", "importance": 0.0, "metadata": {} }
```
Importance is a number from 0 to 1.

### PATCH /api/memory/:id
Updates an owned memory.

### DELETE /api/memory/:id
Deletes an owned memory.

## Projects

### GET /api/projects
Lists owned projects.

### POST /api/projects
Creates an owned project.

### GET /api/projects/:id
Returns one owned project.

### PATCH /api/projects/:id
Updates an owned project.

### DELETE /api/projects/:id
Deletes an owned project.

## Tasks

### GET /api/tasks
Lists owned tasks.

### POST /api/tasks
Creates an owned task.

### PATCH /api/tasks/:id
Updates an owned task.

### DELETE /api/tasks/:id
Deletes an owned task.

## Design rules

1. Authenticate before accessing user data.
2. Every user-owned query is scoped to the authenticated user's ID.
3. RLS remains enabled on all user-owned tables.
4. Service/provider API keys stay server-side in environment variables.
5. Validate request payloads at the API boundary.
6. Conversation and memory context are assembled server-side.
7. Tool execution remains behind the Luna Core boundary.
8. New modules should add their own tables/routes without destabilizing existing core contracts.
