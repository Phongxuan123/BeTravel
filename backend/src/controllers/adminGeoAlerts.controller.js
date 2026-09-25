import { createAdminCrudController } from "../core/adminCrudController.js";
import * as geoAlertService from "../services/geoAlert.service.js";

export const geoAlertsController = createAdminCrudController({
  entityType: "GeoAlert",
  notFoundMessage: "Không tìm thấy cảnh báo",
  service: {
    list: geoAlertService.listGeoAlertsAdmin,
    getById: geoAlertService.getGeoAlertById,
    create: geoAlertService.createGeoAlert,
    update: geoAlertService.updateGeoAlert,
    remove: geoAlertService.deleteGeoAlert,
  },
});
