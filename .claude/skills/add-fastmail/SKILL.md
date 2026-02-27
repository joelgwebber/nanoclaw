---
name: add-fastmail
description: Add Fastmail integration to NanoClaw. Can replace WhatsApp entirely or run alongside it. Also configurable as a control-only channel (triggers actions) or passive channel (receives notifications only).
---

# Add Fastmail Integration

This skill adds Fastmail email, calendar, and contacts access to NanoClaw via MCP tools.

## Workflow

1. **Gather requirements** - Ask which services to integrate (email, calendar, contacts)
2. **Get credentials** - Guide user through creating Fastmail app password
3. **Implement** - Create MCP server and wire it up
4. **Test** - Verify tools are accessible

## What This Skill Does

Adds Fastmail integration with the following tools:

**Email (IMAP/SMTP)**
- List folders and messages
- Read message content
- Send emails
- Search with IMAP filters

**Calendar (CalDAV)**
- List calendars
- List events in date ranges
- Create calendar events

**Contacts (CardDAV)**
- List contacts
- Search contacts by name or email

## Implementation Steps

### 1. Gather Requirements

Ask the user:
- Which services do you want? (Email, Calendar, Contacts - recommend all three)
- Should this be main channel only or all groups? (recommend main only for security)
- Do you already have a Fastmail app password?

### 2. Guide App Password Creation

If they don't have an app password, provide these instructions:

```
Create a Fastmail App Password:

1. Log in to Fastmail web interface
2. Go to Settings → Password & Security
3. Scroll to "App Passwords"
4. Click "New App Password"
5. Name: "NanoClaw" (or "Claude Assistant")
6. Scope: Select all three:
   - Mail (IMAP/SMTP)
   - Calendars (CalDAV)
   - Contacts (CardDAV)
7. Click "Generate Password"
8. Copy the generated password (you won't see it again!)
```

Ask for:
- Email address (e.g., user@fastmail.com or user@pobox.com)
- App password (the generated password)

### 3. Create MCP Server

Create `container/agent-runner/src/fastmail-mcp-stdio.ts` implementing:

**Email tools using `imap` and `nodemailer` packages:**
- fastmail_list_folders
- fastmail_list_messages (with IMAP search support)
- fastmail_read_message
- fastmail_send_message

**Calendar tools using CalDAV REPORT queries:**
- fastmail_list_calendars (PROPFIND with Depth: 1)
- fastmail_list_events (calendar-query REPORT)
- fastmail_create_event (PUT with iCalendar format)

**Contacts tools using CardDAV REPORT queries:**
- fastmail_list_contacts (addressbook-query REPORT with Depth: 0)
- fastmail_search_contacts (addressbook-query REPORT with filtering)

**Important CalDAV/CardDAV details:**
- Use PROPFIND with `Depth: 1` header for listing calendars
- Use REPORT with `calendar-query` for fetching events
- Use REPORT with `addressbook-query` for fetching contacts (NOT PROPFIND - it returns 403)
- Parse `d:propstat` as an array (e.g., `propstatArray[0]`)
- Parse iCalendar format for events (SUMMARY, DTSTART, DTEND, LOCATION, DESCRIPTION)
- Parse vCard format for contacts (FN, EMAIL, TEL, ORG)

**Server endpoints:**
- IMAP: imap.fastmail.com:993 (TLS)
- SMTP: smtp.fastmail.com:465 (secure)
- CalDAV: https://caldav.fastmail.com/dav/calendars/user/${EMAIL}/
- CardDAV: https://carddav.fastmail.com/dav/addressbooks/user/${EMAIL}/Default/

Also create `container/agent-runner/src/mailparser.d.ts` with type definitions for the mailparser package (it lacks TypeScript types).

### 4. Add Dependencies

Update `container/agent-runner/package.json`:

**Runtime dependencies:**
```json
"imap": "^0.8.19",
"nodemailer": "^6.9.16",
"mailparser": "^3.7.1",
"fast-xml-parser": "^4.5.0"
```

**Dev dependencies:**
```json
"@types/imap": "^0.8.40",
"@types/nodemailer": "^6.4.16"
```

