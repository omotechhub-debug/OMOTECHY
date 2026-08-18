import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import SmsSettings from '@/lib/models/SmsSettings';
import { getSmsRuntimeConfig, isMaskedSecret, publicSmsConfig } from '@/lib/sms-config';
import { normalizeKenyaPhoneLocal } from '@/lib/phone-utils';
import { getSmsTemplates, sanitizeSmsTemplates, validateSmsTemplates } from '@/lib/sms-templates';

function rejectInvalidTemplates(templates: Record<string, string>) {
  const errors = validateSmsTemplates(templates);
  if (errors.length === 0) return null;
  return NextResponse.json(
    { success: false, error: errors[0], errors },
    { status: 400 }
  );
}

export const GET = requireSuperAdmin(async () => {
  try {
    const runtime = await getSmsRuntimeConfig();
    const templates = await getSmsTemplates();
    return NextResponse.json({
      success: true,
      config: publicSmsConfig(runtime),
      templates,
    });
  } catch (error) {
    console.error('SMS settings GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load SMS settings' },
      { status: 500 }
    );
  }
});

export const PUT = requireSuperAdmin(async (request: NextRequest) => {
  try {
    await connectDB();
    const body = await request.json();
    const hasConfigFields = ['apiKey', 'senderIdName', 'enabled', 'dailyReportPhone', 'dailyReportEnabled']
      .some((key) => key in body);

    if ('templates' in body && !hasConfigFields) {
      const templates = sanitizeSmsTemplates(body.templates);
      const invalid = rejectInvalidTemplates(templates);
      if (invalid) return invalid;
      await SmsSettings.findOneAndUpdate(
        { key: 'txtlink' },
        { $set: { templates } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return NextResponse.json({
        success: true,
        message: 'SMS templates saved',
        templates,
      });
    }

    const senderIdName = String(body.senderIdName || '').trim();
    const enabled = body.enabled !== false;
    const incomingKey = String(body.apiKey || '').trim();
    const dailyReportEnabled = body.dailyReportEnabled !== false;
    const rawDailyPhone = String(body.dailyReportPhone || '').trim();
    const dailyReportPhone = rawDailyPhone
      ? (normalizeKenyaPhoneLocal(rawDailyPhone) || '')
      : '';

    if (rawDailyPhone && !dailyReportPhone) {
      return NextResponse.json(
        { success: false, error: 'Enter a valid Kenyan mobile number for the daily report' },
        { status: 400 }
      );
    }

    const existing = await SmsSettings.findOne({ key: 'txtlink' });
    const keepExistingKey = isMaskedSecret(incomingKey);
    const nextApiKey = keepExistingKey ? (existing?.apiKey || '') : incomingKey;
    const runtimeBefore = await getSmsRuntimeConfig();

    if (!nextApiKey && !runtimeBefore.configured && !dailyReportPhone && !existing?.apiKey) {
      return NextResponse.json(
        { success: false, error: 'TXTLINK API key is required' },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {
      provider: 'txtlink',
      senderIdName,
      enabled,
      dailyReportPhone,
      dailyReportEnabled,
    };
    if (nextApiKey) {
      update.apiKey = nextApiKey;
    }
    if (body.templates && typeof body.templates === 'object') {
      const templates = sanitizeSmsTemplates(body.templates);
      const invalid = rejectInvalidTemplates(templates);
      if (invalid) return invalid;
      update.templates = templates;
    }

    await SmsSettings.findOneAndUpdate(
      { key: 'txtlink' },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const runtime = await getSmsRuntimeConfig();
    return NextResponse.json({
      success: true,
      message: 'SMS settings saved',
      config: publicSmsConfig(runtime),
      templates: await getSmsTemplates(),
    });
  } catch (error) {
    console.error('SMS settings PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save SMS settings' },
      { status: 500 }
    );
  }
});
