import connectDB from '@/lib/mongodb';
import Customer from '@/lib/models/Customer';
import { smsService } from '@/lib/sms';
import { normalizeKenyaPhoneLocal } from '@/lib/phone-utils';
import { applySmsTemplate, DEFAULT_SMS_TEMPLATES } from '@/lib/sms-template-defs';
import { renderSmsTemplate } from '@/lib/sms-templates';

function kenyaYearBounds(year: number) {
  const start = new Date(`${year}-01-01T00:00:00+03:00`);
  const end = new Date(`${year}-12-31T23:59:59.999+03:00`);
  return { start, end };
}

function currentKenyaYear() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
  }).formatToParts(new Date());
  return Number(parts.find((part) => part.type === 'year')?.value || new Date().getFullYear());
}

function formatKenyaDate(value: Date | string | undefined) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDiscount(promotion: {
  discount?: number;
  discountType?: string;
}) {
  const amount = Number(promotion.discount) || 0;
  if (promotion.discountType === 'fixed') {
    return `KSh ${amount.toLocaleString('en-KE')} off`;
  }
  return `${amount}% off`;
}

function promotionVars(promotion: {
  title?: string;
  promoCode?: string;
  description?: string;
  discount?: number;
  discountType?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  minOrderAmount?: number;
}) {
  const title = String(promotion.title || 'Special offer').trim();
  const code = String(promotion.promoCode || '').trim().toUpperCase();
  const start = formatKenyaDate(promotion.startDate);
  const end = formatKenyaDate(promotion.endDate);
  const minOrder = Number(promotion.minOrderAmount) || 0;
  const description = String(promotion.description || '').trim();
  const shortDescription =
    description && description.toLowerCase() !== title.toLowerCase()
      ? description.length > 90
        ? `${description.slice(0, 87).trim()}...`
        : description
      : '';

  return {
    title,
    description: shortDescription,
    code,
    discount: formatDiscount(promotion),
    valid: start && end ? `${start} - ${end}` : start || end,
    min_order: minOrder > 0 ? `KSh ${minOrder.toLocaleString('en-KE')}` : '',
  };
}

export function formatPromotionAnnouncementMessage(promotion: {
  title?: string;
  promoCode?: string;
  description?: string;
  discount?: number;
  discountType?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  minOrderAmount?: number;
}) {
  return applySmsTemplate(DEFAULT_SMS_TEMPLATES.promotion, promotionVars(promotion));
}

export async function sendPromotionToYearClients(promotion: {
  title?: string;
  promoCode?: string;
  description?: string;
  discount?: number;
  discountType?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  minOrderAmount?: number;
}) {
  const year = currentKenyaYear();
  const { start, end } = kenyaYearBounds(year);

  await connectDB();
  const customers = await Customer.find(
    { createdAt: { $gte: start, $lte: end } },
    { phone: 1 }
  )
    .lean()
    .maxTimeMS(20000);

  const phones = [
    ...new Set(
      customers
        .map((customer: { phone?: string }) => normalizeKenyaPhoneLocal(customer.phone) || '')
        .filter(Boolean)
    ),
  ];

  if (phones.length === 0) {
    return {
      sent: 0,
      failed: 0,
      skipped: 0,
      year,
      totalClients: customers.length,
      reason: 'no_valid_phones',
    };
  }

  const message = await renderSmsTemplate('promotion', promotionVars(promotion));
  const result = await smsService.sendBulkSMS(phones, message);

  return {
    ...result,
    year,
    totalClients: phones.length,
  };
}
