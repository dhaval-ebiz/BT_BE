import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { db } from '../config/database';
import { users, retailBusinesses, businessStaff, userSessions, businessTypeEnum } from '../models/drizzle/schema';
import { eq, and, gt } from 'drizzle-orm';
import { 
  RegisterInput, 
  LoginInput, 
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  UpdateProfileInput,
  Verify2FAInput
} from '../schemas/auth.schema';
import { logAuthEvent, logSecurityEvent } from '../utils/logger';
import { sendEmail } from '../utils/email';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { randomBytes } from 'crypto';
import { JWTPayload, TokenPair } from '../types/common';

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'secret';
  private readonly JWT_EXPIRES_IN = '1d';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
  private readonly JWT_REFRESH_EXPIRES_IN = '7d';

  async register(input: RegisterInput): Promise<{ user: { id: string; email: string; firstName: string | null; lastName: string | null; role: string; status: string }; business: typeof retailBusinesses.$inferSelect; tokens: TokenPair }> {
    const { email, password, firstName, lastName, phone, businessName, businessType } = input;

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        emailVerificationToken: randomBytes(32).toString('hex'),
      })
      .returning();

    if (!newUser) throw new Error('Failed to create user');

    // Create business
    const businessNameStr = businessName || 'My Business';
    const validBusinessType = businessType && 
      ['RETAIL', 'WHOLESALE', 'SERVICE', 'MANUFACTURING', 'WORKSHOP', 'HYBRID', 'RESTAURANT', 'ECOMMERCE'].includes(businessType)
      ? businessType 
      : 'RETAIL';
    
    const [newBusiness] = await db
      .insert(retailBusinesses)
      .values({
        name: businessNameStr,
        businessType: validBusinessType as typeof businessTypeEnum.enumValues[number], 
        ownerId: newUser.id,
        slug: businessNameStr.toLowerCase().replace(/ /g, '-') + '-' + randomBytes(4).toString('hex'),
        isActive: true,
      })
      .returning();

    if (!newBusiness) throw new Error('Failed to create business');

    // Add user as staff (Owner role)
    // Note: In real app, we should fetch role ID for 'Owner' or 'Admin'
    await db.insert(businessStaff).values({
      businessId: newBusiness.id,
      userId: newUser.id,
      // role: 'OWNER', // Removed invalid column assignment. Owner has implicit access via ownerId.
      isActive: true,
      joinedAt: new Date(),
    });

    if (!newBusiness) throw new Error('Failed to create business');

    // Send verification email
    if (newUser.emailVerificationToken) {
        await this.sendVerificationEmail(email, newUser.emailVerificationToken);
    }

    logAuthEvent('user_registered', newUser.id, { businessId: newBusiness.id });

    // Generate tokens
    const tokens = await this.generateTokens(newUser.id);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        status: newUser.status,
      },
      business: newBusiness,
      tokens,
    };
  }

  async login(input: LoginInput): Promise<{ user: { id: string; email: string; firstName: string | null; lastName: string | null; role: string; status: string }; tokens: TokenPair } | { require2FA: boolean; userId: string }> {
    const { email, password, code } = input;

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      logSecurityEvent('login_attempt_failed', 'medium', { email, reason: 'user_not_found' });
      throw new Error('Invalid email or password');
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const lockTime = Math.ceil((user.lockUntil.getTime() - Date.now()) / 1000 / 60);
      throw new Error('Account is locked. Try again in ' + lockTime + ' minutes.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Increment login attempts
      const loginAttempts = (user.loginAttempts || 0) + 1;
      let lockUntil: Date | null = null;

      // Lock account after 5 failed attempts
      if (loginAttempts >= 5) {
        lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        logSecurityEvent('account_locked', 'high', { userId: user.id, email, loginAttempts });
      }

      await db
        .update(users)
        .set({ 
          loginAttempts,
          lockUntil,
        })
        .where(eq(users.id, user.id));

      logSecurityEvent('login_attempt_failed', 'medium', { userId: user.id, email, loginAttempts });
      throw new Error('Invalid email or password');
    }

    // Check 2FA
    if (user.twoFactorEnabled) {
      if (!code) {
        return {
          require2FA: true,
          userId: user.id, // In a real app, send a temp token instead of ID for security
        };
      }

      if (!user.twoFactorSecret) {
        throw new Error('2FA secret not found');
      }

      const isValid = authenticator.verify({
        token: code,
        secret: user.twoFactorSecret,
      });

      if (!isValid) {
        logSecurityEvent('2fa_failed', 'medium', { userId: user.id });
        throw new Error('Invalid 2FA code');
      }
    }

    // Reset login attempts on successful login
    await db
      .update(users)
      .set({ 
        loginAttempts: 0,
        lockUntil: null,
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    logAuthEvent('user_logged_in', user.id, { email, with2FA: !!user.twoFactorEnabled });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
      },
      tokens,
    };
  }

  async refreshTokens(input: RefreshTokenInput): Promise<{ tokens: TokenPair }> {
    const { refreshToken } = input;

    try {
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as JWTPayload;
      
      if (!decoded.userId) {
        throw new Error('Invalid refresh token payload');
      }
      
      // Check if refresh token exists in database
      const [session] = await db
        .select()
        .from(userSessions)
        .where(and(
          eq(userSessions.refreshToken, refreshToken),
          eq(userSessions.isActive, true)
        ))
        .limit(1);

      if (!session) {
        throw new Error('Invalid refresh token');
      }

      // Check if refresh token is expired
      if (session.expiresAt && session.expiresAt < new Date()) {
        throw new Error('Refresh token expired');
      }

      // Invalidate old session
      await db
        .update(userSessions)
        .set({ isActive: false })
        .where(eq(userSessions.id, session.id));

      const tokens = await this.generateTokens(session.userId);

      logAuthEvent('tokens_refreshed', session.userId);

      return { tokens };
    } catch (error) {
      logSecurityEvent('invalid_refresh_token', 'medium', { refreshToken });
      throw new Error('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<{ message: string }> {
    // Invalidate all active sessions for user
    await db
      .update(userSessions)
      .set({ isActive: false })
      .where(and(
        eq(userSessions.userId, userId),
        eq(userSessions.isActive, true)
      ));

    logAuthEvent('user_logged_out', userId);

    return { message: 'Logged out successfully' };
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
    const { email } = input;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      // Don't reveal if user exists or not
      return { message: 'If an account exists with this email, you will receive a password reset link.' };
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db
      .update(users)
      .set({
        passwordResetToken: resetToken,
        passwordResetExpiresAt: resetExpiresAt,
      })
      .where(eq(users.id, user.id));

    // Send reset email
    await this.sendPasswordResetEmail(email, resetToken);

    logAuthEvent('password_reset_requested', user.id, { email });

    return { message: 'If an account exists with this email, you will receive a password reset link.' };
  }


  async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    const { token, password } = input;

    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.passwordResetToken, token),
        gt(users.passwordResetExpiresAt, new Date())
      ))
      .limit(1);

    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    await db
      .update(users)
      .set({
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      })
      .where(eq(users.id, user.id));

    logAuthEvent('password_reset_completed', user.id);

    return { message: 'Password reset successful' };
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<{ message: string }> {
    const { currentPassword, newPassword } = input;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      logSecurityEvent('password_change_failed', 'medium', { userId, reason: 'invalid_current_password' });
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));

    logAuthEvent('password_changed', userId);

    return { message: 'Password changed successfully' };
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<{ user: { id: string; email: string; firstName: string | null; lastName: string | null; phone: string | null; avatar: string | null; role: string } }> {
    const updateData: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      avatar?: string;
    } = {};
    
    if (input.firstName) updateData.firstName = input.firstName;
    if (input.lastName) updateData.lastName = input.lastName;
    if (input.phone) updateData.phone = input.phone;
    if (input.avatar) updateData.avatar = input.avatar;

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) throw new Error('Failed to update user');

    logAuthEvent('profile_updated', userId);

    return {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
      },
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.emailVerificationToken, token))
      .limit(1);

    if (!user) {
      throw new Error('Invalid verification token');
    }

    await db
      .update(users)
      .set({
        emailVerified: true,
        status: 'ACTIVE',
        emailVerificationToken: null,
      })
      .where(eq(users.id, user.id));

    logAuthEvent('email_verified', user.id);

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.email, email),
        eq(users.emailVerified, false)
      ))
      .limit(1);

    if (!user) {
      return { message: 'If an unverified account exists with this email, you will receive a verification link.' };
    }

    // Generate new verification token
    const emailVerificationToken = randomBytes(32).toString('hex');

    await db
      .update(users)
      .set({ emailVerificationToken })
      .where(eq(users.id, user.id));

    await this.sendVerificationEmail(email, emailVerificationToken);

    return { message: 'If an unverified account exists with this email, you will receive a verification link.' };
  }

  async verifyPhone(token: string): Promise<{ message: string }> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneVerificationToken, token))
      .limit(1);

    if (!user) {
      throw new Error('Invalid verification token');
    }

    await db
      .update(users)
      .set({
        phoneVerified: true,
        phoneVerificationToken: null,
      })
      .where(eq(users.id, user.id));

    logAuthEvent('phone_verified', user.id);

    return { message: 'Phone verified successfully' };
  }

  async enable2FA(userId: string): Promise<{ secret: string; qrCode: string }> {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(userId, 'BillingApp', secret);
    const qrCode = await toDataURL(otpauth);

    // Save secret but don't enable yet
    await db
      .update(users)
      .set({ twoFactorSecret: secret })
      .where(eq(users.id, userId));

    return {
      secret,
      qrCode,
    };
  }

  async verify2FA(userId: string, input: Verify2FAInput): Promise<{ message: string }> {
    const { token, secret } = input;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    const secretToVerify = secret || user.twoFactorSecret;

    if (!secretToVerify) {
      throw new Error('2FA secret not found. Please enable 2FA first.');
    }

    const isValid = authenticator.verify({
      token,
      secret: secretToVerify,
    });

    if (!isValid) {
      throw new Error('Invalid 2FA code');
    }

    // Enable 2FA if verified
    await db
      .update(users)
      .set({ 
        twoFactorEnabled: true,
        twoFactorSecret: secretToVerify 
      })
      .where(eq(users.id, userId));

    logAuthEvent('2fa_enabled', userId);

    return { message: '2FA enabled successfully' };
  }

  async disable2FA(userId: string, token: string): Promise<{ message: string }> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new Error('2FA is not enabled');
    }

    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      throw new Error('Invalid 2FA code');
    }

    await db
      .update(users)
      .set({ 
        twoFactorEnabled: false,
        twoFactorSecret: null 
      })
      .where(eq(users.id, userId));

    logAuthEvent('2fa_disabled', userId);

    return { message: '2FA disabled successfully' };
  }

  private async generateTokens(userId: string): Promise<TokenPair> {
    const accessToken = jwt.sign(
      { userId },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN } as SignOptions
    );

    const refreshToken = jwt.sign(
      { userId },
      this.JWT_REFRESH_SECRET,
      { expiresIn: this.JWT_REFRESH_EXPIRES_IN } as SignOptions
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store refresh token in userSessions
    await db
      .insert(userSessions)
      .values({
        userId,
        refreshToken,
        expiresAt,
        isActive: true,
        createdBy: userId,
      });

    return {
      accessToken,
      refreshToken,
      expiresIn: 86400, // 1 day in seconds
    };
  }

  private async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = process.env.FRONTEND_URL + '/verify-email?token=' + token;
    
    await sendEmail({
      to: email,
      subject: 'Verify your email address',
      html: `
        <h1>Email Verification</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
      `,
    });
  }

  private async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = process.env.FRONTEND_URL + '/reset-password?token=' + token;
    
    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset</h1>
        <p>Please click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
  }
}