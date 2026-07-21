import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

const PAYSTACK_BASE = 'https://api.paystack.co';

export interface InitResult {
  authorizationUrl: string;
  reference: string;
  raw: any;
}

export interface VerifyResult {
  success: boolean;
  amountMinor: number;
  currency: string;
  raw: any;
}

@Injectable()
export class PaystackAdapter {
  private readonly logger = new Logger('Paystack');

  constructor(private readonly config: ConfigService) {}

  private get secret(): string {
    return this.config.get<string>('paystack.secretKey') || '';
  }

  /** Amount is in kobo (minor units) — Paystack expects minor units directly. */
  async initialize(params: {
    email: string;
    amountMinor: number;
    reference: string;
    currency: string;
    callbackUrl: string;
  }): Promise<InitResult> {
    const res = await this.post('/transaction/initialize', {
      email: params.email,
      amount: params.amountMinor,
      reference: params.reference,
      currency: params.currency,
      callback_url: params.callbackUrl,
    });
    if (!res?.status) {
      throw new ServiceUnavailableException(
        `Paystack init failed: ${res?.message ?? 'unknown error'}`,
      );
    }
    return {
      authorizationUrl: res.data.authorization_url,
      reference: res.data.reference,
      raw: res,
    };
  }

  async verify(reference: string): Promise<VerifyResult> {
    const res = await this.get(`/transaction/verify/${encodeURIComponent(reference)}`);
    const data = res?.data;
    return {
      success: res?.status === true && data?.status === 'success',
      amountMinor: data?.amount ?? 0,
      currency: data?.currency ?? 'NGN',
      raw: res,
    };
  }

  /** Paystack signs webhooks with HMAC-SHA512 of the raw body using the secret. */
  verifyWebhookSignature(rawBody: Buffer, signature?: string): boolean {
    if (!signature || !this.secret) return false;
    const computed = createHmac('sha512', this.secret).update(rawBody).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  private async post(path: string, body: any) {
    return this.request('POST', path, body);
  }

  private async get(path: string) {
    return this.request('GET', path);
  }

  private async request(method: string, path: string, body?: any) {
    if (!this.secret) {
      throw new ServiceUnavailableException('Paystack secret key not configured');
    }
    try {
      const res = await fetch(`${PAYSTACK_BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.secret}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return await res.json();
    } catch (err: any) {
      this.logger.error(`Paystack request failed: ${err.message}`);
      throw new ServiceUnavailableException('Payment provider unavailable');
    }
  }
}
