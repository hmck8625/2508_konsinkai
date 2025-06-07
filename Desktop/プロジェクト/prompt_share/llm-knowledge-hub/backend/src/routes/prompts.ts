import { Router } from 'express';
import { PromptController } from '../controllers/promptController';
import { validateRequest, schemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticateToken);

// プロンプト CRUD
router.get('/', PromptController.getPrompts);

router.get('/:id', 
  validateRequest({ params: schemas.idParam }),
  PromptController.getPrompt
);

router.post('/', 
  validateRequest({ body: schemas.createPrompt }),
  PromptController.createPrompt
);

router.put('/:id', 
  validateRequest({ 
    params: schemas.idParam,
    body: schemas.updatePrompt 
  }),
  PromptController.updatePrompt
);

router.delete('/:id', 
  validateRequest({ params: schemas.idParam }),
  PromptController.deletePrompt
);

// 評価・フィードバック
router.post('/:id/ratings', 
  validateRequest({ 
    params: schemas.idParam,
    body: schemas.createRating 
  }),
  PromptController.ratePrompt
);

// コメント
router.post('/:id/comments', 
  validateRequest({ 
    params: schemas.idParam,
    body: {
      content: schemas.createRating.extract('comment').required()
    }
  }),
  PromptController.addComment
);

// 使用ログ
router.post('/:id/usage', 
  validateRequest({ 
    params: schemas.idParam,
    body: {
      executionType: schemas.executeTemplate.extract('executionType').required(),
      timeSaved: schemas.createRating.extract('timeSaved')
    }
  }),
  PromptController.logUsage
);

export { router as promptRoutes };