# Adapter Implementation Guide

**Date:** 2026-07-24
**Status:** Reference for implementing production adapters
**Audience:** Backend developers implementing external service integrations

---

## Overview

This guide documents how to implement production adapters for EduAI Nepal's port-based architecture. All external service integrations (WhatsApp, Anthropic, Cloudflare R2, Upstash Redis, Twilio) follow the **Ports & Adapters pattern** to maintain clean architecture boundaries.

**Current Status:**
- ✅ Port interfaces defined (5/5)
- ✅ Stub adapters working (5/5)
- ⬜ Production adapters implemented (0/5) — **DEFERRED until credentials available**

---

## Architecture Principles

### 1. Ports & Adapters Pattern

**Port (Interface):** Defines what the application needs from an external service.
**Adapter (Implementation):** Provides concrete implementation using a specific technology.

```typescript
// Port: What the app needs
export interface MessagingProviderPort {
  sendInviteToken(opts: { recipient: string; inviteToken: string }): Promise<void>;
}

// Adapter: How WhatsApp implements it
@Injectable()
export class WhatsAppCloudApiAdapter implements MessagingProviderPort {
  async sendInviteToken(opts) {
    // WhatsApp-specific implementation
  }
}
```

### 2. Port Interface Requirements

Every port interface must:
- Be defined in `apps/api/src/shared/ports/`
- Export a symbol for DI: `export const PORT_NAME = Symbol('PORT_NAME');`
- Document parameters and return types with JSDoc
- Specify error handling expectations
- Include usage examples

### 3. Adapter Implementation Requirements

Every adapter must:
- Implement the port interface completely
- Be a NestJS `@Injectable()` service
- Handle errors gracefully (throw meaningful exceptions)
- Log operations using NestJS Logger
- Include configuration via environment variables
- Provide comprehensive unit tests

### 4. Environment Variable Conventions

```bash
# Service-specific prefix (e.g., WHATSAPP_, ANTHROPIC_, R2_)
SERVICE_API_KEY=...
SERVICE_API_VERSION=...
SERVICE_ENDPOINT_URL=...

# Feature flags (optional)
SERVICE_ENABLED=true
SERVICE_TIMEOUT_MS=30000
```

---

## Existing Port Interfaces

### 1. MessagingProviderPort

**Location:** `apps/api/src/shared/ports/messaging-provider.port.ts`

**Purpose:** Send messages via WhatsApp (primary) and SMS (fallback)

**Methods:**
- `sendInviteToken(opts)` - Send invite token for account setup
- `sendRecoveryOtp(opts)` - Send OTP for password recovery
- `sendAttendanceConfirmation(opts)` - Notify guardian of attendance
- `sendReportDraft(opts)` - Deliver parent report
- `sendRemedialActivity(opts)` - Share remedial activity with guardian

**Production Adapter:** WhatsAppCloudApiAdapter (deferred)

**Environment Variables:**
```bash
WHATSAPP_API_VERSION=v21.0
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_ACCESS_TOKEN=EAAG...
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321
```

**Testing Strategy:**
- Unit tests with mocked HTTP client
- Integration tests with WhatsApp sandbox
- E2E tests with test phone numbers

---

### 2. AiProviderPort

**Location:** `apps/api/src/shared/ports/ai-provider.port.ts`

**Purpose:** Generate AI completions (Haiku for interactive, Sonnet for narrative)

**Methods:**
- `complete(opts)` - Generate completion from prompt template
- `streamComplete(opts)` - Stream completion for real-time responses

**Production Adapter:** AnthropicAdapter (deferred)

**Environment Variables:**
```bash
ANTHROPIC_API_KEY=sk-ant-api...
ANTHROPIC_HAIKU_MODEL=claude-3-5-haiku-latest
ANTHROPIC_SONNET_MODEL=claude-3-5-sonnet-latest
```

**Testing Strategy:**
- Unit tests with mocked API responses
- Integration tests with test API key
- Cost tracking via Axiom logging

---

### 3. StoragePort

**Location:** `apps/api/src/shared/ports/storage.port.ts`

**Purpose:** Upload/retrieve files (photos, PDFs, DOCX)

**Methods:**
- `uploadFile(bucket, key, content, contentType)` - Upload file
- `getSignedUrl(bucket, key, expiresIn)` - Generate temporary access URL
- `deleteFile(bucket, key)` - Delete file
- `fileExists(bucket, key)` - Check if file exists
- `listFiles(bucket, prefix)` - List files with prefix

**Production Adapter:** CloudflareR2Adapter (deferred)

**Environment Variables:**
```bash
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret
R2_BUCKET_NAME=eduai-files
R2_PUBLIC_BASE_URL=https://files.eduai.example.com
```

**Testing Strategy:**
- Unit tests with mocked S3 client
- Integration tests with R2 test bucket
- Cleanup job for test files

---

