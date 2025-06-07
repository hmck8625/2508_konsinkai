import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../utils/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    department: string;
    role: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // ユーザーが存在し、アクティブかどうか確認
    const user = await db.user.findUnique({
      where: { 
        id: decoded.userId,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        department: true,
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const authenticateExtension = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Extension token required' });
  }

  try {
    // 拡張機能トークンの検証
    const extensionToken = await db.extensionToken.findUnique({
      where: {
        token: token,
        isActive: true,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!extensionToken) {
      return res.status(401).json({ message: 'Invalid or expired extension token' });
    }

    // トークンに関連するユーザー情報を取得
    const user = await db.user.findUnique({
      where: { id: extensionToken.userId },
      select: {
        id: true,
        email: true,
        name: true,
        department: true,
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid extension token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireDepartment = (departments: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!departments.includes(req.user.department)) {
      return res.status(403).json({ message: 'Department access denied' });
    }

    next();
  };
};