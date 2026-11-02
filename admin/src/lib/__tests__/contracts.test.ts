import { describe, expect, it } from 'vitest';
import countryFixture from '../../../../contracts/fixtures/admin.country.json';
import legalArticleFixture from '../../../../contracts/fixtures/admin.legalArticle.json';
import errorForbiddenFixture from '../../../../contracts/fixtures/error.forbidden.json';
import errorConflictFixture from '../../../../contracts/fixtures/error.conflict.json';
import assistantSettingsFixture from '../../../../contracts/fixtures/admin.assistantSettings.json';
import assistantMessagesFixture from '../../../../contracts/fixtures/admin.assistantMessages.json';
import assistantMetricsFixture from '../../../../contracts/fixtures/admin.assistantMetrics.json';
import {
  countryFixtureSchema,
  legalArticleFixtureSchema,
  errorEnvelopeSchema,
  assistantSettingsFixtureSchema,
  assistantQaItemFixtureSchema,
  assistantMetricsFixtureSchema,
} from '../schemas';

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

  it('admin.assistant*.json khop schema trang Tro ly AI', () => {
    expect(assistantSettingsFixtureSchema.parse(assistantSettingsFixture.data)).toBeTruthy();
    for (const item of assistantMessagesFixture.data) {
      expect(assistantQaItemFixtureSchema.parse(item)).toBeTruthy();
    }
    expect(assistantMetricsFixtureSchema.parse(assistantMetricsFixture.data)).toBeTruthy();
  });
});
