const { colors, fontFamily, radii } = require('./src/styles/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        'primary-strong': colors.primaryStrong,
        'primary-soft': colors.primarySoft,
        bg: colors.bg,
        surface: colors.surface,
        ink: colors.ink,
        muted: colors.muted,
        subtle: colors.subtle,
        line: colors.line,
        success: colors.success,
        'success-soft': colors.successSoft,
        warning: colors.warning,
        'warning-soft': colors.warningSoft,
        'amber-soft': colors.amberSoft,
        cream: colors.cream,
        'cream-line': colors.creamLine,
        danger: colors.danger,
        'danger-soft': colors.dangerSoft,
        'danger-tint': colors.dangerTint,
        'danger-line': colors.dangerLine,
      },
      fontFamily: {
        display: [fontFamily.display],
        'display-xl': [fontFamily.displayExtraBold],
        body: [fontFamily.body],
        'body-medium': [fontFamily.bodyMedium],
        'body-semibold': [fontFamily.bodySemiBold],
        'body-bold': [fontFamily.bodyBold],
      },
      borderRadius: {
        sm: `${radii.sm}px`,
        md: `${radii.md}px`,
        lg: `${radii.lg}px`,
        xl: `${radii.xl}px`,
      },
    },
  },
  plugins: [],
};
