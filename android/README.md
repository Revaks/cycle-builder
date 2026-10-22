# Конструктор цикла — Android

Нативная Android-версия на Kotlin + Jetpack Compose.

## Что реализовано

- 12-недельный шаблон `cycle8` из JSON-ассета.
- Расчёты: рабочий вес, тоннаж, КПШ, среднее, относительная интенсивность, Фунтиков и время.
- Прогрессия 1ПМ, разгрузочные недели, округление.
- Редакторы упражнений, недель, подходов/повторов/процентов.
- Настройки метрик: пороги времени, факторы D, таблица Фунтикова.
- Автосохранение проекта в `filesDir/project.json`.
- Импорт и экспорт JSON через Android Storage Access Framework.
- PDF через `PdfDocument` и системное «Поделиться».

Excel-экспорт в Android-версию пока не входит.

## Требования

- JDK 17.
- Android SDK: platform 35, build-tools 35.0.0.
- Gradle wrapper уже в проекте.

## Сборка

```bash
export JAVA_HOME=/path/to/jdk-17
export ANDROID_HOME=/path/to/android-sdk
./gradlew :app:testDebugUnitTest
./gradlew :app:assembleDebug
```

Debug APK:

```text
app/build/outputs/apk/debug/app-debug.apk
```

Или из корня репозитория:

```bash
JAVA_HOME=... ANDROID_HOME=... ./scripts/build-android.sh
```

## Подписанный release APK

Создайте `android/keystore.properties` (файл в `.gitignore`):

```properties
storeFile=/absolute/path/to/cycle-builder-release.jks
storePassword=...
keyAlias=cycle-builder
keyPassword=...
```

Затем:

```bash
./gradlew :app:assembleRelease
```

Готовый APK: `app/build/outputs/apk/release/app-release.apk`.

## Архитектура

- `data/` — сериализуемая модель проекта, JSON, валидация, репозиторий.
- `domain/` — чистые расчёты, без Android API.
- `ui/` — ViewModel и Compose-экраны.
- `export/` — PDF и системный share.

Unit-тесты сверяют все 216 строк шаблона с эталоном xlsm, включая итоги дней и недель.
