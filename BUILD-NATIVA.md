# StatusAds Connect — Guia de Build Nativa (Capacitor)

Este guia transforma o projecto web/PWA em **app nativa Android e iOS**, com suporte
para **builds camuflados** (nome e ícone à escolha). O código é um só — o que muda é
a embalagem.

---

## 0. Estado actual — APK JÁ COMPILADA ✅

A versão nativa Android está **compilada e assinada** (v3.2.0, versionCode 32):

| Artefacto | Ficheiro | Tamanho | Uso |
|-----------|----------|---------|-----|
| **Release assinada** | `StatusAdsConnect-v3.2.0.apk` | 6.7 MB | Distribuição directa (WhatsApp, site) |
| Debug | `StatusAdsConnect-v3.2.0-debug.apk` | 9.3 MB | Testes de desenvolvimento |

- Pacote: `com.statusads.connect` · minSdk 24 (Android 7.0+) · targetSdk 36 (Android 16)
- Permissões incluídas: INTERNET, LOCALIZAÇÃO (fina+coarse), CÂMARA, MICROFONE,
  SENSORES_ALTA_FREQ (detecção de queda), VIBRAR, NOTIFICAÇÕES (Android 13+), WAKE_LOCK,
  ALARME_EXACTO (lembretes check-in), BOOT_COMPLETED
