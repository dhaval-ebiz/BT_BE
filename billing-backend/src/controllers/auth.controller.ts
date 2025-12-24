import { Request, Response } from 'express';
import { getErrorMessage, AppError, UnauthorizedError, NotFoundError } from '../utils/app-errors';
import { AuthService } from '../services/auth.service';
import { 
  registerSchema, 
  loginSchema, 
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  verifyPhoneSchema,
  verify2FASchema,
  disable2FASchema
} from '../schemas/auth.schema';
import { AuthenticatedRequest } from '../types/common';
import { logger, logApiRequest } from '../utils/logger';
import { db } from '../config/database';
import { users } from '../models/drizzle/schema';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';

const authService = new AuthService();

export class AuthController {
  private handleError(res: Response, error: unknown, defaultMessage: string): Response {
    logger.error(`${defaultMessage}:`, error);
    
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    const message = getErrorMessage(error) || defaultMessage;
    return res.status(500).json({
      success: false,
      message
    });
  }

  async register(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await authService.register(validatedData);
      logApiRequest(req, res, Date.now() - startTime);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Registration failed');
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await authService.login(validatedData);
      logApiRequest(req, res, Date.now() - startTime);
      res.json({ success: true, data: result });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      // Login failures are generally 401, but Zod errors are 400
      this.handleError(res, error, 'Login failed');
    }
  }

  async refreshTokens(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      const validatedData = refreshTokenSchema.parse(req.body);
      const result = await authService.refreshTokens(validatedData);
      logApiRequest(req, res, Date.now() - startTime);
      res.json({ success: true, data: result });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Token refresh failed');
    }
  }

  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const result = await authService.logout(req.user.id);
      logApiRequest(req, res, Date.now() - startTime);
      res.json({ success: true, data: result });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Logout failed');
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);
      const result = await authService.forgotPassword(validatedData);
      logApiRequest(req, res, Date.now() - startTime);
      res.json({ success: true, data: result });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Password reset request failed');
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      const result = await authService.resetPassword(validatedData);
      logApiRequest(req, res, Date.now() - startTime);
      res.json({ success: true, data: result });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Password reset failed');
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const validatedData = changePasswordSchema.parse(req.body);
      const result = await authService.changePassword(req.user.id, validatedData);
      logApiRequest(req, res, Date.now() - startTime);
      res.json({ success: true, data: result });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Password change failed');
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      if (!user) throw new NotFoundError('User not found');

      logApiRequest(req, res, Date.now() - startTime);
      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role,
          status: user.status,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Failed to get profile');
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const validatedData = updateProfileSchema.parse(req.body);
      const result = await authService.updateProfile(req.user.id, validatedData);
      logApiRequest(req, res, Date.now() - startTime);
      res.json({ success: true, data: result });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Profile update failed');
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      const validatedData = verifyEmailSchema.parse(req.body);
      const result = await authService.verifyEmail(validatedData.token);
      logApiRequest(req, res, Date.now() - startTime);
      res.json({ success: true, data: result });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Email verification failed');
    }
  }

  async resendVerificationEmail(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      const validatedData = resendVerificationSchema.parse(req.body);
      const result = await authService.resendVerificationEmail(validatedData.email);
      logApiRequest(req, res, Date.now() - startTime);
      res.json({ success: true, data: result });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Failed to resend verification email');
    }
  }

  async verifyPhone(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      const { token } = verifyPhoneSchema.parse(req.body);
      const result = await authService.verifyPhone(token);
      logApiRequest(req, res, Date.now() - startTime);
      res.json({ success: true, data: result });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Verification failed');
    }
  }

  async enable2FA(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      if (!req.user) throw new UnauthorizedError('Unauthorized');
      const result = await authService.enable2FA(req.user.id);
      logApiRequest(req, res, Date.now() - startTime);
      res.json({ success: true, data: result });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Enable 2FA error');
    }
  }

  async verify2FA(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      if (!req.user) throw new UnauthorizedError('Unauthorized');
      const validatedData = verify2FASchema.parse(req.body);
      const result = await authService.verify2FA(req.user.id, validatedData);
      logApiRequest(req, res, Date.now() - startTime);
      res.json({ success: true, data: result });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Verify 2FA error');
    }
  }

  async disable2FA(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      if (!req.user) throw new UnauthorizedError('Unauthorized');
      const { token } = disable2FASchema.parse(req.body);
      const result = await authService.disable2FA(req.user.id, token);
      logApiRequest(req, res, Date.now() - startTime);
      res.json({ success: true, data: result });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Disable 2FA error');
    }
  }
}