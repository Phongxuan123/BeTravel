import express from "express";

import { validateQuery } from "../middleware/validate.middleware.js";
import * as contentController from "../controllers/publicContent.controller.js";
import {
  topicListQuerySchema,
  articleListQuerySchema,
  articleSearchQuerySchema,
} from "../validators/publicContent.validator.js";

/*
 * Endpoint CONG KHAI -- khong can Authorization. Moi truy van legal_articles
 * o day BAT BUOC di qua publicContent.service.js (loc status:'published' +
 * isCurrent:true), khong bao gio goi thang LegalArticle.find o day.
 */
const router = express.Router();

router.get("/countries", contentController.listCountries);
router.get("/countries/:code", contentController.getCountry);

router.get("/legal/topics", validateQuery(topicListQuerySchema), contentController.listTopics);
router.get(
  "/legal/articles",
  validateQuery(articleListQuerySchema),
  contentController.listArticles,
);
router.get("/legal/articles/:country/:slug", contentController.getArticle);
router.get(
  "/legal/search",
  validateQuery(articleSearchQuerySchema),
  contentController.searchArticles,
);

export default router;
