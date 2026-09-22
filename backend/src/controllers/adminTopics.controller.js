import { createAdminCrudController } from "../core/adminCrudController.js";
import * as topicService from "../services/legalTopic.service.js";

export const topicsController = createAdminCrudController({
  entityType: "LegalTopic",
  notFoundMessage: "Không tìm thấy chủ đề",
  service: {
    list: topicService.listTopics,
    getById: topicService.getTopicById,
    create: topicService.createTopic,
    update: topicService.updateTopic,
    remove: topicService.deleteTopic,
  },
});
