import { describe, expect, it } from 'vitest';
import countryFixture from '../../../../contracts/fixtures/admin.country.json';
import legalArticleFixture from '../../../../contracts/fixtures/admin.legalArticle.json';
import errorForbiddenFixture from '../../../../contracts/fixtures/error.forbidden.json';
import errorConflictFixture from '../../../../contracts/fixtures/error.conflict.json';
import { countryFixtureSchema, legalArticleFixtureSchema, errorEnvelopeSchema } from '../schemas';

// Doi chieu schema Zod phia admin voi fixture dung chung o contracts/fixtures/.
// Backend co test tuong ung o backend/test/contracts.test.js doi chieu CUNG
// cac file nay -- lech fixture se do o ca hai phia cung luc.
describe('contracts fixtures parse duoc bang schema admin', () => {
  it('admin.country.json khop countryFixtureSchema', () => {
    expect(countryFixtureSchema.parse(countryFixture.data)).toBeTruthy();
  });

  it('admin.legalArticle.json khop legalArticleFixtureSchema', () => {
    expect(legalArticleFixtureSchema.parse(legalArticleFixture.data)).toBeTruthy();
  });

  it('error.forbidden.json khop errorEnvelopeSchema', () => {
    expect(errorEnvelopeSchema.parse(errorForbiddenFixture.error)).toBeTruthy();
  });

  it('error.conflict.json khop errorEnvelopeSchema', () => {
    expect(errorEnvelopeSchema.parse(errorConflictFixture.error)).toBeTruthy();
  });
});
