import { ok } from "../core/envelope.js";
import { toAppError } from "../core/domainErrors.js";
import * as quickPhraseService from "../services/quickPhrase.service.js";

export const list = async (req, res, next) => {
  try {
    const phrases = await quickPhraseService.listQuickPhrasesForCountry(req.query.country);
    return ok(res, phrases);
  } catch (error) {
    next(toAppError(error));
  }
};
