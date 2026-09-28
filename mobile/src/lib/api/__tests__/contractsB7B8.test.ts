import geoAlertFixture from '../../../../../contracts/fixtures/public.geoAlert.json';
import quickPhraseFixture from '../../../../../contracts/fixtures/public.quickPhrase.json';
import translateFixture from '../../../../../contracts/fixtures/translate.json';
import preferencesFixture from '../../../../../contracts/fixtures/preferences.json';
import { alertSchema, preferencesSchema, quickPhraseSchema } from '@/mocks/schemas';
import { apiRequest } from '../http';
import { fetchAlerts, setAlertsContext } from '../alerts';
import { fetchQuickPhrases, translateText } from '../translate';
import { updatePreferences } from '../preferences';

jest.mock('../http', () => ({ ...jest.requireActual('../http'), apiRequest: jest.fn() }));

// INV-15.1 (docs/07_QA_BugHunt.md): moi fixture phai duoc backend VA it nhat mot
// client doc. Bon fixture B7/B8 nay truoc QA-4 chi co backend kiem -- doi hinh
// dang response ma quen adapter mobile se khong test nao do.
describe('fixture B7/B8 qua adapter mobile khớp schema màn hình', () => {
  beforeEach(() => jest.clearAllMocks());

  it('public.geoAlert.json --> Alert', async () => {
    (apiRequest as jest.Mock).mockResolvedValueOnce(geoAlertFixture.data);
    setAlertsContext({ countryCode: 'KR', owner: 'contract@test.local' });
    const { data } = await fetchAlerts();
    expect(data).toHaveLength(1);
    expect(alertSchema.parse(data[0]).body).toBe(geoAlertFixture.data[0].message);
    setAlertsContext(null);
  });

  it('public.quickPhrase.json --> QuickPhrase', async () => {
    (apiRequest as jest.Mock).mockResolvedValueOnce(quickPhraseFixture.data);
    const { data } = await fetchQuickPhrases('KR');
    expect(quickPhraseSchema.parse(data[0]).translated).toBe(quickPhraseFixture.data[0].translated);
  });

  it('translate.json --> kết quả dịch', async () => {
    (apiRequest as jest.Mock).mockResolvedValueOnce(translateFixture.data);
    const result = await translateText('Tôi cần giúp đỡ', { countryCode: 'KR', from: 'Tiếng Việt', to: 'Tiếng Hàn' });
    expect(result).toEqual({ translated: expect.any(String), phonetic: expect.any(String) });
  });

  it('preferences.json --> Preferences', async () => {
    (apiRequest as jest.Mock).mockResolvedValueOnce(preferencesFixture.data);
    const { data } = await updatePreferences({ locationConsent: false });
    expect(preferencesSchema.parse(data)).toEqual(preferencesFixture.data);
  });
});
