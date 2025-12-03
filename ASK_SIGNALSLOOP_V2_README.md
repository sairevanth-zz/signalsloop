# Ask SignalsLoop V2 - Implementation Guide

## Overview

Ask SignalsLoop V2 is a major enhancement to the existing Ask feature, adding:
- **Voice Input**: Record voice queries using Whisper API transcription
- **Action Execution**: Detect and execute actions like creating specs, generating reports, etc.
- **Proactive Suggestions**: AI-generated suggestions based on detected patterns
- **Scheduled Queries**: Recurring questions delivered via email/Slack

## Architecture

### Components Structure

```
src/
├── app/api/ask/
│   ├── transcribe/route.ts          # Whisper API transcription
│   ├── actions/execute/route.ts     # Action execution
│   └── stream/route.ts              # Existing streaming chat (enhanced)
├── components/ask/
│   ├── VoiceInputButton.tsx         # Voice recording UI
│   ├── ActionConfirmation.tsx       # Action confirmation dialog
│   └── ChatInput.tsx                # Enhanced with voice input
├── hooks/
│   └── useVoiceRecording.ts         # MediaRecorder hook
├── lib/ask/
│   ├── action-router.ts             # Action intent detection
│   └── action-executor.ts           # Action execution logic
├── types/
│   └── ask.ts                       # Extended with V2 types
└── migrations/
    └── 202512031200_ask_signalsloop_v2.sql  # Database schema
```

## Features

### 1. Voice Input

**What it does:**
- Records audio from user's microphone
- Transcribes using OpenAI Whisper API
- Populates text input with transcription

**How to use:**
1. Click the microphone icon in the chat input
2. Allow microphone permissions if prompted
3. Speak your query (max 2 minutes by default)
4. Click the stop button or wait for auto-stop
5. Transcription appears in the text input

**Implementation details:**
- Uses MediaRecorder API for recording
- Supports multiple audio formats (WebM, MP4, OGG, WAV)
- Real-time duration display
- Auto-stop at max duration
- Error handling for permissions and API failures

**Files:**
- `/src/hooks/useVoiceRecording.ts` - Recording logic
- `/src/components/ask/VoiceInputButton.tsx` - UI component
- `/src/app/api/ask/transcribe/route.ts` - API endpoint

### 2. Action Execution

**What it does:**
- Detects when a query requires an action (e.g., "Create a spec for dark mode")
- Shows confirmation dialog with extracted parameters
- Executes the action after user confirmation
- Displays results inline

**Supported actions:**
1. **create_spec** - Create a product specification
2. **escalate_issue** - Escalate a feedback item to higher priority
3. **generate_report** - Generate a report on a topic
4. **create_roadmap_item** - Add an item to the product roadmap
5. **send_notification** - Send notifications to stakeholders
6. **schedule_query** - Schedule a recurring query

**How it works:**
1. User types a query like "Create a spec for user authentication"
2. GPT-4o detects this is an action intent
3. Confirmation dialog shows with parameters
4. User clicks "Confirm"
5. Action is executed (e.g., creates a spec in the database)
6. Result is displayed with a link to the created resource

**Implementation details:**
- Uses GPT-4o-mini for intent detection (cost-effective)
- Confidence scoring (warns if < 0.8)
- Parameter extraction from natural language
- Action execution log in database
- Rollback capability on failure

**Files:**
- `/src/lib/ask/action-router.ts` - Intent detection
- `/src/lib/ask/action-executor.ts` - Execution logic
- `/src/components/ask/ActionConfirmation.tsx` - UI component
- `/src/app/api/ask/actions/execute/route.ts` - API endpoint

### 3. Scheduled Queries

**What it does:**
- Schedule recurring queries (daily, weekly, monthly)
- Deliver results via email or Slack
- Manage schedules (pause, edit, delete)

**How to use:**
1. Say "Send me weekly sentiment reports"
2. Confirm the scheduled query
3. Results will be delivered automatically

**Database schema:**
- `ask_scheduled_queries` table
- Automatic next_run_at calculation
- Cron job processor (to be implemented)

### 4. Proactive Suggestions

**What it does:**
- AI detects patterns (sentiment drops, theme spikes, churn risks)
- Generates suggestions with query recommendations
- User can act on or dismiss suggestions

**Types of suggestions:**
- `sentiment_drop` - Negative sentiment increase detected
- `theme_spike` - Sudden increase in theme mentions
- `churn_risk` - Churn indicators detected
- `opportunity` - Growth opportunity identified
- `competitor_move` - Competitor launched similar feature

**Database schema:**
- `ask_proactive_suggestions` table
- Priority levels (low, medium, high, critical)
- Expiration dates for time-sensitive suggestions

## Database Schema

### New Tables

**ask_scheduled_queries**
- Stores recurring queries
- Frequency: daily, weekly, monthly
- Delivery method: email, slack, both
- Next run time calculated automatically

**ask_action_executions**
- Logs all action executions
- Tracks status, duration, results
- Links to messages that triggered actions

**ask_proactive_suggestions**
- AI-generated suggestions
- Priority and status tracking
- Context data for suggestion generation

### Extended Tables

**ask_messages**
- Added voice input fields (is_voice_input, voice_transcript, voice_duration_seconds)
- Added action fields (action_executed, action_result, action_status)

## API Routes

### POST /api/ask/transcribe
Transcribes audio files using Whisper API

**Request:**
- FormData with 'audio' file (Blob or File)
- Optional 'language' parameter

**Response:**
```typescript
{
  success: boolean;
  transcription?: {
    text: string;
    duration: number;
    language?: string;
  };
  error?: string;
}
```

### POST /api/ask/actions/execute
Executes an action after user confirmation

