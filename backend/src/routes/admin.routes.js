import express from "express";

import { authenticateToken, requireRole } from "../middleware/auth.middleware.js";
import { validateBody, validateQuery } from "../middleware/validate.middleware.js";
import { UserRole } from "../core/constants.js";

import { countriesController } from "../controllers/adminCountries.controller.js";
import { topicsController } from "../controllers/adminTopics.controller.js";
import { locationsController, bulkImport as locationsBulkImport, bulkVerify as locationsBulkVerify } from "../controllers/adminLocations.controller.js";
import * as articlesController from "../controllers/adminArticles.controller.js";
import * as auditController from "../controllers/adminAudit.controller.js";
import * as dashboardController from "../controllers/adminDashboard.controller.js";
import * as ragController from "../controllers/adminRag.controller.js";
import * as feedbackController from "../controllers/adminFeedback.controller.js";
import * as analyticsController from "../controllers/adminAnalytics.controller.js";
import { incidentsController } from "../controllers/adminIncidents.controller.js";
import { quickPhrasesController } from "../controllers/adminQuickPhrases.controller.js";

import {
  countryCreateSchema,
  countryUpdateSchema,
  countryListQuerySchema,
  topicCreateSchema,
  topicUpdateSchema,
  topicListQuerySchema,
  articleCreateSchema,
  articleUpdateSchema,
  articleListQuerySchema,
  articleStatusChangeSchema,
  locationCreateSchema,
  locationUpdateSchema,
  locationListQuerySchema,
  locationBulkImportSchema,
  locationBulkVerifySchema,
  auditListQuerySchema,
  ragReindexCountrySchema,
  ragStatusQuerySchema,
  feedbackListQuerySchema,
  feedbackStatusUpdateSchema,
  analyticsOverviewQuerySchema,
  incidentCreateSchema,
  incidentUpdateSchema,
  incidentListQuerySchema,
  quickPhraseCreateSchema,
  quickPhraseUpdateSchema,
  quickPhraseListQuerySchema,
} from "../validators/admin.validator.js";

const router = express.Router();

/*
 * RBAC o BACKEND cho TOAN BO /api/admin/* -- an nut phia client khong tinh la
 * bao ve (CLAUDE.md Phan 4.1). Ap dung mot lan o day, moi route con thua huong.
 */
router.use(authenticateToken, requireRole(UserRole.ADMIN));

router.get("/dashboard", dashboardController.get);

router.get("/countries", validateQuery(countryListQuerySchema), countriesController.list);
router.post("/countries", validateBody(countryCreateSchema), countriesController.create);
router.get("/countries/:id", countriesController.get);
router.patch("/countries/:id", validateBody(countryUpdateSchema), countriesController.update);
router.delete("/countries/:id", countriesController.remove);

router.get("/topics", validateQuery(topicListQuerySchema), topicsController.list);
router.post("/topics", validateBody(topicCreateSchema), topicsController.create);
router.get("/topics/:id", topicsController.get);
router.patch("/topics/:id", validateBody(topicUpdateSchema), topicsController.update);
router.delete("/topics/:id", topicsController.remove);

router.get("/legal/articles", validateQuery(articleListQuerySchema), articlesController.list);
router.post("/legal/articles", validateBody(articleCreateSchema), articlesController.create);
router.get("/legal/articles/:id", articlesController.get);
router.patch("/legal/articles/:id", validateBody(articleUpdateSchema), articlesController.update);
router.post(
  "/legal/articles/:id/status",
  validateBody(articleStatusChangeSchema),
  articlesController.changeStatus,
);
router.post("/legal/articles/:id/new-version", articlesController.newVersion);

router.get("/locations", validateQuery(locationListQuerySchema), locationsController.list);
router.post("/locations", validateBody(locationCreateSchema), locationsController.create);
router.post("/locations/bulk-import", validateBody(locationBulkImportSchema), locationsBulkImport);
router.post("/locations/bulk-verify", validateBody(locationBulkVerifySchema), locationsBulkVerify);
router.get("/locations/:id", locationsController.get);
router.patch("/locations/:id", validateBody(locationUpdateSchema), locationsController.update);
router.delete("/locations/:id", locationsController.remove);

router.get("/audit", validateQuery(auditListQuerySchema), auditController.list);

router.post("/rag/reindex-country", validateBody(ragReindexCountrySchema), ragController.reindexCountry);
router.get("/rag/status", validateQuery(ragStatusQuerySchema), ragController.status);

router.get("/feedback", validateQuery(feedbackListQuerySchema), feedbackController.list);
router.get("/feedback/:id", feedbackController.get);
router.patch("/feedback/:id", validateBody(feedbackStatusUpdateSchema), feedbackController.updateStatus);

router.get("/analytics/overview", validateQuery(analyticsOverviewQuerySchema), analyticsController.overview);

router.get("/incidents", validateQuery(incidentListQuerySchema), incidentsController.list);
router.post("/incidents", validateBody(incidentCreateSchema), incidentsController.create);
router.get("/incidents/:id", incidentsController.get);
router.patch("/incidents/:id", validateBody(incidentUpdateSchema), incidentsController.update);
router.delete("/incidents/:id", incidentsController.remove);

router.get("/quick-phrases", validateQuery(quickPhraseListQuerySchema), quickPhrasesController.list);
router.post("/quick-phrases", validateBody(quickPhraseCreateSchema), quickPhrasesController.create);
router.get("/quick-phrases/:id", quickPhrasesController.get);
router.patch("/quick-phrases/:id", validateBody(quickPhraseUpdateSchema), quickPhrasesController.update);
router.delete("/quick-phrases/:id", quickPhrasesController.remove);

export default router;