### 4. CachePort

**Location:** `apps/api/src/shared/ports/cache.port.ts`

**Purpose:** Cache AI prompts and responses (30-day TTL)

**Methods:**
- `get(key)` - Retrieve cached value
- `set(key, value, ttl)` - Store value with TTL
- `delete(key)` - Remove cached value
- `exists(key)` - Check if key exists

**Production Adapter:** UpstashRedisAdapter (deferred)

**Environment Variables:**
```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
REDIS_CACHE_TTL_SECONDS=2592000  # 30 days
```

**Testing Strategy:**
- Unit tests with mocked Redis client
- Integration tests with Upstash test database
- Cache hit rate monitoring via Axiom

---

### 5. OtpFallbackPort

**Location:** `apps/api/src/shared/ports/otp-fallback.port.ts`

**Purpose:** Send OTP via SMS when WhatsApp fails

**Methods:**
- `sendOtp(phoneNumber, otp)` - Send OTP via SMS
- `verifyOtp(phoneNumber, otp)` - Verify OTP code

**Production Adapter:** TwilioSmsAdapter (deferred)

**Environment Variables:**
```bash
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=your-token
TWILIO_VERIFY_SERVICE_SID=VAxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

**Testing Strategy:**
- Unit tests with mocked Twilio client
- Integration tests with test phone numbers
- Rate limiting tests

---

## Implementation Workflow

### Step 1: Review Port Interface

Read the port interface carefully:
```typescript
// apps/api/src/shared/ports/messaging-provider.port.ts
export interface MessagingProviderPort {
  /**
   * Send invite token to user via WhatsApp or SMS
   * @throws {MessagingError} If delivery fails
   */
  sendInviteToken(opts: {
    recipient: string;
    inviteToken: string;
    channel: 'whatsapp' | 'sms';
  }): Promise<void>;
}
```

### Step 2: Create Adapter File

Create adapter in `apps/api/src/modules/<module>/adapters/`:

```typescript
// apps/api/src/modules/messaging/adapters/whatsapp-cloud-api.adapter.ts
import { Injectable, Logger } from '@nestjs/common';
import { MessagingProviderPort } from '@/shared/ports/messaging-provider.port';

@Injectable()
export class WhatsAppCloudApiAdapter implements MessagingProviderPort {
  private readonly logger = new Logger(WhatsAppCloudApiAdapter.name);
  private readonly apiUrl: string;
  private readonly accessToken: string;

  constructor() {
    this.apiUrl = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION}`;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';

    if (!this.accessToken) {
      this.logger.warn('WHATSAPP_ACCESS_TOKEN not set — adapter will fail at runtime');
    }
  }

  async sendInviteToken(opts: {
    recipient: string;
    inviteToken: string;
    channel: 'whatsapp' | 'sms';
  }): Promise<void> {
    this.logger.log(`Sending invite token to ${opts.recipient} via ${opts.channel}`);

    const response = await fetch(
      `${this.apiUrl}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: opts.recipient,
          type: 'template',
          template: {
            name: 'invite_token',
            language: { code: 'ne' },
            components: [
              {
                type: 'body',
                parameters: [{ type: 'text', text: opts.inviteToken }],
              },
            ],
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
    }

    this.logger.log(`Invite token sent successfully to ${opts.recipient}`);
  }
}
```

### Step 3: Write Unit Tests

Create test file alongside adapter:

```typescript
// whatsapp-cloud-api.adapter.spec.ts
import { Test } from '@nestjs/testing';
import { WhatsAppCloudApiAdapter } from './whatsapp-cloud-api.adapter';

describe('WhatsAppCloudApiAdapter', () => {
  let adapter: WhatsAppCloudApiAdapter;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [WhatsAppCloudApiAdapter],
    }).compile();

    adapter = module.get(WhatsAppCloudApiAdapter);
  });

  it('should send invite token successfully', async () => {
    // Mock fetch globally
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    await expect(
      adapter.sendInviteToken({
        recipient: '+9779812345678',
        inviteToken: 'ABC123',
        channel: 'whatsapp',
      }),
    ).resolves.not.toThrow();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/messages'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': expect.stringContaining('Bearer'),
        }),
      }),
    );
  });

  it('should throw on API error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Invalid token' } }),
    });

    await expect(
      adapter.sendInviteToken({
        recipient: '+9779812345678',
        inviteToken: 'ABC123',
        channel: 'whatsapp',
      }),
    ).rejects.toThrow('WhatsApp API error');
  });
});
```

### Step 4: Register in Module

Update the module to provide the production adapter:

```typescript
// apps/api/src/modules/messaging/messaging.module.ts
import { Module } from '@nestjs/common';
import { MESSAGING_PROVIDER_PORT } from '@/shared/ports/messaging-provider.port';
import { WhatsAppCloudApiAdapter } from './adapters/whatsapp-cloud-api.adapter';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';

