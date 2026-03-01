# Notifications & Voice

## SMS Notifications

When the PM needs a decision from the user and they're not looking at the app.

### Setup
- User provides phone number in Settings (optional)
- Stored in SQLite settings table
- Twilio account configured server-side (TWEEBS uses a shared Twilio number, or user provides their own)

### When to Send
The PM triggers an SMS when:
1. A worker is blocked and needs a human decision
2. A major milestone is complete ("Your website is live")
3. All work is done ("Project complete")

The PM does NOT send SMS for:
- Routine status updates
- Non-blocking progress
- Anything the user will see when they next glance at the board

### Message Format
Short, direct, matches PM personality:

```
TWEEBS: Need a decision — hamburger menu or sidebar nav? Reply here or open the app.
```

```
TWEEBS: Your website is deployed. Check the app for the link.
```

### Reply Handling
V1: SMS is one-way (notification only). User opens the app to respond.
Future: Two-way SMS via Twilio webhooks — user can reply directly.

## Voice Output (TTS)

### Kokoro
Local text-to-speech engine. Runs on-device, no cloud API.

- **Voice**: Flat affect by default. Matches the PM's terse personality.
- **Trigger**: PM messages can optionally be spoken aloud.
- **Toggle**: User enables/disables in Settings. When enabled, new PM messages auto-play.
- **Implementation**: Kokoro runs as a local process. Text in → audio buffer out → play via Web Audio API in renderer.

### Why Kokoro
- Local, no API costs per TTS call
- Fast enough for real-time playback
- Flat/neutral voice fits the grumpy PM character
- No privacy concerns — text never leaves the machine

## Voice Input

### Web Speech API
- Built into Chromium (Electron's renderer has it)
- Push-to-talk button in the Chat UI
- Transcribed text sent as a normal chat message to PM
- No additional setup needed

### Whisper (Alternative)
- Higher accuracy, especially for technical terms
- Runs locally via whisper.cpp or similar
- More setup, more resources
- Consider as an upgrade if Web Speech API accuracy is insufficient

## Future: Animated PM Avatar

Nano-banana (or similar) for face animation:
- PM's avatar (blue blob with headset) gets animated mouth/eyes while speaking
- Synced to TTS audio output
- Makes the PM feel like a real team member
- Not in V1 — shipped as a follow-up enhancement
