import { countries } from '../fixtures/countries';
import { topics } from '../fixtures/topics';
import { articles } from '../fixtures/articles';
import { trips } from '../fixtures/trips';
import { incidents } from '../fixtures/incidents';
import { alerts } from '../fixtures/alerts';
import { quickPhrases } from '../fixtures/quick-phrases';
import { supportLocations } from '../fixtures/support-locations';
import {
  countrySchema,
  topicSchema,
  articleSchema,
  tripSchema,
  incidentSchema,
  alertSchema,
  quickPhraseSchema,
  supportLocationSchema,
} from '../schemas';

describe('mock fixtures parse against their Zod schema (spec §7.5)', () => {
  it.each(countries)('country %#: $code', (c) => expect(() => countrySchema.parse(c)).not.toThrow());
  it.each(topics)('topic %#: $key', (t) => expect(() => topicSchema.parse(t)).not.toThrow());
  it.each(articles)('article %#: $slug', (a) => expect(() => articleSchema.parse(a)).not.toThrow());
  it.each(trips)('trip %#: $id', (t) => expect(() => tripSchema.parse(t)).not.toThrow());
  it.each(incidents)('incident %#: $slug', (i) => expect(() => incidentSchema.parse(i)).not.toThrow());
  it.each(alerts)('alert %#: $id', (a) => expect(() => alertSchema.parse(a)).not.toThrow());
  it.each(quickPhrases)('quick phrase %#: $id', (p) => expect(() => quickPhraseSchema.parse(p)).not.toThrow());
  it.each(supportLocations)('support location %#: $id', (s) => expect(() => supportLocationSchema.parse(s)).not.toThrow());

  it('every fixture is flagged __mock: true', () => {
    const all = [...countries, ...topics, ...articles, ...trips, ...incidents, ...alerts, ...quickPhrases, ...supportLocations];
    all.forEach((item) => expect(item.__mock).toBe(true));
  });
});
