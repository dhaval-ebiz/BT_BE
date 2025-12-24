import { Response } from 'express';
import { getErrorMessage } from '../utils/errors';
import { BusinessRequest } from '../middleware/auth.middleware';
import { MoneyService } from '../services/money.service';
import { expenseCategorySchema, createExpenseSchema, expenseQuerySchema } from '../schemas/money.schema';
import { logger } from '../utils/logger';
import { logApiRequest } from '../utils/logger';

const moneyService = new MoneyService();

export class MoneyController {
  
  async createCategory(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    try {
        if (!req.business) return res.status(401).json({ success: false });

        const validation = expenseCategorySchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ success: false, errors: validation.error.errors });
        }

        const category = await moneyService.createCategory(req.business.id, validation.data);
        logApiRequest(req, res, Date.now() - startTime);
        res.status(201).json({ success: true, data: category });
    } catch (error: unknown) {
        logger.error('Create category error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
  }

  async listCategories(req: BusinessRequest, res: Response) {
    try {
        if (!req.business) return res.status(401).json({ success: false });
        const { type } = req.query;
        const categories = await moneyService.listCategories(req.business.id, type as 'EXPENSE' | 'INCOME');
        res.json({ success: true, data: categories });
    } catch (error: unknown) {
        res.status(500).json({ success: false, message: error.message });
    }
  }

  async createExpense(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    try {
        if (!req.business || !req.user) return res.status(401).json({ success: false });

        const validation = createExpenseSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ success: false, errors: validation.error.errors });
        }

        const expense = await moneyService.createExpense(req.business.id, req.user.id, validation.data, req);
        logApiRequest(req, res, Date.now() - startTime);
        res.status(201).json({ success: true, data: expense });
    } catch (error: unknown) {
        logger.error('Create expense error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
  }

  async listExpenses(req: BusinessRequest, res: Response) {
    try {
        if (!req.business) return res.status(401).json({ success: false });
        
        // Zod coercion for query params check
        const query = {
            ...req.query,
            minAmount: req.query.minAmount ? Number(req.query.minAmount) : undefined,
            maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : undefined,
            page: req.query.page ? Number(req.query.page) : 1,
            limit: req.query.limit ? Number(req.query.limit) : 20,
        };

        const validation = expenseQuerySchema.safeParse(query);
        if (!validation.success) {
             return res.status(400).json({ success: false, errors: validation.error.errors });
        }

        const result = await moneyService.listExpenses(req.business.id, validation.data);
        res.json({ success: true, data: result });
    } catch (error: unknown) {
        res.status(500).json({ success: false, message: error.message });
    }
  }

  async getFinancialSummary(req: BusinessRequest, res: Response) {
    try {
        if (!req.business) return res.status(401).json({ success: false });
        
        const { startDate, endDate } = req.query;
        const summary = await moneyService.getFinancialSummary(
            req.business.id, 
            startDate as string, 
            endDate as string
        );
        res.json({ success: true, data: summary });
    } catch (error: unknown) {
        res.status(500).json({ success: false, message: error.message });
    }
  }
}
