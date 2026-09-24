import countryFixture from '../../../../../contracts/fixtures/public.country.json';
import topicFixture from '../../../../../contracts/fixtures/public.legalTopic.json';
import articleFixture from '../../../../../contracts/fixtures/public.legalArticle.json';
import searchFixture from '../../../../../contracts/fixtures/public.legalSearch.json';
import tripFixture from '../../../../../contracts/fixtures/trip.json';
import supportLocationFixture from '../../../../../contracts/fixtures/public.supportLocation.json';
import {
  adaptArticle,
  adaptCountry,
  adaptSearchHit,
  adaptSupportLocation,
  adaptTopic,
  adaptTrip,
  type ApiCountry,
  type ApiSupportLocation,
} from '../adapters';
import { articleSchema, countrySchema, searchResultSchema, supportLocationSchema, topicSchema, tripSchema } from '@/mocks/schemas';

// Doi chieu adapters.ts voi fixture dung chung o contracts/fixtures/ -- backend
// co test tuong ung trong backend/test/contracts.test.js doi chieu CUNG cac
// file nay. Lech fixture se do test o CA HAI phia cung luc.
describe('adapters.ts chuyen du lieu API that sang dung shape man hinh dang dung', () => {
  it('adaptCountry(public.country.json) khop countrySchema', () => {
    const [active, comingSoon] = (countryFixture.data as ApiCountry[]).map(adaptCountry);
    expect(countrySchema.parse(active)).toBeTruthy();
    expect(active.status).toBe('active');
    expect(countrySchema.parse(comingSoon)).toBeTruthy();
    expect(comingSoon.status).toBe('coming_soon');
  });

  it('adaptTopic(public.legalTopic.json) khop topicSchema', () => {
    const topic = adaptTopic(topicFixture.data[0]);
    expect(topicSchema.parse(topic)).toBeTruthy();
    expect(topic.key).toBe('giao-thong');
  });

  it('adaptArticle(public.legalArticle.json) khop articleSchema', () => {
    const article = adaptArticle(articleFixture.data as never);
    expect(articleSchema.parse(article)).toBeTruthy();
    expect(article.status).toBe('active');
    expect(article.saved).toBe(false);
  });

  it('adaptSearchHit(public.legalSearch.json) khop searchResultSchema', () => {
    const hit = adaptSearchHit(searchFixture.data[0]);
    expect(searchResultSchema.parse(hit)).toBeTruthy();
  });

  it('adaptTrip(trip.json) khop tripSchema va cat ngay ve dang YYYY-MM-DD', () => {
    const trip = adaptTrip(tripFixture.data);
    expect(tripSchema.parse(trip)).toBeTruthy();
    expect(trip.destinationCity).toBe('Seoul');
    expect(trip.destinationDetail).toBe('Gangnam-gu');
    expect(trip.startDate).toBe('2026-10-01');
    expect(trip.endDate).toBe('2026-10-10');
  });

  it('adaptSupportLocation(public.supportLocation.json) khop supportLocationSchema, dao dung [lng,lat] -> {lat,lng}', () => {
    const api = supportLocationFixture.data[0] as unknown as ApiSupportLocation;
    const location = adaptSupportLocation(api);
    expect(supportLocationSchema.parse(location)).toBeTruthy();
    expect(location.lat).toBe(37.5407);
    expect(location.lng).toBe(127.0016);
    expect(location.verified).toBe(true);
    expect(location.distanceKm).toBeUndefined();
  });

  it('adaptSupportLocation gan distanceKm tu distanceMeters khi tra ve tu /nearby', () => {
    const api = supportLocationFixture.data[0] as unknown as ApiSupportLocation;
    const location = adaptSupportLocation({ ...api, distanceMeters: 450 });
    expect(location.distanceKm).toBeCloseTo(0.45);
    expect(location.meta).toContain('450 m');
  });
});
