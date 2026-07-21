import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InitResult, VerifyResult } from './paystack.adapter';

const FLW_BASE = 'https://api.flutterwave.com/v3';

@Injectable()
export class FlutterwaveAdapter {
  private readonly logger = new Logger('Flutterwave');

  constructor(private readonly config: ConfigService) {}

  private get secret(): string {
    return this.config.get<string>('flutterwave.secretKey') || '';
  }

  /** Flutterwave expects amounts in MAJOR units, so convert from minor. */
  async initialize(params: {
    email: string;
    amountMinor: number;
    reference: string;
    currency: string;
    redirectUrl: string;
  }): Promise<InitResult> {
    const res = await this.post('/payments', {
      tx_ref: params.reference,
      amount: params.amountMinor / 100,
      currency: params.currency,
      redirect_url: params.redirectUrl,
      customer: { email: params.email },
    });
    if (res?.status !== 'success') {
      throw new ServiceUnavailableException(
        `Flutterwave init failed: ${res?.message ?? 'unknown error'}`,
      );
    }
    return {
      authorizationUrl: res.data.link,
      reference: params.reference,
      raw: res,
    };
  }

  /** Verify by tx_ref (the reference we generated = order-scoped). */
  async verify(reference: string): Promise<VerifyResult> {
    const res = await this.get(
      `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
    );
    const data = res?.data;
    return {
      success: res?.status === 'success' && data?.status === 'successful',
      amountMinor: data?.amount ? Math.round(data.amount * 100) : 0,
      currency: data?.currency ?? 'NGN',
      raw: res,
    };
  }

  /** Flutterwave webhooks carry a `verif-hash` header equal to a preset secret. */
  verifyWebhookSignature(signature?: string): boolean {
    const hash = this.config.get<string>('flutterwave.webhookHash') || '';
    return !!hash && !!signature && signature === hash;
  }

  private async post(path: string, body: any) {
    return this.request('POST', path, body);
  }

  private async get(path: string) {
    return this.request('GET', path);
  }

  private async request(method: string, path: string, body?: any) {
    if (!this.secret) {
      throw new ServiceUnavailableException('Flutterwave secret key not configured');
    }
    try {
      const res = await fetch(`${FLW_BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.secret}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return await res.json();
    } catch (err: any) {
      this.logger.error(`Flutterwave request failed: ${err.message}`);
      throw new ServiceUnavailableException('Payment provider unavailable');
    }
  }
}
