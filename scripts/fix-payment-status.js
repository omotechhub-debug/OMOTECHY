const { MongoClient } = require('mongodb');

async function fixPaymentStatus() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const ordersCollection = db.collection('orders');
    
    // Find orders with old payment status
    const ordersToFix = await ordersCollection.find({
      $or: [
        { paymentStatus: 'partially_paid' },
        { remainingBalance: { $exists: false } },
        { remainingBalance: null }
      ]
    }).toArray();
    
    console.log(`Found ${ordersToFix.length} orders to fix`);
    
    for (const order of ordersToFix) {
      const updateData = {};
      
      // Fix payment status
      if (order.paymentStatus === 'partially_paid') {
        updateData.paymentStatus = 'partial';
        console.log(`Fixed payment status for order ${order.orderNumber}: partially_paid -> partial`);
      }
      
      // Set remaining balance if missing
      if (!order.remainingBalance && order.remainingBalance !== 0) {
        const totalAmount = order.totalAmount || 0;
        const amountPaid = order.amountPaid || 0;
        updateData.remainingBalance = Math.max(0, totalAmount - amountPaid);
        console.log(`Set remaining balance for order ${order.orderNumber}: ${updateData.remainingBalance}`);
      }
      
      // Initialize partial payments array if missing
      if (!order.partialPayments) {
        updateData.partialPayments = [];
        
        // If order has payment info, add it to partial payments
        if (order.amountPaid && order.amountPaid > 0) {
          const paymentDate = order.paymentCompletedAt || order.updatedAt || new Date();
          const phoneNumber = order.phoneNumber || order.customer?.phone || 'Unknown';
          const receiptNumber = order.mpesaReceiptNumber || order.c2bPayment?.mpesaReceiptNumber || 'Unknown';
          const method = order.paymentMethod || 'mpesa_stk';
          
          updateData.partialPayments = [{
            amount: order.amountPaid,
            date: paymentDate,
            mpesaReceiptNumber: receiptNumber,
            phoneNumber: phoneNumber,
            method: method
          }];
          console.log(`Added payment history for order ${order.orderNumber}: ${order.amountPaid}`);
        }
      }
      
      // Update the order if we have changes
      if (Object.keys(updateData).length > 0) {
        await ordersCollection.updateOne(
          { _id: order._id },
          { $set: updateData }
        );
        console.log(`Updated order ${order.orderNumber}`);
      }
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await client.close();
  }
}

// Run the migration
fixPaymentStatus().catch(console.error); 