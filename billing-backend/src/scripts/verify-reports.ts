import { ReportService } from '../services/report.service';
import { db } from '../config/database';

async function verifyReports() {
  console.log('Starting Report Verification...');
  const reportService = new ReportService();
  
  // Use a known business ID or fetch one
  // For verification, we might fail if no business exists. 
  // Let's try to fetch a random business first.
  const business = await db.query.retailBusinesses.findFirst();
  
  if (!business) {
    console.error('No business found to verify reports against.');
    process.exit(1);
  }

  const businessId = business.id;
  console.log(`Verifying reports for Business ID: ${businessId}`);

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1); // Last month
  const endDate = new Date();

  try {
    // 1. Sales Report
    console.log('\n--- Sales Report ---');
    const salesReport = await reportService.getSalesReport(businessId, startDate, endDate, 'DAY');
    console.log('Summary:', salesReport.summary);
    console.log(`Breakdown items: ${salesReport.breakdown.length}`);

    // 2. Top Selling Products
    console.log('\n--- Top Selling Products ---');
    const topProducts = await reportService.getTopSellingProducts(businessId, startDate, endDate, 3);
    console.log(topProducts);

    // 3. Inventory Valuation
    console.log('\n--- Inventory Valuation ---');
    const inventory = await reportService.getInventoryValuation(businessId);
    console.log(`Total Valuation: ${inventory.totalValuation}`);
    console.log(`Total Items: ${inventory.totalItems}`);

    // 4. Low Stock Alerts
    console.log('\n--- Low Stock Alerts ---');
    const alerts = await reportService.getLowStockAlerts(businessId);
    console.log(`Alerts count: ${alerts.length}`);

    // 5. Profit & Loss
    console.log('\n--- Profit & Loss ---');
    const pnl = await reportService.getProfitLoss(businessId, startDate, endDate);
    console.log(pnl);

    // 6. Tax Report
    console.log('\n--- Tax Report ---');
    const tax = await reportService.getTaxReport(businessId, startDate, endDate);
    console.log(tax);

    console.log('\nVerification Completed Successfully!');
  } catch (error) {
    console.error('Verification Failed:', error);
  } finally {
    process.exit(0);
  }
}

verifyReports();
