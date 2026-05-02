// Qiwiosity brand palette — sampled from the teal speech-bubble logo.
export const colors = {
  primary: '#15888A',      // main teal (bubble body)
  primaryDark: '#0E5F5F',  // deep teal (Qiwiosity wordmark)
  primaryDeep: '#083D3D',  // darkest teal (bubble shadow / splash base)
  accent: '#E07B3C',       // warm orange (call-to-action highlight)
  bg: '#F5F3EF',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  muted: '#6B6B6B',
  border: '#E5E1D8',
  danger: '#C62828',
  success: '#2E7D32',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 6, md: 10, lg: 16, pill: 999 };

export const type = {
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  heading: { fontSize: 17, fontWeight: '600', color: colors.text },
  body: { fontSize: 14, color: colors.text },
  caption: { fontSize: 12, color: colors.muted },
};
