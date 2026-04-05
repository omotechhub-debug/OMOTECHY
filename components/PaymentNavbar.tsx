"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  CreditCard, 
  History, 
  TrendingUp, 
  Settings, 
  Download,
  RefreshCw,
  DollarSign,
  FileText,
  BarChart3,
  Search
} from 'lucide-react';

const PaymentNavbar = () => {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Payment Dashboard',
      href: '/admin/payments',
      icon: BarChart3,
      description: 'Overview of all payments'
    },
    {
      name: 'Transaction History',
      href: '/admin/payments/history',
      icon: History,
      description: 'M-Pesa transaction records'
    },
    {
      name: 'Payment Analytics',
      href: '/admin/payments/analytics',
      icon: TrendingUp,
      description: 'Payment trends and insights'
    },
    {
      name: 'Pending Payments',
      href: '/admin/payments/pending',
      icon: RefreshCw,
      description: 'Orders awaiting payment'
    },
    {
      name: 'Failed Payments',
      href: '/admin/payments/failed',
      icon: CreditCard,
      description: 'Failed payment attempts'
    },
    {
      name: 'Payment Reports',
      href: '/admin/payments/reports',
      icon: FileText,
      description: 'Generate payment reports'
    },
    {
      name: 'Reconciliation',
      href: '/admin/payments/reconciliation',
      icon: Search,
      description: 'Match payments with orders'
    },
    {
      name: 'M-Pesa Settings',
      href: '/admin/payments/settings',
      icon: Settings,
      description: 'Configure M-Pesa integration'
    }
  ];

  const isActive = (href: string) => {
    if (href === '/admin/payments') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Payment Center</h1>
              <p className="text-sm text-gray-500">M-Pesa Payment Management</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/admin/payments/reports?export=today"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Today
            </Link>
            <Link
              href="/admin/orders"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              Process Payments
            </Link>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex items-center gap-1 pb-4 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  active
                    ? 'bg-green-100 text-green-800 border border-green-200 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={item.description}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
                {active && (
                  <div className="w-2 h-2 bg-green-500 rounded-full ml-1" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PaymentNavbar; 