# StatusAds Connect — Guia de Build Nativa (Capacitor)

Este guia transforma o projecto web/PWA em **app nativa Android e iOS**, com suporte
para **builds camuflados** (nome e ícone à escolha). O código é um só — o que muda é
a embalagem.

---

## 1. Pré-requisitos

| Para | Precisas de |
|------|-------------|
| Android | Android Studio (ou só JDK 17 + SDK tools), cabo/USB ou emulador |
| iOS | Mac com Xcode 15+ (obrigatório — não há forma de contornar) |
| Ambos | Node 18+, npm (`npm install` já feito) |

O Capacitor já está instalado e configurado (`capacitor.config.ts`,
scripts `cap:*` no package.json).

---

## 2. Build Android — 4 comandos

```bash
npm run build            # gera dist/ (o front web)
npm run cap:sync         # copia dist/ para o projecto nativo Android
npm run cap:open:android # abre no Android Studio
```

No Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**.
O APK sai em `android/app/build/outputs/apk/debug/app-debug.apk`.

Para distribuição directa (fora da Play Store), o APK debug já instala
activando "Fontes desconhecidas" no telemóvel. Para produção assinada:

```bash
cd android
./gradlew assembleRelease   # usa signing config (ver docs Android)
```

### 2.1 Publicar na Play Store
1. Gera um AAB: `./gradlew bundleRelease`
2. Cria conta Google Play Developer ($25 única)
3. **Nota importante para apps de segurança**: a Play Store pede
   declaração de uso de localização em segundo plano — descreve o caso
   de uso anti-rapto (a app já pede permissões "enquanto em uso").

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

Cria a pasta `resources/` com:
- `resources/icon-only.png` (1024×1024) — o ícone do disfarce
- `resources/splash.png` (2732×2732) — ecrã inicial

Gera todos os tamanhos:

```bash
npx capacitor-assets generate --android --ios
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

- [ ] `npm run build` sem erros
- [ ] Ícone/splash gerados (`capacitor-assets`)
- [ ] `cap sync` depois de qualquer mudança web
- [ ] APK testado: login, SOS, sirene, contacto, GPS
- [ ] Build camuflado testado: abre como disfarce, long-press + PIN volta à app real
- [ ] Permissões Android: LOCALIZAÇÃO, NOTIFICAÇÕES, (BLUETOOTH_SCAN/CONNECT no manifest nativo)
- [ ] Versão incrementada em `android/app/build.gradle` (versionCode/versionName)
