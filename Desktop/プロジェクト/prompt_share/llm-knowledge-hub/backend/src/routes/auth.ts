import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validateRequest, schemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 認証関連のルート
router.post('/register', 
  validateRequest({ body: schemas.createUser }),
  AuthController.register
);

router.post('/login', 
  validateRequest({ body: schemas.login }),
  AuthController.login
);

router.post('/refresh', 
  validateRequest({ body: schemas.refreshToken }),
  AuthController.refreshToken
);

router.post('/logout', 
  authenticateToken,
  AuthController.logout
);

// プロフィール関連
router.get('/profile', 
  authenticateToken,
  AuthController.getProfile
);

router.put('/profile', 
  authenticateToken,
  validateRequest({ body: schemas.updateUser }),
  AuthController.updateProfile
);

// 拡張機能トークン生成
router.post('/extension-token', 
  authenticateToken,
  AuthController.generateExtensionToken
);

export { router as authRoutes };