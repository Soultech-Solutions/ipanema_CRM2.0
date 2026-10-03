/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Composables
import { createApp } from 'vue'

// Plugins
import { registerPlugins } from '@/plugins'

// Components
import App from './App.vue'

// Styles
// Styles
import 'unfonts.css'
import '@/styles/brand.scss'
import '@/styles/ipanema-tokens.scss'


const app = createApp(App)

registerPlugins(app)

app.mount('#app')
