---
id: nanoclaw-58fa
title: Investigate WhatsApp rejecting Twilio number +1.845.420.1064
type: task
priority: 2
created: '2026-03-01T17:54:42Z'
updated: '2026-03-01T17:54:42Z'
---

WhatsApp registration failing with 'not a valid US number' error for Twilio number.

## Issue
Twilio number +1.845.420.1064 rejected by WhatsApp during registration with error: 'not a valid US number'

## Known Causes
1. **Number Type**: WhatsApp rejects toll-free numbers (800, 888, etc.) and some VoIP-flagged numbers
2. **Capabilities**: Number must have SMS enabled (required for verification)
3. **Mobile vs Local**: Mobile numbers work best, Local numbers are hit-or-miss

## Troubleshooting Steps
1. Check Twilio Console → Phone Numbers → Number details:
   - Verify Type: Should be 'Local' or 'Mobile', NOT 'Toll-Free'
   - Verify Capabilities: SMS must be enabled
2. Try different formatting:
   - Without formatting: 18454201064
   - With + only: +18454201064
3. Test SMS reception with regular phone (when off plane)
4. If number is flagged/VoIP: Release and buy different Local number
5. Consider UK/Canadian number (Twilio has mobile numbers there)

## Next Actions
- User currently on plane, will test SMS reception when landed
- If SMS works but WhatsApp still rejects, likely need different number
- May need to filter for 'mobile' type numbers in Twilio purchase flow

## Context
Setting up ASSISTANT_HAS_OWN_NUMBER=true to give Sparky distinct WhatsApp identity (vs self-chat confusion)
