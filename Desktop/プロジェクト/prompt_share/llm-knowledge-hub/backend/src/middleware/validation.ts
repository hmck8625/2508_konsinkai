import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateRequest = (schema: {
  body?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    // Body validation
    if (schema.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        errors.push(`Body: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Params validation
    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        errors.push(`Params: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Query validation
    if (schema.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        errors.push(`Query: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation error',
        errors
      });
    }

    next();
  };
};

// Common validation schemas
export const schemas = {
  // User schemas
  createUser: Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(1).max(100).required(),
    department: Joi.string().min(1).max(50).required(),
    role: Joi.string().valid('admin', 'manager', 'user').required(),
    password: Joi.string().min(8).required()
  }),

  updateUser: Joi.object({
    name: Joi.string().min(1).max(100),
    department: Joi.string().min(1).max(50),
    role: Joi.string().valid('admin', 'manager', 'user')
  }),

  // Prompt schemas
  createPrompt: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    content: Joi.string().min(1).required(),
    response: Joi.string().optional(),
    llmModel: Joi.string().optional(),
    category: Joi.string().required(),
    subcategory: Joi.string().optional(),
    difficulty: Joi.string().valid('BEGINNER', 'INTERMEDIATE', 'ADVANCED').default('BEGINNER'),
    tags: Joi.array().items(Joi.string()).optional(),
    visibility: Joi.string().valid('PUBLIC', 'DEPARTMENT', 'PRIVATE').default('PUBLIC')
  }),

  updatePrompt: Joi.object({
    title: Joi.string().min(1).max(200),
    content: Joi.string().min(1),
    response: Joi.string(),
    llmModel: Joi.string(),
    category: Joi.string(),
    subcategory: Joi.string(),
    difficulty: Joi.string().valid('BEGINNER', 'INTERMEDIATE', 'ADVANCED'),
    tags: Joi.array().items(Joi.string()),
    visibility: Joi.string().valid('PUBLIC', 'DEPARTMENT', 'PRIVATE')
  }),

  // Rating schemas
  createRating: Joi.object({
    usefulness: Joi.number().integer().min(1).max(5).required(),
    easeOfUse: Joi.number().integer().min(1).max(5).required(),
    resultQuality: Joi.number().integer().min(1).max(5).required(),
    timeSaved: Joi.number().integer().min(0).optional(),
    comment: Joi.string().optional(),
    improvements: Joi.string().optional()
  }),

  // Template schemas
  createTemplate: Joi.object({
    templateContent: Joi.string().required(),
    variables: Joi.object().required(),
    usageGuide: Joi.string().optional()
  }),

  executeTemplate: Joi.object({
    variables: Joi.object().required(),
    executionType: Joi.string().valid('PREVIEW', 'COPY', 'SEND').default('PREVIEW')
  }),

  // Collection schemas
  createCollection: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().optional(),
    isPublic: Joi.boolean().default(false)
  }),

  // Search schemas
  searchQuery: Joi.object({
    q: Joi.string().optional(),
    categories: Joi.array().items(Joi.string()).optional(),
    departments: Joi.array().items(Joi.string()).optional(),
    difficulty: Joi.array().items(Joi.string().valid('BEGINNER', 'INTERMEDIATE', 'ADVANCED')).optional(),
    rating_min: Joi.number().min(1).max(5).optional(),
    date_from: Joi.date().optional(),
    date_to: Joi.date().optional(),
    sort: Joi.string().valid('relevance', 'created_at', 'rating', 'usage_count').default('relevance'),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0)
  }),

  // Conversation data schema (from extension)
  conversationData: Joi.object({
    session_id: Joi.string().required(),
    timestamp: Joi.date().required(),
    platform: Joi.string().valid('chatgpt', 'claude', 'copilot', 'bard').required(),
    model: Joi.string().optional(),
    conversation: Joi.object({
      prompt: Joi.string().required(),
      response: Joi.string().required(),
      tokens_used: Joi.number().integer().optional(),
      response_time: Joi.number().optional()
    }).required(),
    context: Joi.object({
      url: Joi.string().uri().optional(),
      tab_title: Joi.string().optional(),
      user_department: Joi.string().optional(),
      detected_category: Joi.string().optional()
    }).optional(),
    metadata: Joi.object({
      browser: Joi.string().optional(),
      extension_version: Joi.string().optional(),
      auto_tags: Joi.array().items(Joi.string()).optional()
    }).optional()
  }),

  // Common parameter schemas
  idParam: Joi.object({
    id: Joi.string().required()
  }),

  // Auth schemas
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required()
  })
};