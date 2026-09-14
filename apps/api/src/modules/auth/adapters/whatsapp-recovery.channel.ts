import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthDomainError } from '../core/auth-error.js';
import type { RecoveryChannel } from '../core/recovery-ports.js';

@Injectable()
export class WhatsAppRecoveryChannel implements RecoveryChannel {
  constructor(private readonly config: ConfigService) {}

  async sendVerificationCode(input: { phone: string; code: string }): Promise<void> {
    const url = this.config.get<string>('WHATSAPP_RECOVERY_WEBHOOK_URL');
    const token = this.config.get<string>('WHATSAPP_RECOVERY_WEBHOOK_TOKEN');
    if (!url || !token) throw new AuthDomainError('FEATURE_DISABLED', 'WhatsApp password recovery is not configured.');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone: input.phone, code: input.code }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`WhatsApp recovery channel failed with status ${response.status}`);
  }
}
