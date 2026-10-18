import express from "express";

import { requireLegalLookupEnabled } from "../middleware/legalLookup.middleware.js";
import { lawsRateLimit, lawsTranslateRateLimit } from "../middleware/rateLimit.middleware.js";
import { validateParams, validateQuery } from "../middleware/validate.middleware.js";
import * as lawsController from "../controllers/laws.controller.js";
import {
  titleIdParamSchema,
  listQuerySchema,
  searchQuerySchema,
  versionsQuerySchema,
  contentQuerySchema,
  contentViQuerySchema,
} from "../validators/laws.validator.js";

/*
 * Luật liên bang Úc -- CÔNG KHAI, chỉ đọc, không cần đăng nhập. Rate limit theo
 * IP vì mỗi request có thể chuyển thành một lần gọi API của cơ quan Úc.
 * Thứ tự quan trọng: "/search" và "/topics" phải đứng trước "/:id".
 */
const router = express.Router();

router.use(requireLegalLookupEnabled, lawsRateLimit);

router.get("/australia", validateQuery(listQuerySchema), lawsController.listAustralia);
router.get("/australia/search", validateQuery(searchQuerySchema), lawsController.listAustralia);
router.get("/australia/topics", lawsController.topicsAustralia);
router.get("/australia/:id", validateParams(titleIdParamSchema), lawsController.getAustralia);
router.get(
  "/australia/:id/versions",
  validateParams(titleIdParamSchema),
  validateQuery(versionsQuerySchema),
  lawsController.versionsAustralia,
);
router.get(
  "/australia/:id/summary",
  validateParams(titleIdParamSchema),
  lawsController.summaryAustralia,
);
router.get(
  "/australia/:id/content-vi",
  lawsTranslateRateLimit,
  validateParams(titleIdParamSchema),
  validateQuery(contentViQuerySchema),
  lawsController.contentViAustralia,
);
router.get(
  "/australia/:id/content",
  validateParams(titleIdParamSchema),
  validateQuery(contentQuerySchema),
  lawsController.contentAustralia,
);

export default router;
