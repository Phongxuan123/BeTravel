import { createAdminCrudController } from "../core/adminCrudController.js";
import * as locationService from "../services/supportLocation.service.js";

export const locationsController = createAdminCrudController({
  entityType: "SupportLocation",
  notFoundMessage: "Không tìm thấy địa điểm hỗ trợ",
  service: {
    list: locationService.listLocations,
    getById: locationService.getLocationById,
    create: locationService.createLocation,
    update: locationService.updateLocation,
    remove: locationService.deleteLocation,
  },
});
