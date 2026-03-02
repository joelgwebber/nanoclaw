---
id: nanoclaw-5719
title: Add Twilio WhatsApp API support as alternative to Baileys
type: feature
priority: 2
created: '2026-03-02T02:56:08Z'
updated: '2026-03-02T02:56:08Z'
---

Add Twilio WhatsApp Business API support as an alternative messaging channel to Baileys. This solves the pain point of procuring and maintaining a legitimate US mobile number for WhatsApp.

PROBLEM: Current NanoClaw uses Baileys (reverse-engineered WhatsApp Web API) which requires a legitimate mobile number. Procuring a US number is difficult and Twilio numbers are being rejected by WhatsApp.

SOLUTION: Twilio WhatsApp Business API provides an official, supported alternative that eliminates the need for personal phone number authentication.

KEY ADVANTAGES:
- No personal number required (uses Twilio WhatsApp Business Account)
- Official REST API (stable, supported by Twilio and Meta/WhatsApp)
- Sandbox mode for testing (no approval needed)
- Production mode available with WhatsApp Business approval
- Rich features: text, images, videos, PDFs, templates, status callbacks

ARCHITECTURE CHANGES:

1. New channel implementation: src/channels/twilio-whatsapp.ts
   - Implement Channel interface
   - Webhook HTTP server (Express.js) for receiving messages
   - Twilio REST API client for sending messages
   - JID mapping (E.164 with whatsapp: prefix to Baileys JID format)

2. Configuration via environment variables:
   - WHATSAPP_CHANNEL=baileys|twilio
   - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
   - TWILIO_WHATSAPP_NUMBER, TWILIO_WEBHOOK_PORT

3. Webhook endpoint for incoming messages:
   - POST /whatsapp/incoming
   - Validate Twilio signature
   - Parse form-encoded payload
   - Route to NanoClaw message handler

IMPLEMENTATION PLAN:

Phase 1 (MVP):
- Create TwilioWhatsAppChannel class
- Implement webhook server
- Implement sendMessage via Twilio REST API
- Add JID mapping utilities
- Test with Twilio Sandbox

Phase 2 (Feature Parity):
- Group messages
- Media messages (images, documents)
- Message status tracking
- WhatsApp Business Profile

Phase 3 (Production):
- Webhook signature validation
- Rate limiting and retry logic
- Error handling
- Documentation and migration guide

DEPENDENCIES:
- twilio (npm) - Official Twilio SDK
- express - Webhook server
- Public webhook URL (ngrok for dev, real domain for prod)

TESTING:
- Sandbox: Free Twilio account, join sandbox, no approval needed
- Production: WhatsApp Business approval, message templates

COST:
- Free tier: 5.50 credit (~1000 messages)
- Production: /bin/sh.005 per message

REFERENCES:
- Twilio WhatsApp API Quickstart: twilio.com/docs/whatsapp/quickstart
- Twilio WhatsApp API Overview: twilio.com/docs/whatsapp/api
- NanoClaw uses Baileys: github.com/qwibitai/nanoclaw
- Current implementation: src/channels/whatsapp.ts
