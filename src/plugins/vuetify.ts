/**
 * Tema Ipanema CRM 2.0 — extraído do Figma aprovado pelo cliente.
 * Primário: vermelho institucional Ipanema · fonte: Inter.
 */

import { createVuetify } from 'vuetify'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

const ipanemaLight = {
  dark: false,
  colors: {
    'background': '#F7F8FA',
    'surface': '#FFFFFF',
    'surface-bright': '#FFFFFF',
    'surface-light': '#F7F8FA',
    'surface-variant': '#E6E8EC',
    'on-surface-variant': '#667085',
    'primary': '#C61F3E',
    'primary-darken-1': '#A5192F',
    'secondary': '#1E2329',
    'secondary-darken-1': '#111111',
    'accent': '#2563EB',
    'error': '#C61F3E',
    'info': '#2563EB',
    'success': '#2E8B57',
    'warning': '#D97706',
    'on-background': '#1E2329',
    'on-surface': '#1E2329',
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
  },
}

const ipanemaDark = {
  dark: true,
  colors: {
    'background': '#161A1F',
    'surface': '#20252B',
    'surface-bright': '#2B3138',
    'surface-light': '#1A1E24',
    'surface-variant': '#2B3138',
    'on-surface-variant': '#D7DCE3',
    'primary': '#E14A64',
    'primary-darken-1': '#C61F3E',
    'secondary': '#FFFFFF',
    'secondary-darken-1': '#E0E0E0',
    'accent': '#5B8DEF',
    'error': '#E14A64',
    'info': '#5B8DEF',
    'success': '#4CAF7D',
    'warning': '#E8A33D',
    'on-background': '#F5F5F5',
    'on-surface': '#F5F5F5',
    'on-primary': '#FFFFFF',
    'on-secondary': '#111111',
  },
}

export default createVuetify({
  theme: {
    defaultTheme: 'ipanemaLight',
    themes: {
      ipanemaLight,
      ipanemaDark,
    },
  },
  defaults: {
    VCard: {
      rounded: 'xl',
    },
    VBtn: {
      rounded: 'lg',
      fontWeight: '600',
    },
    VChip: {
      rounded: 'pill',
    },
  },
})