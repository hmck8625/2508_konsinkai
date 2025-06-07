import { Request, Response } from 'express';
import { db } from '../utils/database';
import { 
  generateTokens, 
  verifyRefreshToken, 
  hashPassword, 
  comparePassword,
  generateExtensionToken
} from '../utils/auth';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  // ユーザー登録
  static async register(req: Request, res: Response) {
    try {
      const { email, name, department, role, password } = req.body;

      // 既存ユーザーチェック
      const existingUser = await db.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // パスワードハッシュ化
      const hashedPassword = await hashPassword(password);

      // ユーザー作成
      const user = await db.user.create({
        data: {
          email,
          name,
          department,
          role,
          password: hashedPassword
        },
        select: {
          id: true,
          email: true,
          name: true,
          department: true,
          role: true,
          createdAt: true
        }
      });

      // トークン生成
      const tokens = generateTokens(user.id);

      res.status(201).json({
        message: 'User registered successfully',
        user,
        ...tokens
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // ログイン
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // ユーザー検索
      const user = await db.user.findUnique({
        where: { email, isActive: true }
      });

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // パスワード検証
      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // トークン生成
      const tokens = generateTokens(user.id);

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          department: user.department,
          role: user.role
        },
        ...tokens
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // トークン更新
  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      const userId = verifyRefreshToken(refreshToken);
      if (!userId) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }

      // ユーザー存在確認
      const user = await db.user.findUnique({
        where: { id: userId, isActive: true }
      });

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // 新しいトークン生成
      const tokens = generateTokens(userId);

      res.json({
        message: 'Token refreshed successfully',
        ...tokens
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // プロフィール取得
  static async getProfile(req: AuthRequest, res: Response) {
    try {
      const user = await db.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          name: true,
          department: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // プロフィール更新
  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { name, department } = req.body;

      const user = await db.user.update({
        where: { id: req.user!.id },
        data: {
          ...(name && { name }),
          ...(department && { department })
        },
        select: {
          id: true,
          email: true,
          name: true,
          department: true,
          role: true,
          updatedAt: true
        }
      });

      res.json({
        message: 'Profile updated successfully',
        user
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 拡張機能トークン生成
  static async generateExtensionToken(req: AuthRequest, res: Response) {
    try {
      // 既存のアクティブトークンを無効化
      await db.extensionToken.updateMany({
        where: { userId: req.user!.id, isActive: true },
        data: { isActive: false }
      });

      // 新しいトークン生成
      const token = generateExtensionToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30日後

      const extensionToken = await db.extensionToken.create({
        data: {
          userId: req.user!.id,
          token,
          expiresAt
        }
      });

      res.json({
        message: 'Extension token generated successfully',
        token: extensionToken.token,
        expiresAt: extensionToken.expiresAt
      });
    } catch (error) {
      console.error('Generate extension token error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // ログアウト（トークン無効化）
  static async logout(req: AuthRequest, res: Response) {
    try {
      // 実際の実装では、トークンブラックリストなどを使用
      // ここでは単純にレスポンスを返す
      res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}