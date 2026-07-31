import 'vuetify/styles'

import { createVuetify } from 'vuetify'

export const vuetify = createVuetify({
  theme: {
    defaultTheme: 'pqs',
    themes: {
      pqs: {
        dark: false,
        colors: {
          primary: '#075985',
          background: '#f8fafc',
          surface: '#ffffff',
        },
      },
    },
  },
})
