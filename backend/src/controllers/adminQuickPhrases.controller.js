import { createAdminCrudController } from "../core/adminCrudController.js";
import * as quickPhraseService from "../services/quickPhrase.service.js";

export const quickPhrasesController = createAdminCrudController({
  entityType: "QuickPhrase",
  notFoundMessage: "Không tìm thấy câu dịch sẵn",
  service: {
    list: quickPhraseService.listQuickPhrasesAdmin,
    getById: quickPhraseService.getQuickPhraseById,
    create: quickPhraseService.createQuickPhrase,
    update: quickPhraseService.updateQuickPhrase,
    remove: quickPhraseService.deleteQuickPhrase,
  },
});
