import { Router } from 'express';
import { authenticateToken, authorizeBusinessAccess, authorizePermission } from '../middleware/auth.middleware';
import { MoneyController } from '../controllers/money.controller';

const router = Router();
const moneyController = new MoneyController();

// Create middleware chain
const secure = [authenticateToken, authorizeBusinessAccess];

// Categories
router.post('/categories', secure, authorizePermission('MONEY_WITHDRAW'), (req, res) => moneyController.createCategory(req, res));
router.get('/categories', secure, (req, res) => moneyController.listCategories(req, res)); // Read-only access maybe? Keeping secure.

// Expenses
router.post('/expenses', secure, authorizePermission('MONEY_WITHDRAW'), (req, res) => moneyController.createExpense(req, res));
router.get('/expenses', secure, authorizePermission('MONEY_WITHDRAW'), (req, res) => moneyController.listExpenses(req, res));

// Summary
router.get('/summary', secure, authorizePermission('ANALYTICS_READ'), (req, res) => moneyController.getFinancialSummary(req, res));

export { router as moneyRoutes };
