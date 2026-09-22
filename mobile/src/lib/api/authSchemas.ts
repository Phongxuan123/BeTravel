import { z } from 'zod';

/**
 * Schema Zod phía mobile cho hình dạng `user` và các response auth.
 * Đối chiếu 1-1 với backend/src/core/serializers.js và contracts/README.md §5.
 * Test trong __tests__/contracts.test.ts parse trực tiếp fixture bằng schema
 * này -- lệch hình dạng sẽ đỏ test ở đây, phát hiện trước khi tích hợp.
 */
export const apiUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  role: z.enum(['user', 'admin']),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const apiMeUserSchema = apiUserSchema.extend({ googleLinked: z.boolean() });

export const registerResponseSchema = z.object({ user: apiUserSchema });

export const sessionResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string(),
  expiresIn: z.string(),
  user: apiUserSchema,
});

export const meResponseSchema = z.object({ user: apiMeUserSchema });

export const errorEnvelopeSchema = z.object({
  code: z.enum([
    'VALIDATION_ERROR',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'CONFLICT',
    'RATE_LIMITED',
    'QUOTA_EXCEEDED',
    'UPSTREAM_ERROR',
    'INSUFFICIENT_EVIDENCE',
    'INTERNAL_ERROR',
  ]),
  message: z.string(),
  details: z.unknown().optional(),
});
