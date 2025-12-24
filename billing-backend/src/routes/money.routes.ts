import { Router, Request, Response } from 'express';
import { authenticateToken, authorizeBusinessAccess, authorizePermission, BusinessRequest } from '../middleware/auth.middleware';
import { MoneyController } from '../controllers/money.controller';

const router = Router();
const moneyController = new MoneyController();

// Create middleware chain
const secure = [authenticateToken, authorizeBusinessAccess];

// Categories
router.post('/categories', secure, authorizePermission('MONEY', 'WITHDRAW'), (req: Request, res: Response) => moneyController.createCategory(req as BusinessRequest, res));
router.get('/categories', secure, (req: Request, res: Response) => moneyController.listCategories(req as BusinessRequest, res)); // Read-only access maybe? Keeping secure.

// Expenses
router.post('/expenses', secure, authorizePermission('MONEY', 'WITHDRAW'), (req: Request, res: Response) => moneyController.createExpense(req as BusinessRequest, res));
router.get('/expenses', secure, authorizePermission('MONEY', 'WITHDRAW'), (req: Request, res: Response) => moneyController.listExpenses(req as BusinessRequest, res));

// Summary
router.get('/summary', secure, authorizePermission('ANALYTICS', 'READ'), (req: Request, res: Response) => moneyController.getFinancialSummary(req as BusinessRequest, res));

export { router as moneyRoutes };
