export function generateOrderIds() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return {
    orderNumber: `ORD-${timestamp}-${random}`,
    orderId: `${timestamp}${random}`,
  };
}

export function generateOrderNumber(): string {
  return generateOrderIds().orderNumber;
}

export function shortOrderIdFromNumber(orderNumber: string) {
  return String(orderNumber || '').replace(/\D/g, '').slice(0, 12);
}

export function isMongoObjectId(value: string) {
  return /^[a-fA-F0-9]{24}$/.test(String(value || '').trim());
}

/** M-Pesa AccountReference: generated order id only, never Mongo _id. Max 12 chars. */
export function mpesaOrderIdFromOrder(order: {
  orderNumber?: string;
  paybillAccount?: string;
  pendingMpesaPayment?: { accountReference?: string };
}) {
  const candidates = [
    order.pendingMpesaPayment?.accountReference,
    order.paybillAccount,
    shortOrderIdFromNumber(order.orderNumber || ''),
  ];

  for (const value of candidates) {
    const id = String(value || '').trim();
    if (id && !isMongoObjectId(id)) {
      return id.slice(0, 12);
    }
  }

  return generateOrderIds().orderId;
}

export function orderNumberFromShortId(raw: string) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 9) {
    return `ORD-${digits.slice(0, 6)}-${digits.slice(6)}`;
  }
  return '';
}