- Ícones e splash dourados gerados (@capacitor/assets, fundo #0C0B08)
- Plugins nativos: Geolocation, Haptics, StatusBar, SplashScreen, LocalNotifications, Share
- Ponte nativa em `src/lib/native.ts` — GPS/haptics/status-bar usam plugins na APK e
  degradam para APIs web no browser (o código web continua intacto)

**Keystore de release**: `statusads-release.keystore` (alias `statusads`, validade 25 anos,
senha definida na criação). **GUARDA ESTE FICHEIRO** — sem ele não é possível actualizar
a app instalada. As credenciais ficam em `android/keystore.properties` (não commitado).

Ambiente verificado: JDK 21 (Temurin), Android SDK 36 + build-tools 36.0.0,
Gradle wrapper 8.14.3 (auto-transferido), AGP via Capacitor 8.

---

## 1. Pré-requisitos

| Para | Precisas de |
|------|-------------|
| Android | JDK 21 (ex.: Temurin), Android SDK `platforms;android-36` + `build-tools;36.0.0` |
| iOS | Mac com Xcode 15+ (obrigatório — não há forma de contornar) |
| Ambos | Node 18+, npm (`npm install` já feito) |

```bash
# Ambiente (ajusta caminhos):
export JAVA_HOME=<caminho do JDK 21>
export ANDROID_HOME=<caminho do Android SDK>
```

O Capacitor já está instalado e configurado (`capacitor.config.ts`,
scripts `cap:*` no package.json, plataforma `android/` já criada).

---

## 2. Build Android — comandos verificados

```bash
npm run build            # gera dist/ (o front web)
npx cap sync             # copia dist/ + plugins para o projecto nativo
cd android
./gradlew assembleDebug      # APK debug  → app/build/outputs/apk/debug/
./gradlew assembleRelease    # APK assinada → app/build/outputs/apk/release/
```

Com Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**.

Para distribuição directa (fora da Play Store), instala a APK release activando
"Fontes desconhecidas" no telemóvel. A assinatura usa `android/keystore.properties`
(ver secção 2.2) — sem esse ficheiro o build release sai sem assinar (só debug funciona).

### 2.1 Publicar na Play Store
1. Gera um AAB: `./gradlew bundleRelease`
2. Cria conta Google Play Developer ($25 única)
3. **Nota importante para apps de segurança**: a Play Store pede
   declaração de uso de localização em segundo plano — descreve o caso
   de uso anti-rapto (a app já pede permissões "enquanto em uso").

### 2.2 Assinatura de Release (já configurada)
O `android/app/build.gradle` lê credenciais de `android/keystore.properties`:

```properties
storeFile=<caminho absoluto do statusads-release.keystore>
storePassword=<senha>
keyAlias=statusads
keyPassword=<senha>
```

`keystore.properties` está no `.gitignore` — nunca commitar. Para recriar um keystore novo:

```bash
keytool -genkeypair -v -keystore statusads-release.keystore -alias statusads \
  -keyalg RSA -keysize 2048 -validity 10950 \
  -dname "CN=StatusAds Connect, OU=Mozambique, O=StatusAds, L=Maputo, C=MZ"
```

⚠️ Se perderes o keystore, não consegues actualizar a app para quem já instalou
(terias de mudar o `appId`). Guarda backup seguro (cofre de passwords, 2 cópias).

---

## 3. Build iOS (só no Mac)

```bash
npm run cap:sync
npm run cap:open:ios   # abre no Xcode → Product → Run
```

⚠️ **iOS e Bluetooth**: o Safari/WebView do iOS NÃO suporta Web Bluetooth.
Para BLE no iOS é obrigatório o plugin nativo (secção 5). No Android o
WebView também não expõe Web Bluetooth de forma fiável — usa o plugin.

---

## 4. Builds Camuflados (nome + ícone disfarçados)

Cada disfarce é um "flavor" do mesmo código.

### 4.1 Nome da app
Em `capacitor.config.ts`, muda `appName` **antes** do `cap sync`:

```ts
appName: 'Calculadora'   // ex.: disfarce calculadora
```

Depois `npm run cap:sync && npx cap open android` e compila.

### 4.2 Ícone e splash (automático)
Instala os assets uma vez:

```bash
npm install -D @capacitor/assets
```

Cria a pasta `assets/` (já existente neste projecto):
- `assets/icon-only.png` (1024×1024) — o ícone do disfarce
- `assets/icon-foreground.png` (1024×1024) — capa do ícone adaptativo
- `assets/splash.png` + `assets/splash-dark.png` (2732×2732) — ecrã inicial

Gera todos os tamanhos:

```bash
npx @capacitor/assets generate --android --iconBackgroundColor '#0C0B08' \
  --iconBackgroundColorDark '#0C0B08' --splashBackgroundColor '#0C0B08' --splashBackgroundColorDark '#0C0B08'
```

### 4.3 Exemplo: 3 builds camuflados
```bash
# Calculadora
sed -i "s/appName: .*/appName: 'Calculadora',/" capacitor.config.ts
npm run cap:sync && cd android && ./gradlew assembleRelease && cd ..

# Meteorologia
sed -i "s/appName: .*/appName: 'Meteorologia',/" capacitor.config.ts
npm run cap:sync && cd android && ./gradlew assembleRelease && cd ..
```

Para ícones diferentes por disfarce, guarda pastas `resources-calculadora/`,
`resources-clima/` etc. e copia a certa para `resources/` antes de gerar.
Para variantes instaláveis lado a lado no mesmo telemóvel, muda também o
`appId` (ex.: `com.statusads.calc`, `com.statusads.clima`).

---

## 5. BLE nativo 24/7 (passo crítico para o anti-rapto)

**Contexto honesto**: o Web Bluetooth actual (`src/lib/web-bluetooth.ts`) só
funciona com o ecrã ligado e no Chrome. Com a app nativa, o ideal é migrar
a leitura BLE para o plugin nativo:

```bash
npm install @capacitor-community/bluetooth-le
npx cap sync
```

No código, o `useProximityMonitor` passa a usar o plugin (API quase igual):

```ts
import { BleClient } from '@capacitor-community/bluetooth-le'

await BleClient.initialize()
await BleClient.requestDevice({ services: [serviceUUID] })
await BleClient.startNotifications(deviceId, service, charUUID, (value) => {
  // mesmos eventos de toque/tecla que o GlassesTapDetector já processa
})
```

Vantagens nativas que ficam desbloqueadas:
- Conexão BLE sobrevive ao ecrã bloqueado (foreground service)
- Sirene/SMS sem a app estar aberta
- Detecção de remoção forçada 24/7 (o algoritmo `assessGlassesRemoval`
  do projecto já está pronto, só muda a fonte dos eventos)

Migração sugerida: manter o código Web Bluetooth como fallback PWA e
adicionar um adapter que escolhe plugin nativo quando `Capacitor.isNativePlatform()`.

---

## 6. Checklist final de release

- [x] `npm run build` sem erros (tsc 0 erros, 157 entradas precache)
- [x] Ícone/splash gerados (`@capacitor/assets`, tema dourado #0C0B08)
- [x] `cap sync` depois de qualquer mudança web
- [x] Permissões Android no manifest: LOCALIZAÇÃO, CÂMARA, MICROFONE, SENSORES,
      VIBRAR, NOTIFICAÇÕES, WAKE_LOCK, ALARME_EXACTO
- [x] APK debug + release assinada compiladas e verificadas (apksigner)
- [x] Ponte nativa `src/lib/native.ts`: GPS/haptics/status-bar com fallback web
- [ ] Testar a APK num telemóvel real: login, SOS, sirene, GPS, detecção de queda
- [ ] Build camuflado (opcional): muda `appName`/ícone e recompila
- [ ] BLE nativo 24/7 (secção 5) — próximo passo para anti-rapto com ecrã bloqueado
