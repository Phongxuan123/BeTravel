import { useState } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ItineraryEditor } from '../ItineraryEditor';
import type { Country, TripStop } from '@/lib/data';

test('thêm, điền và xóa chặng giữ nguyên chặng đầu', async () => {
  const countries = [{ code: 'KR', name: 'Hàn Quốc', status: 'active' }, { code: 'JP', name: 'Nhật Bản', status: 'active' }] as Country[];
  function Form() {
    const [stops, setStops] = useState<TripStop[]>([{ countryCode: 'KR', destinationCity: 'Seoul', startDate: '2026-10-01' }]);
    return <ItineraryEditor stops={stops} countries={countries} onChange={setStops} />;
  }
  const screen = await render(<Form />);
  await fireEvent.press(screen.getByLabelText('Thêm chặng hoặc quốc gia'));
  expect(screen.getByText('Chặng 2: JP')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Thành phố chặng 2'), 'Osaka');
  await fireEvent.changeText(screen.getByLabelText('Ngày bắt đầu chặng 2'), '2026-10-05');
  expect(screen.getByDisplayValue('Osaka')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Xóa chặng 2'));
  expect(screen.queryByDisplayValue('Osaka')).toBeNull();
  expect(screen.getByText('Seoul · từ 2026-10-01')).toBeTruthy();
});
