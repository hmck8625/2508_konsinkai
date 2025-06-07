import { Router } from 'express';
import { SearchController } from '../controllers/searchController';
import { validateRequest, schemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticateToken);

// 検索
router.get('/prompts', 
  validateRequest({ query: schemas.searchQuery }),
  SearchController.searchPrompts
);

// 検索候補
router.get('/suggestions', 
  SearchController.getSuggestions
);

// 類似プロンプト
router.get('/similar/:id', 
  validateRequest({ params: schemas.idParam }),
  SearchController.getSimilarPrompts
);

// レコメンデーション
router.get('/recommendations', 
  SearchController.getRecommendations
);

export { router as searchRoutes };