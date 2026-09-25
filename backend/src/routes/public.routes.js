import express from "express";

import { validateQuery } from "../middleware/validate.middleware.js";
import * as contentController from "../controllers/publicContent.controller.js";
import * as locationController from "../controllers/publicSupportLocation.controller.js";
import * as incidentController from "../controllers/publicIncident.controller.js";
import * as quickPhraseController from "../controllers/publicQuickPhrase.controller.js";
import {
  topicListQuerySchema,
  articleListQuerySchema,
  articleSearchQuerySchema,
  supportLocationNearbyQuerySchema,
  supportLocationListQuerySchema,
  incidentListQuerySchema,
  quickPhraseListQuerySchema,
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

router.get(
  "/support-locations/nearby",
  validateQuery(supportLocationNearbyQuerySchema),
  locationController.nearby,
);
router.get(
  "/support-locations",
  validateQuery(supportLocationListQuerySchema),
  locationController.list,
);

router.get("/incidents", validateQuery(incidentListQuerySchema), incidentController.list);
router.get("/incidents/:slug", incidentController.get);

router.get("/quick-phrases", validateQuery(quickPhraseListQuerySchema), quickPhraseController.list);

export default router;
