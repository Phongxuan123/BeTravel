import { createAdminCrudController } from "../core/adminCrudController.js";
import * as riskZoneService from "../services/riskZone.service.js";

export const riskZonesController = createAdminCrudController({
  entityType: "RiskZone",
  notFoundMessage: "Không tìm thấy vùng nguy cơ",
  service: {
    list: riskZoneService.listRiskZonesAdmin,
    getById: riskZoneService.getRiskZoneById,
    create: riskZoneService.createRiskZone,
    update: riskZoneService.updateRiskZone,
    remove: riskZoneService.deleteRiskZone,
  },
});
