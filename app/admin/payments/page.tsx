"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to M-Pesa transactions page
    router.replace('/admin/mpesa-transactions');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to M-Pesa Transactions...</p>
              </div>
            </div>
  );
} 