import { createAdminCrudController } from "../core/adminCrudController.js";
import * as incidentService from "../services/incident.service.js";

export const incidentsController = createAdminCrudController({
  entityType: "IncidentType",
  notFoundMessage: "Không tìm thấy hướng dẫn xử lý sự cố",
  service: {
    list: incidentService.listIncidentsAdmin,
    getById: incidentService.getIncidentById,
    create: incidentService.createIncident,
    update: incidentService.updateIncident,
    remove: incidentService.deleteIncident,
  },
});
