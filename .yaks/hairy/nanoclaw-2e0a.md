---
id: nanoclaw-2e0a
title: Design secure R&D workflow with restricted and privileged agents
type: feature
priority: 2
created: '2026-03-02T05:17:29Z'
updated: '2026-03-02T05:17:29Z'
---

Design a secure workflow that allows restricted agents to perform research and development work, then propose changes to a privileged agent for vetting and user approval before integration into core codebase.

PROBLEM:
Currently agents have either:
- Read-only access to /workspace/project (can read code but not modify)
- Read-write access to /workspace/group (can modify but changes don't affect running system)

This creates a gap for development workflows where we want agents to:
1. Research and prototype solutions
2. Write working code
3. Have changes reviewed and vetted
4. Get integrated into core after approval

PROPOSED SOLUTION: R&D Agent Workflow

ROLES:
1. Research Agent (restricted) - Can read core, write to workspace
2. Privileged Agent (elevated) - Can review proposals and modify core
3. User - Final approval authority

WORKFLOW PHASES:

Phase 1: Research & Prototype (Research Agent)
- Agent reads /workspace/project/src (read-only)
- Agent researches solutions (web search, documentation)
- Agent writes prototype to /workspace/group/proposals/PROPOSAL_ID/
- Agent creates proposal manifest with metadata
- Agent notifies privileged agent via IPC

Phase 2: Review & Vet (Privileged Agent)
- Privileged agent receives proposal notification
- Reviews code in /workspace/group/proposals/PROPOSAL_ID/
- Runs security checks (file access patterns, network calls, credentials)
- Tests in isolated environment
- Generates review report with approval/rejection/questions

Phase 3: User Approval
- User reviews proposal summary and privileged agent's assessment
- User can ask questions, request changes, or approve
- If approved, privileged agent integrates changes

Phase 4: Integration (Privileged Agent)
- Copy approved files to /workspace/project/src/
- Update configurations
- Run tests
- Create commit with co-authorship attribution

SECURITY CONSIDERATIONS:

Isolation:
- Research agent never writes to core directly
- All proposals in isolated workspace directory
- Privileged agent reviews before any core modifications

Vetting Checklist:
- Does code access sensitive files? (.env, credentials, tokens)
- Does code make network calls? (document endpoints)
- Does code execute shell commands? (audit for injection)
- Does code modify existing behavior unexpectedly?
- Are dependencies safe and necessary?
- Is error handling appropriate?
- Are secrets properly managed?

Trust Boundaries:
- Research Agent: Untrusted, sandboxed, read-only core access
- Privileged Agent: Trusted, can modify core, enforces security policy
- User: Ultimate authority, approves all core changes

Audit Trail:
- All proposals logged with timestamps
- Review decisions recorded
- Integration commits tagged with proposal ID
- Research agent and privileged agent both credited

IMPLEMENTATION REQUIREMENTS:

1. Proposal System:
   - /workspace/group/proposals/ directory structure
   - Proposal manifest format (YAML or JSON)
   - Unique proposal IDs
   - Status tracking (draft, submitted, under_review, approved, rejected, integrated)

2. IPC Communication:
   - Research agent → Privileged agent: submit_proposal
   - Privileged agent → User: request_approval
   - User → Privileged agent: approve/reject/request_changes
   - Privileged agent → Research agent: feedback

3. Privileged Agent Capabilities:
   - Read/write access to /workspace/project/src/
   - Can run tests and builds
   - Can create git commits
   - Can install dependencies
   - Can modify configuration files

4. Research Agent Constraints:
   - Read-only /workspace/project/ access
   - Read-write /workspace/group/ access
   - Cannot directly trigger builds or deploys
   - Cannot modify running system
   - Cannot access user credentials directly

5. Review Tools:
   - Static analysis for security issues
   - Dependency vulnerability scanning
   - Code diff visualization
   - Test execution in sandbox
   - Documentation generation

EXAMPLE WORKFLOW:

User: "Add Twilio WhatsApp support"
↓
Research Agent:
- Researches Twilio WhatsApp API
- Reads current WhatsApp implementation
- Creates prototype in /workspace/group/proposals/twilio-whatsapp-001/
- Writes manifest describing changes needed
- Submits proposal via IPC
↓
Privileged Agent:
- Receives proposal notification
- Reviews code in proposal directory
- Checks security: webhook signature validation ✓, no credential leaks ✓
- Tests prototype (if possible)
- Generates review: APPROVED with minor suggestions
- Requests user approval with summary
↓
User:
- Reviews summary: "Add official Twilio WhatsApp API support, ~500 lines, webhook server, requires TWILIO_* env vars"
- Checks privileged agent's security assessment
- Approves: "Yes, proceed with integration"
↓
Privileged Agent:
- Copies files from proposal to src/channels/
- Updates src/index.ts with channel selection
- Adds dependencies to package.json
- Creates commit: "Add Twilio WhatsApp channel\n\nCo-authored-by: Research Agent\nProposal: twilio-whatsapp-001"
- Notifies user: Integration complete
↓
User: Rebuilds and deploys

BENEFITS:

1. Security: Changes vetted before touching core
2. Efficiency: Research agent can prototype freely
3. Accountability: Clear audit trail and attribution
4. Collaboration: Multiple agents can work on proposals
5. Iteration: Easy to request changes and revise
6. Learning: Research agent learns from privileged agent feedback

OPEN QUESTIONS:

1. How to spawn privileged agent securely?
   - Separate container with elevated permissions?
   - User-triggered via explicit command?
   - Scheduled review process?

2. What level of automation for integration?
   - Full automation after user approval?
   - Semi-automated with user confirmation for each step?
   - Manual integration with privileged agent guidance?

3. How to handle proposal revisions?
   - New proposal ID or version number?
   - Preserve revision history?
   - How to reference previous feedback?

4. Multi-agent collaboration on proposals?
   - Can multiple research agents contribute?
   - How to coordinate and merge contributions?
   - Conflict resolution process?

5. Testing and validation?
   - What tests can research agent run?
   - What tests require privileged agent?
   - Integration test requirements?

SUCCESS CRITERIA:

- Research agent can propose code changes safely
- Privileged agent can vet proposals with security checks
- User has clear visibility into proposed changes
- Integration process is auditable
- No unauthorized core modifications possible
- Workflow is efficient and practical

RELATED YAKS:
- nanoclaw-6f28: First test case for this workflow (Twilio implementation)
- nanoclaw-5719: Overall Twilio integration strategy
