import { fetchIncident, fetchIncidents, getIncidentProgress, setIncidentProgress } from '../incidents';
import { apiRequest } from '../http';

jest.mock('../http', () => ({ apiRequest: jest.fn() }));

const rawIncident = {
  _id: 'i1',
  slug: 'mat-ho-chieu',
  countryCode: null,
  title: 'Mất hộ chiếu',
  iconKey: 'IdCard',
  tone: 'red' as const,
  urgent: true,
  reassurance: 'Giữ bình tĩnh.',
  status: 'published' as const,
  steps: [{ order: 0, title: 'Bước 1', body: [], checklist: [], contactRefs: [], articleRefs: [], ctas: [] }],
};

test('fetchIncidents goi dung query country va giu nguyen step.order', async () => {
  (apiRequest as jest.Mock).mockResolvedValueOnce([rawIncident]);
  const result = await fetchIncidents('KR');
  expect(apiRequest).toHaveBeenCalledWith('/incidents?country=KR');
  expect(result.data[0].steps[0].order).toBe(0);
});

test('fetchIncident tra ve null (khong nem loi) khi 404', async () => {
  (apiRequest as jest.Mock).mockRejectedValueOnce(new Error('not found'));
  const result = await fetchIncident('khong-ton-tai');
  expect(result.data).toBeNull();
});

test('getIncidentProgress/setIncidentProgress goi dung endpoint', async () => {
  (apiRequest as jest.Mock).mockResolvedValueOnce({ completedSteps: [0] });
  const got = await getIncidentProgress('i1');
  expect(apiRequest).toHaveBeenCalledWith('/users/incident-progress/i1');
  expect(got.data.completedSteps).toEqual([0]);

  (apiRequest as jest.Mock).mockResolvedValueOnce({ completedSteps: [0, 1] });
  const put = await setIncidentProgress('i1', [0, 1]);
  expect(apiRequest).toHaveBeenCalledWith('/users/incident-progress/i1', { method: 'PUT', body: { completedSteps: [0, 1] } });
  expect(put.data.completedSteps).toEqual([0, 1]);
});
