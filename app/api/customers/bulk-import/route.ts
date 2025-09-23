import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/lib/models/Customer';
import { requireAdmin } from '@/lib/auth';

export const POST = requireAdmin(async (req: NextRequest) => {
  try {
    await dbConnect();
    const { customers } = await req.json();

    if (!customers || !Array.isArray(customers)) {
      return NextResponse.json(
        { success: false, message: 'Invalid customers data' },
        { status: 400 }
      );
    }

    // Note: CSV ID column is completely ignored - MongoDB generates unique ObjectIDs
    // Duplicate prevention is based on phone number and email address only

    const results = {
      total: customers.length,
      imported: 0,
      skipped: 0,
      errors: []
    };

    for (let i = 0; i < customers.length; i++) {
      const customerData = customers[i];
      
      try {
        // Validate required fields
        if (!customerData.name || !customerData.phone) {
          results.errors.push({
            row: i + 1,
            error: 'Missing required fields (name or phone)',
            data: customerData
          });
          results.skipped++;
          continue;
        }

        // Clean phone number - remove any spaces, dashes, parentheses
        const cleanPhone = customerData.phone.toString().replace(/[\s\-\(\)]/g, '');
        
        // Check if customer already exists (both name AND phone must match for duplicate)
        const existingCustomer = await Customer.findOne({
          $and: [
            { phone: cleanPhone },
            { name: { $regex: new RegExp(`^${customerData.name.toString().trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
          ]
        });

        if (existingCustomer) {
          results.errors.push({
            row: i + 1,
            error: `Customer already exists: ${customerData.name} (${cleanPhone}) - Exact name and phone match found`,
            data: customerData
          });
          results.skipped++;
          continue;
        }

        // Optional: Check for email duplicates only if email is provided
        if (customerData.email) {
          const emailDuplicate = await Customer.findOne({
            email: customerData.email.toString().trim()
          });
          
          if (emailDuplicate) {
            results.errors.push({
              row: i + 1,
              error: `Email already exists: ${customerData.email} - Skipped to avoid duplicate email`,
              data: customerData
            });
            results.skipped++;
            continue;
          }
        }

        // Create new customer
        await Customer.create({
          name: customerData.name.toString().trim(),
          phone: cleanPhone,
          email: customerData.email ? customerData.email.toString().trim() : undefined,
          address: customerData.address ? customerData.address.toString().trim() : undefined,
          status: 'active',
          preferences: [],
          totalOrders: 0,
          totalSpent: 0
        });

        results.imported++;
      } catch (error: any) {
        results.errors.push({
          row: i + 1,
          error: error.message || 'Failed to create customer',
          data: customerData
        });
        results.skipped++;
      }
    }

    console.log('📊 BULK IMPORT COMPLETED:');
    console.log(`- Total records in request: ${results.total}`);
    console.log(`- Successfully imported: ${results.imported}`);
    console.log(`- Skipped (duplicates): ${results.skipped}`);
    console.log(`- Errors encountered: ${results.errors.length}`);
    console.log(`- Processing time: ${Date.now() - Date.now()} ms`);

    return NextResponse.json({ 
      success: true, 
      message: `Import completed: ${results.imported} imported, ${results.skipped} skipped`,
      results 
    });

  } catch (error: any) {
    console.error('Error in bulk import:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to import customers' },
      { status: 500 }
    );
  }
}); 