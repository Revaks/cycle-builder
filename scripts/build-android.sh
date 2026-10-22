#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../android"

: "${JAVA_HOME:?Укажите JAVA_HOME на JDK 17}"
: "${ANDROID_HOME:?Укажите ANDROID_HOME на Android SDK}"

./gradlew :app:testDebugUnitTest
./gradlew :app:assembleDebug

mkdir -p release
cp app/build/outputs/apk/debug/app-debug.apk \
  release/cycle-builder-android-0.2.0-debug.apk

if [ -f keystore.properties ]; then
  ./gradlew :app:assembleRelease
  cp app/build/outputs/apk/release/app-release.apk \
    release/cycle-builder-android-0.2.0.apk
  echo "Подписанный release APK: android/release/cycle-builder-android-0.2.0.apk"
else
  echo "keystore.properties не найден: собран только debug APK."
fi

ls -lh release
