---
id: nanoclaw-da67
title: Design and implement family agent architecture
type: feature
priority: 2
created: '2026-03-01T23:10:15Z'
updated: '2026-03-01T23:10:15Z'
---

Design and implement a "family agent" architecture for NanoClaw that enables multi-member coordination on a single instance with proper privacy boundaries, shared resources, and coordinated planning.

## Core Design Principles

**Single NanoClaw Instance Architecture:**
- Multiple registered groups on one instance (main + family + per-member personal groups)
- Secret/connection/skill segregation per member via per-group isolation
- Shared skills with separate credentials and data stores per member
- Cross-group coordination via main channel and inter-group messaging (PR #586)

**Privacy Boundaries:**
- Per-member groups: Private memory, private credentials, private files
- Family group: Shared coordination, shared documents, multi-party visibility
- Main channel: Admin/parent coordination hub with cross-group messaging
- Skill-level isolation: Same skill (e.g., calendar) with different credentials per member

## Use Cases

### 1. Multi-Party Scheduling
- Family group can query all members' calendars (via cross-group requests)
- Find common free time slots across multiple calendars
- Propose meeting times that work for everyone
- Book events on individual calendars after approval
- Example: "Find a time this weekend when everyone is free for dinner"

### 2. Shared Documents & Notes
- Family Seafile library with shared access
- Collaborative shopping lists, meal plans, vacation planning docs
- Version tracking and update notifications to family group
- Private notes remain in personal groups' Seafile libraries

### 3. Task Coordination
- Family WorkFlowy shared task list
- Assign tasks to specific family members (notifications via cross-group messaging)
- Track completion status across members
- Recurring household tasks (chores, bills, maintenance)

### 4. Information Aggregation
- "What's everyone doing this weekend?" - query all calendars, aggregate, summarize
- "Any important emails today?" - check everyone's inbox (with permission), surface urgent items
- "What's on the shopping list?" - consolidate requests from all members

### 5. Proactive Family Coordination
- Detect scheduling conflicts: "Mom and Dad both have evening commitments - who's picking up kids?"
- Bill reminders that check who's responsible this month
- Birthday/anniversary reminders with gift idea suggestions from shared notes
- Travel coordination: "Dad's flying to NYC - anyone else need anything there?"

### 6. Shared Media & Files
- Family photo library with automatic tagging and organization
- Shared Readeck for interesting articles family members save
- Recipe collection with meal planning integration

### 7. Privacy-Aware Information Sharing
- Kids' groups can request calendar info from parents without seeing details
- Parents can monitor shared family resources without accessing private messages
- Selective sharing: "Share my availability but not event details"

### 8. Group Decision Making
- Poll family members: "Pizza or burgers for Friday dinner?"
- Collect preferences and find consensus
- Track RSVPs for family events

### 9. Emergency Coordination
- Broadcast urgent messages to all family members
- "School canceled due to snow - who can watch the kids?"
- Location sharing and safety check-ins

### 10. Financial Coordination
- Shared expense tracking (who paid for what)
- Bill splitting and settlement reminders
- Budget tracking for family expenses vs personal

## Technical Implementation Requirements

**Group Structure:**


**Shared Skills (family group):**
- Seafile access to shared family library
- WorkFlowy shared task list
- Shared Readeck collection
- Cross-group messaging capability

**Per-Member Skills (personal groups):**
- Fastmail with individual credentials
- Google Calendar with individual credentials
- Private Seafile libraries
- Private WorkFlowy nodes
- Private Readeck collections

**Cross-Group Coordination Skills:**
- Calendar aggregation: Query multiple members' calendars and find intersections
- Task assignment: Create tasks in shared list, notify individuals via cross-group messaging
- Availability checker: "Is [person] free at [time]?" - queries their personal group
- Preference collector: Poll family members and aggregate responses

**Per-Group Secret Management (depends on issue #446):**
- Encrypted credential storage per group
- Each member's personal group has their own API tokens
- Family group has shared service credentials where appropriate

**Main Channel Capabilities:**
- Schedule cross-group coordination tasks
- Monitor family group activity and health
- Manage shared resources and permissions
- Handle escalations and conflicts

## Implementation Steps

1. **Design shared vs private skill framework** - Document which skills should be shared, which need per-member isolation
2. **Implement per-group secret management** (if not done via #446) - Encrypted credential storage
3. **Create cross-group coordination skills:**
   - Calendar aggregator skill
   - Task assignment skill
   - Availability checker skill
   - Preference polling skill
4. **Build family agent configuration template:**
   - Example group structure
   - Example CLAUDE.md for each group type
   - Example skill configurations
   - Example scheduled tasks for family coordination
5. **Document privacy model** - Clear guidelines on what's shared vs private
6. **Create setup guide** - Step-by-step instructions for families
7. **Contribute to NanoClaw repo** - Share as example configuration and documentation

## Open Questions

- How to handle skill updates that need different credentials per instance?
- Best practices for consent/permissions when querying personal groups?
- Should family group have read-only vs read-write access to shared resources?
- How to handle member onboarding/offboarding?
- Rate limiting for cross-group queries to prevent spam?
- Audit logging for cross-group data access?

## Dependencies

- PR #586 (cross-group messaging) - merged/pending
- Issue #446 (per-group secrets) - proposed
- Existing skills: Seafile, Fastmail, WorkFlowy, Readeck

## Success Criteria

- Family of 3-5 members successfully using shared coordination
- Privacy boundaries respected (personal data stays private)
- Clear documentation enables others to replicate setup
- At least 3 concrete family coordination use cases working end-to-end
- Contributed back to NanoClaw as reference architecture
