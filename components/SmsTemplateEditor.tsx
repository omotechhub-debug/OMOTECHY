"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, CheckCircle, Loader2, RotateCcw, Save, XCircle } from 'lucide-react';
import {
  applySmsTemplate,
  DEFAULT_SMS_TEMPLATES,
  SMS_TEMPLATE_DEFINITIONS,
  getMissingRequiredFields,
  getUnknownPlaceholders,
  smsFieldTag,
  templateHasPlaceholder,
  type SmsTemplateId,
} from '@/lib/sms-template-defs';

type TemplatesMap = Record<SmsTemplateId, string>;

export default function SmsTemplateEditor({
  token,
}: {
  token?: string | null;
}) {
  const [templates, setTemplates] = useState<TemplatesMap>(DEFAULT_SMS_TEMPLATES);
  const [savedTemplates, setSavedTemplates] = useState<TemplatesMap>(DEFAULT_SMS_TEMPLATES);
  const [selectedId, setSelectedId] = useState<SmsTemplateId>('purchase_confirmation');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selected = SMS_TEMPLATE_DEFINITIONS.find((item) => item.id === selectedId) || SMS_TEMPLATE_DEFINITIONS[0];
  const body = templates[selected.id] || selected.defaultBody;
  const dirty = JSON.stringify(templates) !== JSON.stringify(savedTemplates);
  const preview = useMemo(() => applySmsTemplate(body, selected.sample), [body, selected.sample]);
  const missing = getMissingRequiredFields(selected.id, body);
  const unknown = getUnknownPlaceholders(selected.id, body);
  const requiredFields = selected.fields.filter((field) => field.required);
  const optionalFields = selected.fields.filter((field) => !field.required);
  const canSave = dirty && missing.length === 0 && unknown.length === 0;

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/sms-settings', { headers: authHeaders });
        const data = await response.json();
        if (!cancelled && data.success && data.templates) {
          const next = { ...DEFAULT_SMS_TEMPLATES, ...data.templates };
          setTemplates(next);
          setSavedTemplates(next);
        }
      } catch {
        if (!cancelled) {
          setStatusMessage({ type: 'error', text: 'Failed to load SMS templates' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const insertField = (key: string) => {
    if (templateHasPlaceholder(body, key)) {
      const textarea = textareaRef.current;
      const tag = smsFieldTag(key);
      const index = body.toLowerCase().indexOf(tag.toLowerCase());
      if (textarea && index >= 0) {
        textarea.focus();
        textarea.setSelectionRange(index, index + tag.length);
      }
      return;
    }
    const tag = smsFieldTag(key);
    const textarea = textareaRef.current;
    if (!textarea) {
      setTemplates((prev) => ({ ...prev, [selected.id]: `${prev[selected.id] || ''}${tag}` }));
      return;
    }
    const start = textarea.selectionStart ?? body.length;
    const end = textarea.selectionEnd ?? body.length;
    const next = `${body.slice(0, start)}${tag}${body.slice(end)}`;
    setTemplates((prev) => ({ ...prev, [selected.id]: next }));
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + tag.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const resetSelected = () => {
    setTemplates((prev) => ({ ...prev, [selected.id]: selected.defaultBody }));
  };

  const saveTemplates = async () => {
    if (!canSave) return;
    setSaving(true);
    setStatusMessage(null);
    try {
      const response = await fetch('/api/admin/sms-settings', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ templates }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save SMS templates');
      }
      const next = { ...DEFAULT_SMS_TEMPLATES, ...(data.templates || templates) };
      setTemplates(next);
      setSavedTemplates(next);
      setStatusMessage({ type: 'success', text: 'SMS templates saved. New messages will use this wording.' });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save SMS templates',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          SMS message templates
        </CardTitle>
        <CardDescription>
          Required fields are marked Must include. Click a button to insert the live value. Saving is blocked until every required field is in the message.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {statusMessage && (
          <Alert className={statusMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            {statusMessage.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={statusMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {statusMessage.text}
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading templates...
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
            <div className="space-y-2">
              {SMS_TEMPLATE_DEFINITIONS.map((item) => {
                const itemBody = templates[item.id] || item.defaultBody;
                const itemMissing = getMissingRequiredFields(item.id, itemBody);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                      selected.id === item.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-sm text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.recipient}</p>
                    {itemMissing.length > 0 && (
                      <p className="text-xs text-red-600 mt-1">Missing required data</p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">{selected.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{selected.description}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-800 mb-2">Must include</p>
                <div className="flex flex-wrap gap-2">
                  {requiredFields.map((field) => {
                    const included = templateHasPlaceholder(body, field.key);
                    return (
                      <Button
                        key={field.key}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertField(field.key)}
                        title={`${field.label} is required. Example: ${field.example}`}
                        className={included
                          ? 'border-green-500 bg-green-50 text-green-800'
                          : 'border-red-400 bg-red-50 text-red-800'}
                      >
                        {field.label} *
                      </Button>
                    );
                  })}
                </div>
              </div>

              {optionalFields.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-800 mb-2">Optional</p>
                  <div className="flex flex-wrap gap-2">
                    {optionalFields.map((field) => (
                      <Button
                        key={field.key}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertField(field.key)}
                        title={`Optional. Example: ${field.example}`}
                      >
                        {field.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {missing.length > 0 && (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Add these required fields before saving: {missing.map((field) => field.label).join(', ')}.
                  </AlertDescription>
                </Alert>
              )}

              {unknown.length > 0 && (
                <Alert className="border-amber-200 bg-amber-50">
                  <XCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    Remove unknown fields so the wrong data is not sent: {unknown.map((key) => smsFieldTag(key)).join(', ')}.
                  </AlertDescription>
                </Alert>
              )}

              <Textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setTemplates((prev) => ({ ...prev, [selected.id]: e.target.value }))}
                className="min-h-[280px] font-mono text-sm"
              />

              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Preview with sample data</p>
                <pre className="whitespace-pre-wrap text-sm text-gray-800">{preview}</pre>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={saveTemplates} disabled={saving || !canSave} className="flex items-center gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save templates
                </Button>
                <Button type="button" variant="outline" onClick={resetSelected} className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Reset this message
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
