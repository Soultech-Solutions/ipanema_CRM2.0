/**
 * Tema Gestão Ipanema — Inteligência Comercial.
 * Tokens extraídos do frame "00.1 • Design System" do Figma.
 * Primário: navy institucional · vermelho/verde/dourado/azul como cores semânticas · fonte: Inter.
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
    'background': '#F5F7FA',
    'surface': '#FFFFFF',
    'surface-bright': '#FFFFFF',
    'surface-light': '#F5F7FA',
    'surface-variant': '#E4E9EF',
    'on-surface-variant': '#667484',
    'primary': '#17324D',
    'primary-darken-1': '#102338',
    'secondary': '#2F6B9A',
    'secondary-darken-1': '#245377',
    'accent': '#B39B5E',
    'error': '#D9232E',
    'info': '#2F6B9A',
    'success': '#1D7A4D',
    'warning': '#B39B5E',
    'on-background': '#16212B',
    'on-surface': '#16212B',
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
  },
}

/** O Figma não define tema escuro — este é derivado do claro (a validar com o design). */
const ipanemaDark = {
  dark: true,
  colors: {
    'background': '#0F1923',
    'surface': '#16212B',
    'surface-bright': '#1E2C3A',
    'surface-light': '#121C26',
    'surface-variant': '#243545',
    'on-surface-variant': '#B6C2CE',
    'primary': '#5B8DBF',
    'primary-darken-1': '#2F6B9A',
    'secondary': '#7FB0D8',
    'secondary-darken-1': '#2F6B9A',
    'accent': '#CDB87E',
    'error': '#EF5560',
    'info': '#7FB0D8',
    'success': '#4CAF7D',
    'warning': '#CDB87E',
    'on-background': '#F5F7FA',
    'on-surface': '#F5F7FA',
    'on-primary': '#FFFFFF',
    'on-secondary': '#0F1923',
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
    VCard: { rounded: 'xl' },
    VBtn: { rounded: 'lg', fontWeight: '600' },
    VChip: { rounded: 'pill' },
  },
})