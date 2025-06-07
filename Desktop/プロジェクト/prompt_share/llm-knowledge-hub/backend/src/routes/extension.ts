import { Router } from 'express';
import { ExtensionController } from '../controllers/extensionController';
import { validateRequest, schemas } from '../middleware/validation';
import { authenticateExtension } from '../middleware/auth';

const router = Router();

// すべてのルートで拡張機能認証が必要
router.use(authenticateExtension);

// 会話データ受信
router.post('/conversations/receive', 
  validateRequest({ body: schemas.conversationData }),
  ExtensionController.receiveConversation
);

// 推奨取得
router.post('/recommendations', 
  ExtensionController.getRecommendationsForExtension
);

// プロンプト実行用データ取得
router.get('/prompts/:id/execute', 
  validateRequest({ params: schemas.idParam }),
  ExtensionController.getPromptForExecution
);

// 統計情報取得
router.get('/stats', 
  ExtensionController.getExtensionStats
);

export { router as extensionRoutes };