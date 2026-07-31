import 'vuetify/styles'

import { createVuetify } from 'vuetify'

const sharedColors = {
  background: '#f8fafc',
  error: '#b91c1c',
  info: '#0369a1',
  primary: '#075985',
  secondary: '#475569',
  success: '#15803d',
  surface: '#ffffff',
  warning: '#a16207',
}

export const vuetify = createVuetify({
  defaults: {
    VBtn: {
      rounded: 'lg',
    },
  },
  display: {
    mobileBreakpoint: 'md',
    thresholds: {
      xs: 0,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536,
    },
  },
  theme: {
    defaultTheme: 'pqs',
    themes: {
      pqs: {
        dark: false,
        colors: sharedColors,
      },
    },
  },
})
