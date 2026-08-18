import connectDB from '@/lib/mongodb';
import SmsSettings from '@/lib/models/SmsSettings';

export const TXTLINK_BASE_URL = 'https://txtlink.co.ke/api/v1';
export const TXTLINK_SEND_URL = `${TXTLINK_BASE_URL}/sms/send`;
export const TXTLINK_BULK_URL = `${TXTLINK_BASE_URL}/sms/send-bulk`;

export type SmsConfigSource = 'admin' | 'env' | 'none';

export interface SmsRuntimeConfig {
  apiKey: string;
  senderIdName: string;
  enabled: boolean;
  source: SmsConfigSource;
  configured: boolean;
  dailyReportPhone: string;
  dailyReportEnabled: boolean;
  lastDailyReportDate: string;
  lastDailyReportAt: string | null;
}

export function maskSecret(value?: string | null) {
  const v = (value || '').trim();
  if (!v) return '';
  if (v.length <= 4) return '••••';
  return `••••••••${v.slice(-4)}`;
}

export function isMaskedSecret(value?: string | null) {
  const v = (value || '').trim();
  return !v || v.includes('•') || /^x{4,}/i.test(v);
}

export async function getSmsRuntimeConfig(): Promise<SmsRuntimeConfig> {
  await connectDB();
  const doc = await SmsSettings.findOne({ key: 'txtlink' }).lean() as {
    apiKey?: string;
    senderIdName?: string;
    enabled?: boolean;
    dailyReportPhone?: string;
    dailyReportEnabled?: boolean;
    lastDailyReportDate?: string;
    lastDailyReportAt?: Date;
  } | null;

  const dbKey = (doc?.apiKey || '').trim();
  const envKey = (process.env.TXTLINK_API_KEY || process.env.SMS_API_KEY || '').trim();
  const apiKey = dbKey || envKey;
  const senderIdName = (
    doc?.senderIdName ||
    process.env.TXTLINK_SENDER_ID ||
    process.env.SMS_SENDER_ID ||
    ''
  ).trim();
  const enabled = doc ? doc.enabled !== false : true;
  const source: SmsConfigSource = dbKey ? 'admin' : envKey ? 'env' : 'none';

  return {
    apiKey,
    senderIdName,
    enabled,
    source,
    configured: Boolean(apiKey),
    dailyReportPhone: (doc?.dailyReportPhone || '').trim(),
    dailyReportEnabled: doc?.dailyReportEnabled !== false,
    lastDailyReportDate: (doc?.lastDailyReportDate || '').trim(),
    lastDailyReportAt: doc?.lastDailyReportAt ? new Date(doc.lastDailyReportAt).toISOString() : null,
  };
}

export function publicSmsConfig(runtime: SmsRuntimeConfig) {
  return {
    provider: 'txtlink',
    baseUrl: TXTLINK_BASE_URL,
    sendUrl: TXTLINK_SEND_URL,
    hasApiKey: runtime.configured,
    apiKeyMasked: maskSecret(runtime.apiKey),
    senderIdName: runtime.senderIdName,
    enabled: runtime.enabled,
    source: runtime.source,
    dailyReportPhone: runtime.dailyReportPhone,
    dailyReportEnabled: runtime.dailyReportEnabled,
    lastDailyReportDate: runtime.lastDailyReportDate,
    lastDailyReportAt: runtime.lastDailyReportAt,
  };
}
