# DANK Sync — плагин WordPress

Связывает dank.capital с приложением для инвесторов.

- **Вход в приложение.** Приложение спрашивает сайт, есть ли пользователь с этим email и ролью `investor`. Код отправляется только инвесторам.
- **Живые данные.** При изменении custom fields, ACF-полей или роли инвестора плагин сразу отправляет снимок его данных в приложение. Если приложение недоступно, отправка повторяется через 1, 2, 4 и 8 минут.
- **Безопасность.** Все запросы подписаны общим секретом (HMAC-SHA256, окно 5 минут). Пароли, токены и банковские реквизиты из данных удаляются.

## Установка
1. Соберите архив: `cd wordpress && zip -r dist/dank-sync.zip dank-sync -x "dank-sync/tests/*"` (или возьмите готовый `wordpress/dist/dank-sync.zip`).
2. WordPress → Плагины → Добавить новый → Загрузить плагин → `dank-sync.zip` → Активировать.
3. Настройки → **DANK Sync**: проверьте адрес приложения и роль, скопируйте **Secret**.
4. Vercel → проект dank → Settings → Environment Variables: `WP_SYNC_SECRET` = секрет → Redeploy.
5. DANK Sync → **Test connection** должно ответить «Connection works».

Секрет можно хранить в `wp-config.php`: `define('DANK_SYNC_SECRET', '...');` — он важнее значения из настроек.

## WP-CLI
```
wp dank-sync push --all              # отправить всех инвесторов
wp dank-sync push --user=113         # одного (ID или email)
wp dank-sync show --user=113         # показать, что получит приложение
```

## Тесты
```
php wordpress/dank-sync/tests/core-test.php      # подпись и очистка данных
cd web && npm run test:contract                  # плагин ↔ приложение
```
