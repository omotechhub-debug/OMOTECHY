/**
 * Kenyan mobile numbers stored and displayed as local 10-digit format ("07XXXXXXXX" or "01XXXXXXXX").
 * M-Pesa STK callbacks sometimes return a 64-char hex "PhoneNumber" — never treat that as the customer phone.
 */

const HASH_HEX_64 = /^[a-f0-9]{64}$/i;

export function isLikelyMpesaPhoneHashOrGarbage(phone: unknown): boolean {
  if (phone == null) return true;
  const s = typeof phone === 'string' ? phone : String(phone);
  const t = s.replace(/\s+/g, '').trim();
  if (!t) return true;
  if (t === 'Unknown' || t === 'Data Error') return true;
  if (t.length === 64 && HASH_HEX_64.test(t)) return true;
  return false;
}

/**
 * Returns digits-only core for parsing (no formatting).
 */
export function digitsOnly(input: unknown): string {
  if (input == null) return '';
  const s = typeof input === 'string' ? input : String(input);
  return s.replace(/\D/g, '');
}

/**
 * Normalize to local 10-digit format (07XXXXXXXX or 01XXXXXXXX),
 * or null if not a valid KE mobile.
 */
export function normalizeKenyaPhoneLocal(input: unknown): string | null {
  if (input == null) return null;
  const str = typeof input === 'string' ? input : String(input);
  if (!str.trim()) return null;
  if (isLikelyMpesaPhoneHashOrGarbage(str)) return null;

  let d = digitsOnly(str);
  if (!d) return null;

  if (d.startsWith('254')) {
    const rest = d.slice(3);
    if (rest.length === 9 && (rest.startsWith('7') || rest.startsWith('1'))) {
      d = '0' + rest;
    } else if (rest.length >= 9) {
      const nine = rest.slice(0, 9);
      if (nine.startsWith('7') || nine.startsWith('1')) d = '0' + nine;
    }
  }

  if (d.length === 9 && (d.startsWith('7') || d.startsWith('1'))) {
    d = '0' + d;
  }

  if (d.length === 10 && (d.startsWith('07') || d.startsWith('01'))) {
    return d;
  }

  return null;
}

/** Prefer STK prompt / order fields; avoid M-Pesa callback hash. */
export function resolvePhoneFromOrderFields(order: {
  customer?: { phone?: unknown };
  pendingMpesaPayment?: { phoneNumber?: unknown } | null;
  phoneNumber?: unknown;
  mpesaPayment?: { phoneNumber?: unknown } | null;
  partialPayments?: Array<{ phoneNumber?: unknown }>;
  c2bPayment?: { phoneNumber?: unknown } | null;
}): string | null {
  const tryNormalize = (v: unknown) => normalizeKenyaPhoneLocal(v);

  const fromPending = tryNormalize(order.pendingMpesaPayment?.phoneNumber);
  if (fromPending) return fromPending;

  const fromTop = tryNormalize(order.phoneNumber);
  if (fromTop) return fromTop;

  const fromCustomer = tryNormalize(order.customer?.phone);
  if (fromCustomer) return fromCustomer;

  const fromMpesa = tryNormalize(order.mpesaPayment?.phoneNumber);
  if (fromMpesa) return fromMpesa;

  const partials = order.partialPayments || [];
  for (let i = partials.length - 1; i >= 0; i--) {
    const n = tryNormalize(partials[i]?.phoneNumber);
    if (n) return n;
  }

  const fromC2b = tryNormalize(order.c2bPayment?.phoneNumber);
  if (fromC2b) return fromC2b;

  return null;
}

/**
 * For UI: show normalized phone or placeholder when only garbage/hash is stored.
 */
export function formatKenyaPhoneForDisplay(input: unknown, emptyLabel = '—'): string {
  const n = normalizeKenyaPhoneLocal(input);
  if (n) return n;
  if (input == null) return emptyLabel;
  const raw = typeof input === 'string' ? input : String(input);
  if (!raw.trim()) return emptyLabel;
  if (isLikelyMpesaPhoneHashOrGarbage(raw)) return emptyLabel;
  return raw.trim();
}