@Module({
  providers: [
    {
      provide: MESSAGING_PROVIDER_PORT,
      useClass: WhatsAppCloudApiAdapter,
    },
    MessagingService,
  ],
  controllers: [MessagingController],
  exports: [MessagingService],
})
export class MessagingModule {}
```

### Step 5: Integration Testing

Test with real service (sandbox/test environment):

```bash
# Set environment variables
export WHATSAPP_API_VERSION=v21.0
export WHATSAPP_PHONE_NUMBER_ID=<test-phone-id>
export WHATSAPP_ACCESS_TOKEN=<test-token>

# Run integration tests
pnpm --filter @eduai/api test messaging.integration.spec.ts
```

---

## Error Handling Patterns

### 1. Network Errors

```typescript
async sendMessage(opts) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    this.logger.error('WhatsApp API error:', error);
    throw new MessagingError('Failed to send message', { cause: error });
  }
}
```

### 2. Rate Limiting

```typescript
async sendMessage(opts) {
  const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
  if (Number(rateLimitRemaining) < 10) {
    this.logger.warn(`WhatsApp rate limit low: ${rateLimitRemaining} remaining`);
  }
}
```

### 3. Retry Logic

```typescript
async sendMessageWithRetry(opts, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await this.sendMessage(opts);
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const backoffMs = Math.pow(2, attempt) * 1000; // Exponential backoff
      this.logger.warn(`Retry ${attempt}/${maxRetries} after ${backoffMs}ms`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}
```

---

## Observability Integration

### 1. Structured Logging with Axiom

```typescript
constructor(private readonly axiomLogger: AxiomLoggerService) {}

async sendMessage(opts) {
  const startTime = Date.now();

  try {
    const result = await fetch(...);

    await this.axiomLogger.log('whatsapp_message_sent', {
      recipient: opts.recipient,
      template: opts.template,
      latencyMs: Date.now() - startTime,
      success: true,
    });

    return result;
  } catch (error) {
    await this.axiomLogger.log('whatsapp_message_failed', {
      recipient: opts.recipient,
      error: error.message,
      latencyMs: Date.now() - startTime,
      success: false,
    });
    throw error;
  }
}
```

### 2. Sentry Error Tracking

```typescript
import * as Sentry from '@sentry/node';

async sendMessage(opts) {
  try {
    return await fetch(...);
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        adapter: 'WhatsAppCloudApi',
        operation: 'sendMessage',
      },
      extra: {
        recipient: opts.recipient,
        template: opts.template,
      },
    });
    throw error;
  }
}
```

---

## Testing Strategy

### 1. Unit Tests (Required)

- Mock external HTTP calls
- Test all interface methods
- Verify error handling
- Check logging calls

### 2. Integration Tests (Recommended)

- Use sandbox/test environment
- Test actual API interactions
- Verify webhook handling
- Check rate limiting behavior

### 3. E2E Tests (Optional)

- Test full user flows
- Verify message delivery
- Check notification timing
- Test fallback mechanisms

---

## Deployment Checklist

Before deploying a production adapter:

- [ ] All interface methods implemented
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing (sandbox)
- [ ] Environment variables documented in `.env.example`
- [ ] Error handling comprehensive
- [ ] Logging integrated (Logger + Axiom)
- [ ] Sentry error tracking configured
- [ ] Rate limiting handled
- [ ] Retry logic implemented
- [ ] Timeouts configured
- [ ] Security: credentials not logged
- [ ] Performance: operations < 5s timeout
- [ ] Monitoring: key metrics logged to Axiom

---

## FAQ

### Q: When should I create a new port?

**A:** Only when integrating a genuinely new external service category. Don't create ports for internal modules or databases — use direct imports for those.

### Q: Can I have multiple adapters for one port?

**A:** Yes! For example, `OtpFallbackPort` could have both `TwilioSmsAdapter` and `MSG91Adapter`, switched via environment variable.

### Q: Should I add caching inside adapters?

**A:** No. Caching logic belongs in the service layer. Adapters should be thin wrappers around external APIs.

### Q: How do I test locally without credentials?

**A:** Use the stub adapters (console logging). They're already registered in modules and work without credentials.

### Q: What if the external API changes?

**A:** Update the adapter implementation. The port interface should remain stable. If the API changes fundamentally, consider creating a new adapter version rather than modifying the existing one.

---

## Next Steps

1. Review port interfaces in `apps/api/src/shared/ports/`
2. Implement stub adapters first (console logging)
3. Write unit tests for stub adapters
4. When credentials available, implement production adapters
5. Test in sandbox environment
6. Deploy to staging
7. Monitor metrics via Axiom
8. Deploy to production

---

**Last Updated:** 2026-07-24
**Maintainer:** Backend team
**Related Docs:** `ARCHITECTURE.md` Part 1, `CLAUDE.md` Section 3
