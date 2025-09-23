'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Phone, 
  DollarSign,
  Calendar,
  Receipt,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UnmatchedTransaction {
  _id: string;
  transactionId: string;
  mpesaReceiptNumber: string;
  transactionDate: string;
  phoneNumber: string;
  amountPaid: number;
  transactionType: string;
  customerName: string;
  notes: string;
  confirmationStatus: string;
}

export default function MpesaTransactionsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  
  const [unmatchedTransactions, setUnmatchedTransactions] = useState<UnmatchedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMpesaTransactions = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin/payments/pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        // Only get unmatched transactions (those without order connections)
        setUnmatchedTransactions(data.unmatchedTransactions || []);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch M-Pesa transactions',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching M-Pesa transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch M-Pesa transactions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMpesaTransactions();
    }
  }, [token]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading M-Pesa transactions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">M-Pesa Transactions</h1>
            <p className="text-gray-600 mt-1">
              Unmatched transactions that need manual connection to orders
            </p>
          </div>
          
          <Button
            onClick={fetchMpesaTransactions}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unmatched Transactions</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unmatchedTransactions.length}</div>
              <p className="text-xs text-muted-foreground">
                Transactions needing manual connection
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                KES {unmatchedTransactions.reduce((sum, t) => sum + t.amountPaid, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Total amount unmatched
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Unmatched Transactions */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Unmatched M-Pesa Transactions
          </h2>
          
          {unmatchedTransactions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No unmatched transactions</p>
                <p className="text-sm text-gray-400 mt-1">
                  All payments have been automatically processed or manually connected
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {unmatchedTransactions.map((transaction) => (
                <Card key={transaction._id} className="border-l-4 border-l-orange-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Unmatched Payment</h3>
                        <p className="text-sm text-gray-600">{transaction.notes}</p>
                      </div>
                      <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-200">
                        Needs Manual Connection
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-gray-600">Receipt #</p>
                          <p className="font-mono font-medium">{transaction.mpesaReceiptNumber}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-gray-600">Amount</p>
                          <p className="font-bold text-emerald-600">KES {transaction.amountPaid.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-gray-600">Phone</p>
                          <p className="font-mono">{transaction.phoneNumber}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-gray-600">Date</p>
                          <p>{formatDate(transaction.transactionDate)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                          <strong>Manual Action Required:</strong> This transaction needs to be manually connected to an order. 
                          The amount didn't match any pending STK Push request exactly, so it requires admin verification.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 