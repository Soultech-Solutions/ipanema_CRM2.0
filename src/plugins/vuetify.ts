/**
 * Primário: vermelho da marca · Secundário: preto · Accent: laranja CTA
 */

import { createVuetify } from 'vuetify'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

const racaLight = {
  dark: false,
  colors: {
    'background': '#F3F5F8',
    'surface': '#FFFFFF',
    'surface-bright': '#FFFFFF',
    'surface-light': '#EEF1F5',
    'surface-variant': '#DDE3EA',
    'on-surface-variant': '#4A5563',
    'primary': '#EB1823',
    'primary-darken-1': '#C4121C',
    'secondary': '#111111',
    'secondary-darken-1': '#000000',
    'accent': '#FF4800',
    'error': '#CA1F26',
    'info': '#333333',
    'success': '#2E7D32',
    'warning': '#FF4800',
    'on-background': '#111111',
    'on-surface': '#111111',
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
  },
}

const racaDark = {
  dark: true,
  colors: {
    'background': '#0A0A0A',
    'surface': '#161616',
    'surface-bright': '#222222',
    'surface-light': '#1A1A1A',
    'surface-variant': '#2A2A2A',
    'on-surface-variant': '#B0B0B0',
    'primary': '#FF3B45',
    'primary-darken-1': '#EB1823',
    'secondary': '#FFFFFF',
    'secondary-darken-1': '#E0E0E0',
    'accent': '#FF6A33',
    'error': '#FF5252',
    'info': '#B0B0B0',
    'success': '#66BB6A',
    'warning': '#FF6A33',
    'on-background': '#F5F5F5',
    'on-surface': '#F5F5F5',
    'on-primary': '#FFFFFF',
    'on-secondary': '#111111',
  },
}

export default createVuetify({
  theme: {
    defaultTheme: 'racaLight',
    themes: {
      racaLight,
      racaDark,
    },
  },
  defaults: {
    VCard: {
      rounded: 'lg',
    },
    VBtn: {
      rounded: 'lg',
      fontWeight: '600',
    },
    VChip: {
      rounded: 'lg',
    },
  },
})
