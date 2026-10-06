import { colors, radii, spacing, typography } from '@/lib/theme';

describe('design tokens', () => {
  it('primary palette matches FRONTEND_UI_SPECIFICATION §1.1', () => {
    expect(colors.primary).toBe('#1677FF');
    expect(colors.danger).toBe('#EF4444');
    expect(colors.bg).toBe('#F5F9FF');
  });

  it('radius scale matches FRONTEND_UI_SPECIFICATION §1.3', () => {
    expect(radii).toEqual({ sm: 10, md: 12, lg: 16, xl: 24, full: 999 });
  });

  it('spacing scale matches spec §2.4', () => {
    expect(spacing).toEqual({ xs: 6, sm: 10, md: 14, lg: 18, xl: 24 });
  });

  it('every typography role has a font family, size and line-height', () => {
    Object.values(typography).forEach((role) => {
      expect(role.fontFamily).toBeTruthy();
      expect(role.fontSize).toBeGreaterThan(0);
      expect(role.lineHeight).toBeGreaterThan(0);
    });
  });
});
