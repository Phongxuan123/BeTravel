import { render } from '@testing-library/react-native';
import { StepProgress } from '../StepProgress';

describe('StepProgress', () => {
  it('renders one bar per step', async () => {
    const { getByLabelText } = await render(<StepProgress total={4} current={2} />);
    expect(getByLabelText('Bước 2/4')).toBeTruthy();
  });
});
