# LUNA 0.2 API Contract

All application API routes are server-side Next.js Route Handlers. Protected routes require a Supabase-authenticated user. Provider secrets never reach the browser.

## Public

### GET /api/health
Returns service health and version.

## Authentication

### GET /auth/callback
Exchanges the Supabase email-login code for a browser session and redirects only to a safe local path.

## Approvals

### POST /api/approvals
Creates an action-bound, short-lived approval request. The response contains the one-time bearer token needed to approve the request.

Request:
```json
{ "action": "mail.send", "reason": "Send the prepared email", "payload": {}, "ttlMs": 300000 }
```

### POST /api/approvals with `operation=approve`
Approves a pending request using its ID and token. Provider write endpoints consume the approved request atomically and verify that the requested payload matches the approved action.

## Microsoft integration

### GET /api/integrations/microsoft/start
Starts the Microsoft identity-platform authorization-code flow for the authenticated LUNA user. The route creates a signed, short-lived state cookie and requests delegated `User.Read`, `Mail.Read`, `Mail.Send`, `Calendars.ReadWrite` and `offline_access` scopes.

### GET /api/integrations/microsoft/callback
Validates the OAuth state, exchanges the authorization code server-side, verifies the Microsoft Graph `/me` identity, and stores encrypted access/refresh tokens in the user-scoped `microsoft_connections` table.

Microsoft access tokens are refreshed server-side when they expire. Tokens are never accepted from the browser request body.

## Chat

### POST /api/chat
Authenticates the user, validates the owned conversation, stores the user message, loads recent conversation history and durable memory, evaluates Luna Core and Guardian, executes approved capabilities, and stores the assistant response.

## Mail

### POST /api/mail
Supports `search`, `read`, and `send`. Mail read operations use the authenticated user's Microsoft connection. Sending requires a matching, approved, unconsumed durable approval and remains behind the Guardian/action boundary.

## Calendar

### POST /api/calendar
Supports `list`, `read`, `create`, `update`, and `delete`. Calendar writes require a matching, approved, unconsumed durable approval and remain behind the Guardian/action boundary.

## Commerce

### POST /api/commerce
Supports product listing and controlled publishing. Publishing requires a matching durable approval and executes through the Shop Agent capability gate and Guardian/action boundary.

## Memory

### GET /api/memory?q=term
Lists up to 50 owned memories; `q` optionally filters memory content.

### POST /api/memory
Creates a memory while rejecting sensitive credentials.

### PATCH /api/memory/:id
Updates an owned memory and applies the same sensitive-content protection as creation.

### DELETE /api/memory/:id
Deletes an owned memory.

## Projects and Tasks

Project and task routes are authenticated and user-scoped. Mutations validate their input and remain subject to the application permission boundary.

## Design rules

1. Authenticate before accessing user data.
2. Every user-owned query is scoped to the authenticated user's ID.
3. RLS remains enabled on all user-owned tables.
4. Service/provider API keys stay server-side in environment variables.
5. Validate request payloads at the API boundary.
6. Destructive provider actions require durable, action-bound approval.
7. Tool execution remains behind the Guardian/action boundary.
8. Audit and event tables are append-oriented for authenticated clients.
9. Supabase migrations are the authoritative production schema history.