### 5. Wire Up MCP Server

Update `container/agent-runner/src/index.ts`:

1. Add path variable:
   ```typescript
   const fastmailMcpPath = path.join(__dirname, 'fastmail-mcp-stdio.js');
   ```

2. Add to `runQuery()` function signature:
   ```typescript
   fastmailMcpPath: string,
   ```

3. Add to `mcpServers` configuration:
   ```typescript
   ...(containerInput.isMain && sdkEnv.FASTMAIL_EMAIL && sdkEnv.FASTMAIL_APP_PASSWORD ? {
     fastmail: {
       command: 'node',
       args: [fastmailMcpPath],
       env: {
         FASTMAIL_EMAIL: sdkEnv.FASTMAIL_EMAIL,
         FASTMAIL_APP_PASSWORD: sdkEnv.FASTMAIL_APP_PASSWORD,
       },
     },
   } : {}),
   ```

4. Add to `allowedTools` array:
   ```typescript
   'mcp__fastmail__*'
   ```

5. Update the `runQuery()` call site to pass the new parameter.

### 6. Add Secrets

Update `src/container-runner.ts` `readSecrets()` function:

```typescript
function readSecrets(): Record<string, string> {
  return readEnvFile([
    'CLAUDE_CODE_OAUTH_TOKEN',
    'ANTHROPIC_API_KEY',
    'SEAFILE_URL',
    'SEAFILE_TOKEN',
    'FASTMAIL_EMAIL',        // Add this
    'FASTMAIL_APP_PASSWORD'  // Add this
  ]);
}
```

### 7. Add Credentials to .env

Add to `.env` file:
```bash
FASTMAIL_EMAIL="user@fastmail.com"
FASTMAIL_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"
```

### 8. Document Tools

Add to `groups/main/CLAUDE.md` (or relevant group's CLAUDE.md):

```markdown
## Fastmail Email, Calendar, and Contacts

You have access to Fastmail via MCP tools for email (IMAP/SMTP), calendar (CalDAV), and contacts (CardDAV).

### Email Tools
- mcp__fastmail__fastmail_list_folders
- mcp__fastmail__fastmail_list_messages (folder, limit, search)
- mcp__fastmail__fastmail_read_message (folder, uid)
- mcp__fastmail__fastmail_send_message (to, subject, body, cc?, bcc?)

### Calendar Tools
- mcp__fastmail__fastmail_list_calendars
- mcp__fastmail__fastmail_list_events (calendar, start_date, end_date)
- mcp__fastmail__fastmail_create_event (calendar, summary, start, end, description?, location?)

### Contacts Tools
- mcp__fastmail__fastmail_list_contacts (limit)
- mcp__fastmail__fastmail_search_contacts (query)

[Include usage examples]
```

## After Implementation

1. **Rebuild container** (new dependencies):
   ```bash
   ./container/build.sh
   ```

2. **Rebuild host code** (new secrets handling):
   ```bash
   npm run build
   ```

3. **Sync agent source** (bind mount):
   ```bash
   ./scripts/update-agent-source.sh
   ```

4. **Restart service**:
   ```bash
   # macOS
   launchctl kickstart -k gui/$(id -u)/com.nanoclaw

   # Linux
   systemctl --user restart nanoclaw
   ```

## Testing

Ask the user to send a message to Sparky testing the integration:
- "List my recent emails"
- "What events do I have this week?"
- "Search contacts for [name]"

If tools aren't showing up, check:
1. Credentials in `.env` file
2. Credentials in `data/env/env` file (regenerated on restart)
3. Container logs in `groups/main/logs/container-*.log`

## Common Issues

**403 Forbidden on contacts**: Make sure you're using `addressbook-query` REPORT, not PROPFIND. CardDAV blocks `card:address-data` in PROPFIND responses.

**No calendars found**: Ensure `Depth: 1` header is set on the calendar list PROPFIND request.

**d:propstat parsing errors**: Remember that `d:propstat` is an array in CalDAV/CardDAV responses. Access it as `propstatArray[0]`.

**XML parsing issues**: Use `fast-xml-parser` with these options:
```typescript
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
});
```
