# Cliente Flutter - Consultas Workflow

App móvil Android para que clientes envíen consultas y reciban notificaciones push vía Firebase FCM.

## Arquitectura

```
Cliente (Flutter) → POST /api/consultas → Backend Spring Boot
Cliente registra FCM token → POST /api/consultas/{id}/fcm-token
Asesor atiende en Angular → Backend envía FCM push → Cliente recibe notificación
```

## Prerrequisitos

| Herramienta | Estado | Notas |
|---|---|---|
| Android Studio | ✅ Instalado | Incluye Android SDK |
| Java 17 | ✅ Instalado | OpenJDK 17 |
| Flutter SDK | ⚠️ Pendiente | Ver paso 1 |
| Firebase (google-services.json) | ⚠️ Pendiente | Ver paso 2 |

---

## PASO 1: Instalar Flutter SDK

La descarga ya está en curso a `C:\Users\HP\flutter_sdk.zip`.  
Cuando termine (~700 MB), ejecuta en PowerShell:

```powershell
# Extraer Flutter SDK
Expand-Archive -Path "$env:USERPROFILE\flutter_sdk.zip" -DestinationPath "$env:USERPROFILE\" -Force

# Agregar al PATH de la sesión actual
$env:PATH = "$env:USERPROFILE\flutter\bin;" + $env:PATH

# Verificar instalación
flutter --version

# Configurar Android SDK
flutter config --android-sdk "$env:LOCALAPPDATA\Android\Sdk"

# Aceptar licencias Android (requiere confirmar)
flutter doctor --android-licenses

# Verificar estado completo
flutter doctor
```

Para agregar Flutter al PATH permanentemente:
```powershell
[Environment]::SetEnvironmentVariable(
    "PATH",
    "$env:USERPROFILE\flutter\bin;$([Environment]::GetEnvironmentVariable('PATH', 'User'))",
    "User"
)
```

---

## PASO 2: Configurar Firebase

### 2a. Registrar app Android en Firebase Console

1. Ve a https://console.firebase.google.com
2. Selecciona proyecto **notification-system-603aa**
3. Configuración del proyecto (⚙️) → General → Tus apps
4. Clic en **Agregar app** → Android
5. Package name: `com.workflow.cliente`
6. Descarga `google-services.json`
7. **Reemplaza** `client/android/app/google-services.json` con el archivo descargado

### 2b. Generar firebase_options.dart (recomendado)

```powershell
# Instalar FlutterFire CLI
dart pub global activate flutterfire_cli

# Asegúrate de tener Firebase CLI instalado: https://firebase.google.com/docs/cli
# Luego desde la carpeta client/:
cd C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\client
flutterfire configure --project=notification-system-603aa
```

Esto reemplazará `lib/firebase_options.dart` con los valores correctos automáticamente.

### 2c. Alternativa manual (sin FlutterFire CLI)

Si no usas flutterfire_cli, edita `lib/firebase_options.dart` manualmente:
1. En Firebase Console → Configuración del proyecto → General → Web API Key → copia la API Key
2. En la app Android registrada, copia el App ID (formato `1:826923971440:android:xxxxx`)
3. Reemplaza los valores REEMPLAZAR_CON_* en `lib/firebase_options.dart`

---

## PASO 3: Compilar y ejecutar

```powershell
cd C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\client

# Descargar dependencias
flutter pub get

# Ejecutar en emulador (asegúrate de tener uno creado en Android Studio)
flutter run

# O compilar APK de debug
flutter build apk --debug
# El APK estará en: build/app/outputs/flutter-apk/app-debug.apk
```

---

## URL del Backend

Configurada en `lib/services/consulta_service.dart`:

```dart
static const String _baseUrl = 'http://10.0.2.2:8080';
```

- **Emulador Android**: `10.0.2.2` apunta al `localhost` de tu PC — ✅ correcto
- **Dispositivo físico en red local**: Cambia a la IP de tu PC, ej: `http://192.168.1.100:8080`

---

## Estructura del proyecto

```
client/
├── lib/
│   ├── main.dart                    # Punto de entrada + Firebase init
│   ├── firebase_options.dart        # Config Firebase (completar/regenerar)
│   ├── screens/
│   │   ├── nueva_consulta_screen.dart    # Formulario de consulta
│   │   ├── confirmacion_screen.dart      # Estado de consulta + notificaciones
│   │   └── notificaciones_screen.dart    # Historial de notificaciones
│   └── services/
│       ├── consulta_service.dart         # API REST calls al backend
│       └── notification_service.dart     # Firebase FCM setup
├── android/
│   ├── app/
│   │   ├── google-services.json          # ⚠️ REEMPLAZAR con el real
│   │   ├── build.gradle                  # Config Firebase plugin
│   │   └── src/main/
│   │       ├── AndroidManifest.xml       # Permisos + FCM service
│   │       └── kotlin/.../MainActivity.kt
│   ├── build.gradle                      # Google Services classpath
│   ├── settings.gradle
│   ├── local.properties                  # Rutas SDK (no subir a git)
│   └── gradle.properties
└── pubspec.yaml                          # Dependencias Flutter
```

---

## Flujo completo

1. **Cliente abre app** → llena formulario → POST `/api/consultas`
2. **App obtiene FCM token** → POST `/api/consultas/{id}/fcm-token`  
3. **App navega a pantalla de confirmación** → muestra estado PENDIENTE
4. **Asesor en Angular** → ve la consulta en `/workflow/consultas`
5. **Asesor hace clic en "Atender"** → estado cambia a EN_ATENCION
6. **Backend envía FCM push al cliente** → cliente ve notificación en el móvil
7. **Asesor hace clic en "Completar"** → estado cambia a COMPLETADA
8. **Backend envía FCM push final** → cliente sabe que fue completado
9. **Cliente actualiza estado** en app → ve el mensaje del asesor + tramite ID
