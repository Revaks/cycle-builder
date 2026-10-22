#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION="${VERSION:-$(node -p "require('./package.json').version")}"

echo "==> Сборка фронтенда"
npm run build

echo "==> Подготовка встроенной статики"
rm -rf cmd/cycle-builder/dist
mkdir -p cmd/cycle-builder/dist
cp -R dist/. cmd/cycle-builder/dist/

echo "==> Проверка Go-кода"
go vet ./cmd/cycle-builder

mkdir -p release

for arch in amd64 arm64; do
  out="release/cycle-builder-windows-${arch}.exe"
  echo "==> Сборка Windows/${arch}: ${out}"
  GOOS=windows GOARCH="${arch}" CGO_ENABLED=0 \
    go build -trimpath -ldflags "-s -w -X main.version=${VERSION}" \
    -o "${out}" ./cmd/cycle-builder
done

cat > release/README-Windows.txt <<'EOF'
Конструктор цикла — портативная версия для Windows
=================================================

1. Распакуйте архив в любую папку.
2. Запустите cycle-builder-windows-amd64.exe (для обычного ПК)
   или cycle-builder-windows-arm64.exe (для Windows on ARM).
3. Откроется браузер с приложением. Не закрывайте чёрное окно консоли,
   пока работаете: оно держит локальный сервер.
4. Чтобы остановить приложение, закройте окно консоли или нажмите Ctrl+C.

Данные:
- Проект автоматически сохраняется в localStorage браузера.
- Адрес всегда http://127.0.0.1:17843, поэтому сохранения не теряются
  между запусками.
- Резервная копия: «Настройки» → «Скачать JSON».
- Импорт JSON заменяет текущий проект после подтверждения.
- Контрольные суммы SHA-256 лежат в SHA256SUMS.txt.

Важно:
- Установка и права администратора не нужны.
- Приложение работает только на вашем компьютере (127.0.0.1).
- Файл не подписан, поэтому Windows SmartScreen может показать
  предупреждение. Нажмите «Подробнее» → «Выполнить в любом случае».
- Если порт 17843 занят, закройте другой экземпляр приложения.
  Другой порт можно указать так:
  cycle-builder-windows-amd64.exe -port 17844
  Но при смене порта браузер будет считать это другим сайтом,
  и старые сохранения не отобразятся.
EOF

(cd release && sha256sum cycle-builder-windows-amd64.exe cycle-builder-windows-arm64.exe README-Windows.txt > SHA256SUMS.txt)

python3 scripts/make_zip.py release release/cycle-builder-windows.zip

echo "==> Готово"
ls -lh release
cat release/SHA256SUMS.txt
