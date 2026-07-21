import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Payment } from './entities/payment.entity';
import { Order } from '../commerce/entities/order.entity';
import { ExamProduct } from '../exam-catalog/entities/exam-product.entity';
import { PaystackAdapter } from './providers/paystack.adapter';
import { FlutterwaveAdapter } from './providers/flutterwave.adapter';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { UsersService } from '../users/users.service';
import {
  ItemType,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
} from '../common/enums';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('Payments');

  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(ExamProduct)
    private readonly products: Repository<ExamProduct>,
    private readonly paystack: PaystackAdapter,
    private readonly flutterwave: FlutterwaveAdapter,
    private readonly entitlements: EntitlementsService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  async getUserEmail(userId: string): Promise<string> {
    const user = await this.users.findById(userId);
    return user.email;
  }

  // ── Initialize provider checkout ──────────────────
  async initialize(order: Order, provider: PaymentProvider, email: string) {
    const reference = `ACE-${order.id}-${randomBytes(4).toString('hex')}`;
    const amountMinor = Number(order.totalMinor);

    await this.payments.save(
      this.payments.create({
        orderId: order.id,
        provider,
        providerReference: reference,
        amountMinor,
        currency: order.currency,
        status: PaymentStatus.INITIALIZED,
      }),
    );

    order.provider = provider;
    order.providerReference = reference;
    await this.orders.save(order);

    const frontend = this.config.get<string>('frontendBaseUrl');
    const callbackUrl = `${frontend}/checkout/callback?ref=${reference}`;

    let init;
    if (provider === PaymentProvider.PAYSTACK) {
      init = await this.paystack.initialize({
        email,
        amountMinor,
        reference,
        currency: order.currency,
        callbackUrl,
      });
    } else {
      init = await this.flutterwave.initialize({
        email,
        amountMinor,
        reference,
        currency: order.currency,
        redirectUrl: callbackUrl,
      });
    }

    return {
      orderId: order.id,
      provider,
      reference,
      checkoutUrl: init.authorizationUrl,
    };
  }

  // ── Webhooks ──────────────────────────────────────
  async handlePaystackWebhook(rawBody: Buffer, signature?: string) {
    if (!this.paystack.verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn('Rejected Paystack webhook — bad signature');
      return { received: false };
    }
    const event = JSON.parse(rawBody.toString('utf8'));
    if (event?.event === 'charge.success') {
      const reference = event?.data?.reference;
      if (reference) await this.fulfill(reference, PaymentProvider.PAYSTACK);
    }
    return { received: true };
  }

  async handleFlutterwaveWebhook(payload: any, signature?: string) {
    if (!this.flutterwave.verifyWebhookSignature(signature)) {
      this.logger.warn('Rejected Flutterwave webhook — bad signature');
      return { received: false };
    }
    const status = payload?.data?.status ?? payload?.status;
    const reference = payload?.data?.tx_ref ?? payload?.txRef;
    if (reference && (status === 'successful' || payload?.event === 'charge.completed')) {
      await this.fulfill(reference, PaymentProvider.FLUTTERWAVE);
    }
    return { received: true };
  }

  /**
   * Idempotent fulfillment keyed on provider_reference. Re-verifies with the
   * provider server-side before granting anything (PRD §7).
   */
  async fulfill(reference: string, provider: PaymentProvider) {
    const payment = await this.payments.findOne({
      where: { providerReference: reference },
    });
    if (!payment) {
      this.logger.warn(`Fulfill: no payment for reference ${reference}`);
      return;
    }
    if (payment.status === PaymentStatus.SUCCESS) {
      return; // already processed — idempotent no-op
    }

    const verify =
      provider === PaymentProvider.PAYSTACK
        ? await this.paystack.verify(reference)
        : await this.flutterwave.verify(reference);

    payment.rawPayload = verify.raw;
    if (!verify.success) {
      payment.status = PaymentStatus.FAILED;
      await this.payments.save(payment);
      return;
    }

    payment.status = PaymentStatus.SUCCESS;
    payment.verifiedAt = new Date();
    await this.payments.save(payment);

    const order = await this.orders.findOne({ where: { id: payment.orderId } });
    if (!order) return;
    if (order.status === OrderStatus.PAID) return; // already fulfilled

    order.status = OrderStatus.PAID;
    order.paidAt = new Date();
    await this.orders.save(order);

    await this.grantEntitlements(order);
    this.logger.log(`Order ${order.id} paid & fulfilled via ${provider}.`);
  }

  private async grantEntitlements(order: Order) {
    for (const item of order.items) {
      let durationDays: number | null = null;
      if (item.itemType === ItemType.EXAM_PRODUCT) {
        const product = await this.products.findOne({
          where: { id: item.itemId },
        });
        durationDays = product?.accessDurationDays ?? 90;
      }
      await this.entitlements.grant({
        userId: order.userId,
        itemType: item.itemType,
        itemId: item.itemId,
        orderId: order.id,
        durationDays,
      });
    }
  }

  // ── Reconciliation (stuck pending orders) ─────────
  async reconcile(order: Order) {
    if (order.status !== OrderStatus.PENDING || !order.providerReference) return order;
    await this.fulfill(order.providerReference, order.provider!);
    return this.orders.findOne({ where: { id: order.id } });
  }
}
