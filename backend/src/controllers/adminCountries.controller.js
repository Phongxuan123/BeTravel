import { createAdminCrudController } from "../core/adminCrudController.js";
import * as countryService from "../services/country.service.js";

export const countriesController = createAdminCrudController({
  entityType: "Country",
  notFoundMessage: "Không tìm thấy quốc gia",
  service: {
    list: countryService.listCountries,
    getById: countryService.getCountryById,
    create: countryService.createCountry,
    update: countryService.updateCountry,
    remove: countryService.deleteCountry,
  },
});
