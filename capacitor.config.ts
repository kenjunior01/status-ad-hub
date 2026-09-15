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
  // v3.19.0 — comportamento NATIVO PREMIUM:
  //  · splash nativa some logo (a NativeSplash.tsx assume o arranque
  //    com a animação dourada — sem flash branco nem ecrã preto)
  //  · initNativeChrome() aplica a status bar escura dourada
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,      // some de imediato — a splash animada é em JS
      launchAutoHide: true,
      backgroundColor: '#0C0B08',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      // initNativeChrome() aplica Style.Dark + fundo dourado-escuro no arranque
      style: 'DARK',
      backgroundColor: '#0C0B08',
      overlaysWebView: false,
    },
  },
}

export default config
