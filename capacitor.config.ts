import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor — StatusAds Connect
 *
 * O projecto web (Vite/PWA) e a app nativa partilham o MESMO código.
 * webDir aponta para o build de produção (npm run build → dist/).
 *
 * ── COMO COMPILAR ─────────────────────────────────────────────
 *   npm run build          (gera dist/)
 *   npx cap add android    (só na primeira vez)
 *   npx cap sync           (copia dist/ para o projecto nativo)
 *   npx cap open android   (abre no Android Studio → Build APK/AAB)
 *
 * ── BUILDS CAMUFLADOS ────────────────────────────────────────
 * Para gerar uma APK com nome/ícone disfarçados, mude os campos
 * abaixo ANTES de `npx cap sync` (ou use sabores/flavours do Gradle):
 *
 *   appName: 'Calculadora'          // nome visível no launcher
 *   // ícone: substitua android/app/src/main/res/<dpi>/ic_launcher.png
 *   // (guia completo em BUILD-NATIVA.md, secção "Builds Camuflados")
 *
 * NOTA iOS: requer macOS com Xcode. `npx cap add ios` → `npx cap open ios`.
 */

const config: CapacitorConfig = {
  appId: 'com.statusads.connect',
  appName: 'StatusAds Connect',
  webDir: 'dist',
  // Manter o ecrã ligado durante emergência activa (futuro: flag dinâmica)
  android: {
    allowMixedContent: false,
    backgroundColor: '#0C0B08',
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#0C0B08',
  },
  server: {
    androidScheme: 'https',
  },
}

export default config
