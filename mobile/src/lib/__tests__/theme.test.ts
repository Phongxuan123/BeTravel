import { colors, radii, spacing, typography } from '@/lib/theme';

describe('design tokens', () => {
  it('primary palette matches spec §2.1', () => {
    expect(colors.primary).toBe('#0F5BD7');
    expect(colors.danger).toBe('#D62828');
    expect(colors.bg).toBe('#F6F9FE');
  });

  it('radius scale matches spec §2.3', () => {
    expect(radii).toEqual({ sm: 11, md: 14, lg: 18, xl: 22, full: 999 });
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
