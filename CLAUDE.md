# Заметки для работы с репозиторием

## Grain (папка `grain/`)

- Каждая новая версия плеера подписывается на GitHub тем, что в ней обновилось:
  поднять `version` в `grain/package.json` и добавить сверху раздел `## X.Y.Z` в `grain/CHANGELOG.md`
  (по-русски, простыми словами, по пункту на изменение). Без раздела сборка релиза падает.
- Релиз собирается и публикуется сам (`.github/workflows/grain-windows.yml`), сайт —
  `.github/workflows/grain-web.yml` → https://vadivasin-blip.github.io/-/
