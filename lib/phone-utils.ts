/**
 * Kenyan mobile numbers stored and displayed as local 10-digit "07XXXXXXXX".
 * M-Pesa STK callbacks sometimes return a 64-char hex "PhoneNumber" — never treat that as the customer phone.
 */

const HASH_HEX_64 = /^[a-f0-9]{64}$/i;

export function isLikelyMpesaPhoneHashOrGarbage(phone: string | null | undefined): boolean {
  if (!phone || typeof phone !== 'string') return true;
  const t = phone.replace(/\s+/g, '').trim();
  if (!t) return true;
  if (t === 'Unknown' || t === 'Data Error') return true;
  if (t.length === 64 && HASH_HEX_64.test(t)) return true;
  return false;
}

/**
 * Returns digits-only core for parsing (no formatting).
 */
export function digitsOnly(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/\D/g, '');
}

/**
 * Normalize to local 10-digit format starting with 07, or null if not a valid KE mobile.
 */
export function normalizeKenyaPhoneLocal(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null;
  if (isLikelyMpesaPhoneHashOrGarbage(input)) return null;

  let d = digitsOnly(input);
  if (!d) return null;

  if (d.startsWith('254')) {
    const rest = d.slice(3);
    if (rest.length === 9 && rest.startsWith('7')) {
      d = '0' + rest;
    } else if (rest.length >= 9) {
      const nine = rest.slice(0, 9);
      if (nine.startsWith('7')) d = '0' + nine;
    }
  }

  if (d.length === 9 && d.startsWith('7')) {
    d = '0' + d;
  }

  if (d.length === 10 && d.startsWith('07')) {
    return d;
  }

  return null;
}

/** Prefer STK prompt / order fields; avoid M-Pesa callback hash. */
export function resolvePhoneFromOrderFields(order: {
  customer?: { phone?: string };
  pendingMpesaPayment?: { phoneNumber?: string } | null;
  phoneNumber?: string;
  mpesaPayment?: { phoneNumber?: string } | null;
}): string | null {
  const tryNormalize = (v: string | null | undefined) => {
    const n = normalizeKenyaPhoneLocal(v);
    return n;
  };

  const fromPending = tryNormalize(order.pendingMpesaPayment?.phoneNumber);
  if (fromPending) return fromPending;

  const fromTop = tryNormalize(order.phoneNumber);
  if (fromTop) return fromTop;

  const fromCustomer = tryNormalize(order.customer?.phone);
  if (fromCustomer) return fromCustomer;

  const fromMpesa = tryNormalize(order.mpesaPayment?.phoneNumber);
  if (fromMpesa) return fromMpesa;

  return null;
}

/**
 * For UI: show normalized phone or placeholder when only garbage/hash is stored.
 */
export function formatKenyaPhoneForDisplay(
  input: string | null | undefined,
  emptyLabel = '—'
): string {
  const n = normalizeKenyaPhoneLocal(input);
  if (n) return n;
  if (!input || !String(input).trim()) return emptyLabel;
  if (isLikelyMpesaPhoneHashOrGarbage(input)) return emptyLabel;
  return String(input).trim();
}
