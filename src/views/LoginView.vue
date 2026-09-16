<script lang="ts" setup>
  import { onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import logoRaca from '@/assets/logo-raca.png'
  import { useAuthStore } from '@/stores/auth'

  const auth = useAuthStore()
  const router = useRouter()
  const route = useRoute()

  const email = ref('')
  const password = ref('')
  const showPassword = ref(false)

  onMounted(async () => {
    if (auth.isAuthenticated) {
      const ok = await auth.hydrate()
      if (ok) {
        await router.replace((route.query.redirect as string) || '/')
      }
    }
  })

  async function submit () {
    await auth.login(email.value, password.value)
    const redirect = (route.query.redirect as string) || '/'
    await router.replace(redirect)
  }
</script>

<template>
  <div class="login-page">
    <div class="login-atmosphere" aria-hidden="true" />

    <div class="login-panel">
      <div class="login-brand mb-8">
        <img
          :src="logoRaca"
          alt="Ipanema rolamentos"
          class="login-logo mb-4"
        >
        <h1 class="brand-wordmark login-title">
          Raça
        </h1>
        <p class="login-subtitle mb-0">
          Analista comercial
        </p>
      </div>

      <v-form @submit.prevent="submit">
        <v-text-field
          v-model="email"
          autocomplete="username"
          class="mb-2"
          label="E-mail"
          prepend-inner-icon="mdi-email-outline"
          type="email"
          variant="outlined"
          :disabled="auth.loading"
          required
        />

        <v-text-field
          v-model="password"
          autocomplete="current-password"
          class="mb-2"
          label="Senha"
          prepend-inner-icon="mdi-lock-outline"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          :disabled="auth.loading"
          :type="showPassword ? 'text' : 'password'"
          variant="outlined"
          required
          @click:append-inner="showPassword = !showPassword"
        />

        <v-alert
          v-if="auth.error"
          class="mb-4"
          density="compact"
          type="error"
          variant="tonal"
        >
          {{ auth.error }}
        </v-alert>

        <v-btn
          block
          color="primary"
          size="large"
          type="submit"
          :loading="auth.loading"
        >
          Entrar
        </v-btn>
      </v-form>

      <p class="text-caption text-medium-emphasis mt-6 mb-0 text-center">
        Use a conta Directus da equipe comercial.
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  overflow: hidden;
  background: #0a0a0a;
}

.login-atmosphere {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 20% 0%, rgba(235, 24, 35, 0.35), transparent 55%),
    radial-gradient(ellipse 60% 40% at 90% 80%, rgba(255, 72, 0, 0.18), transparent 50%),
    linear-gradient(160deg, #000 0%, #141414 55%, #1a0a0b 100%);
  pointer-events: none;
}

.login-panel {
  position: relative;
  z-index: 1;
  width: min(100%, 400px);
  padding: 2rem 1.75rem;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}

.login-brand {
  text-align: center;
}

.login-logo {
  width: 72px;
  height: 72px;
  object-fit: contain;
}

.login-title {
  color: #000;
  font-size: clamp(2.75rem, 8vw, 3.5rem);
  margin: 0;
}

.login-subtitle {
  font-family: var(--raca-font);
  font-size: 0.95rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #666;
}
</style>