**Request:**
```typescript
{
  messageId: string;
  projectId: string;
  actionType: ActionType;
  parameters: Record<string, any>;
}
```

**Response:**
```typescript
{
  success: boolean;
  result?: ActionResult;
  error?: string;
}
```

## Configuration

### Environment Variables

Add to `.env.local`:

```bash
# OpenAI (required for voice and actions)
OPENAI_API_KEY=sk-...

# Optional: Custom models
ASK_AI_MODEL=gpt-4o-mini
ASK_AI_FALLBACK_MODEL=gpt-4o
```

### Feature Flags (Future)

```typescript
// In project settings
{
  ask: {
    voice_enabled: true,
    actions_enabled: true,
    proactive_suggestions_enabled: true,
    scheduled_queries_enabled: true
  }
}
```

## Usage Examples

### Voice Input
```typescript
// In your chat component
import { VoiceInputButton } from '@/components/ask/VoiceInputButton';

<VoiceInputButton
  onTranscriptionComplete={(text, duration) => {
    setMessage(text);
  }}
  maxDurationSeconds={120}
/>
```

### Action Detection
```typescript
import { detectActionIntent } from '@/lib/ask/action-router';

const intent = await detectActionIntent(
  "Create a spec for dark mode",
  projectId
);

if (intent.requires_action) {
  // Show confirmation dialog
}
```

### Action Execution
```typescript
import { executeAction } from '@/lib/ask/action-executor';

const result = await executeAction(
  'create_spec',
  { feature_description: 'dark mode' },
  projectId,
  userId,
  messageId
);
```

## Testing

### Voice Input Testing
1. Grant microphone permissions
2. Click mic button
3. Say "What are the top feedback themes?"
4. Verify transcription appears

### Action Testing
1. Type "Create a spec for user authentication"
2. Verify confirmation dialog appears
3. Click "Confirm"
4. Verify spec is created in database
5. Verify link to spec works

### Test Queries

**Voice Test:**
- "Show me sentiment trends for the last week"
- "What are users saying about performance?"

**Action Tests:**
- "Create a spec for dark mode feature"
- "Generate a report on last month's feedback"
- "Escalate the login bug to high priority"
- "Add API v2 to Q2 roadmap"
- "Schedule weekly sentiment reports"

## Troubleshooting

### Voice Input Not Working

**Issue:** Microphone button doesn't appear
- **Fix:** Check browser support - requires MediaRecorder API
- **Supported:** Chrome, Firefox, Edge, Safari 14.1+

**Issue:** Recording fails with permission error
- **Fix:** Grant microphone permissions in browser settings
- Check for HTTPS (required for getUserMedia)

**Issue:** Transcription fails
- **Fix:** Check OpenAI API key is set
- Verify audio file size < 25MB
- Check audio format is supported

### Actions Not Executing

**Issue:** Action not detected
- **Fix:** Be explicit - "Create a spec for X" works better than "Write something about X"
- Check action detection prompt in `/src/lib/ask/action-router.ts`

**Issue:** Action fails to execute
- **Fix:** Check database permissions
- Verify user has access to project
- Check action executor logs

### Database Issues

**Issue:** Migration fails
- **Fix:** Run migration manually:
```bash
psql $DATABASE_URL < migrations/202512031200_ask_signalsloop_v2.sql
```

**Issue:** RLS policy blocking queries
- **Fix:** Verify user is member of project
- Check RLS policies in migration file

## Performance Considerations

### Voice Input
- Transcription latency: ~2-5 seconds for 30-second clip
- Max file size: 25MB (Whisper API limit)
- Caching: Not applicable (unique audio each time)

### Action Execution
- Intent detection: ~500ms (GPT-4o-mini)
- Action execution: Varies by action type
  - create_spec: ~3-5 seconds (GPT-4o generation)
  - escalate_issue: ~200ms (database update)
  - generate_report: ~5-10 seconds (GPT-4o generation)

### Optimization Tips
1. Use GPT-4o-mini for intent detection (10x cheaper)
2. Cache action detection results per query
3. Queue action executions for non-critical actions
4. Implement retry logic for API failures

## Security Considerations

### Voice Input
- Transcriptions are not stored permanently
- Audio files are not saved on server
- Transcripts are stored in ask_messages (encrypted at rest)

### Action Execution
- All actions require authentication
- Project access verified before execution
- Action execution log for audit trail
- Rate limiting on action endpoints (future)

### Data Privacy
- Voice transcripts follow same privacy policy as text messages
- Action results may contain sensitive data - check RLS policies
- Scheduled queries respect project access permissions

## Roadmap

### Near-term (Next 2-4 weeks)
- [ ] Add action retry mechanism
- [ ] Implement scheduled query cron job
- [ ] Build proactive suggestion generator
- [ ] Add action analytics dashboard

### Medium-term (Next 2-3 months)
- [ ] Support more action types (create ticket in Jira, etc.)
- [ ] Voice output (text-to-speech responses)
- [ ] Multi-language support for voice
- [ ] Action templates/macros

### Long-term (Next 6 months)
- [ ] Voice-to-voice mode (speak query, hear response)
- [ ] Custom action definitions (user-defined actions)
- [ ] Action workflows (chain multiple actions)
- [ ] Integration marketplace (Slack, Linear, Notion, etc.)

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review implementation files for code comments
3. Check console logs for detailed error messages
4. Open GitHub issue with reproduction steps

## Contributing

When adding new action types:
1. Add to ActionType enum in `/src/types/ask.ts`
2. Implement executor in `/src/lib/ask/action-executor.ts`
3. Update action detection prompt in `/src/lib/ask/action-router.ts`
4. Add tests
5. Update documentation

## License

Same as SignalsLoop main project.
