# Notifications & Voice

## V1: Native macOS Notifications

When the PM needs a decision and the user isn't looking at the app.

### How it works
- Electron's `Notification` API (built-in, no external service needed)
- Shows a native macOS notification banner
- Clicking the notification opens the TWEEBS app and focuses the Chat view

### When to notify
The PM triggers a notification when:
1. A worker is blocked and needs a human decision
2. A major milestone is complete ("Your website is ready")
3. All work is done ("Project complete")

The PM does NOT notify for:
- Routine status updates
- Non-blocking progress
- Rate limit pauses (these resolve automatically)

### Notification format
Short, matches PM personality:
```
TWEEBS — Need a decision
Hamburger menu or sidebar nav? Open the app to respond.
```

```
TWEEBS — Project complete
Your portfolio site is ready. Open the app to see it.
```

### Implementation
```typescript
// Main process — triggered by PM's request_decision command
new Notification({
  title: 'TWEEBS — Need a decision',
  body: question,
  silent: false
}).show();
```

No Twilio. No phone numbers. No server-side infrastructure. Just the OS notification system.

## V2: SMS Notifications

For users who want text messages when they're away from their Mac.

- User provides phone number in Settings
- Requires a Twilio integration (TWEEBS-hosted or user's own credentials)
- This contradicts the "no cloud services" V1 principle, which is why it's V2
- Two-way SMS (user replies to unblock) is a V2+ feature

## V2: Voice Output (Kokoro TTS)

Local text-to-speech for the PM's messages.

- **Voice**: Flat affect, matches PM personality
- **Engine**: Kokoro — runs locally, no API costs, no data leaving the machine
- **Trigger**: Toggle in Settings. When enabled, new PM messages auto-play.
- **Implementation**: Kokoro process → audio buffer → Web Audio API in renderer

Not in V1 because:
- Adds a native dependency that complicates Electron packaging
- PM personality works well in text
- Can be added without changing any architecture

## V2: Voice Input

Dictate messages to the PM instead of typing.

- **Web Speech API**: Built into Chromium/Electron. Push-to-talk button in Chat UI.
- **Whisper** (alternative): Higher accuracy for technical terms, runs locally via whisper.cpp
- Transcribed text sent as a normal chat message

Not in V1 — text input is sufficient.

## V3: Animated PM Avatar

Nano-banana (or similar) for face animation:
- PM's avatar gets animated mouth/eyes while speaking
- Synced to TTS audio output
- Makes the PM feel like a character, not a chatbot
