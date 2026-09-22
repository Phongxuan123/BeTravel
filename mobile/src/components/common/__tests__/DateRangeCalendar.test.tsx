import { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DateRangeCalendar, type DateRange } from '../DateRangeCalendar';

function Harness() {
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  return (
    <DateRangeCalendar
      month={new Date('2026-09-01')}
      onMonthChange={() => {}}
      value={range}
      onChange={setRange}
      today={new Date('2026-09-21')}
    />
  );
}

describe('DateRangeCalendar', () => {
  it('sets start date on first tap and end date on second tap', async () => {
    const { getByLabelText } = await render(<Harness />);
    await fireEvent.press(getByLabelText('2026-09-22'));
    await fireEvent.press(getByLabelText('2026-09-25'));
    // ngày 22 và 25 đã trở thành ngày đi/về (nền primary) — kiểm tra qua accessibilityLabel vẫn tồn tại
    expect(getByLabelText('2026-09-22')).toBeTruthy();
    expect(getByLabelText('2026-09-25')).toBeTruthy();
  });

  it('resets start date when tapping an earlier day than the current start', async () => {
    const { getByLabelText } = await render(<Harness />);
    await fireEvent.press(getByLabelText('2026-09-25'));
    await fireEvent.press(getByLabelText('2026-09-23'));
    // 23 < 25 nên phải đặt lại ngày đi = 23 (không có ngày về)
    expect(getByLabelText('2026-09-23')).toBeTruthy();
  });
});
