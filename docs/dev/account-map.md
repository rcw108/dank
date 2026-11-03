# Карта личного кабинета dank.capital

Источник: страница `https://dank.capital/account/` под тестовым инвестором (WP user id 113), 3 ноября 2026.
Кабинет отрисовывается PHP-шаблоном темы `hello-theme-dank` (не Elementor), формы на Gravity Forms.
Персональные данные тестового пользователя здесь намеренно не приводятся.

## Визуальный стиль кабинета

Кабинет оформлен иначе, чем маркетинговые страницы сайта:

| | Маркетинговый сайт | Кабинет (`.s-account.black-style`) |
|---|---|---|
| Фон | `#0D232B` + фото архитектуры | `#141A27`, карточки `#10151F` / `#171F2F` |
| Акцент | бирюзовый `#45C7AD` | оранжево-красный `#FF3C00` («Account», прогресс-бар, отрицательные суммы) |
| Кнопки | «пилюли» с обводкой | белая прямоугольная кнопка «Withdraw Now» |
| Шрифты | Sora + Poppins | Poppins, Roboto Slab в мелких текстах |

Есть переключатель тёмной и светлой темы (`.color-switcher`, `data-user`). Выбор сохраняется в WP через admin-ajax, то есть хранится как user meta.

## Разделы и данные

### 1. Шапка
| Элемент | Пример | Источник |
|---|---|---|
| Приветствие | Good Morning / Afternoon / Evening | считается на клиенте по времени устройства |
| Имя инвестора | `first_name` | user meta |
| Текущая дата | Nov 3, 2026 | сервер |
| Current capital | $89,384.16 | **вычисляемое?** (см. вопросы) |
| Кнопки | настройки, печать выписки (`window.print`), переключатель темы, Withdraw Now | — |

Под шапкой лента котировок TradingView (S&P 500, Nasdaq 100, USD/EUR, USD/MXN, BTC/USD, OIL, GOLD и акции). Это сторонний виджет, данные не из WP.

### 2. Таблица операций (`.investor-overview`)
Колонки: **Date**, **Initial Deposit USD / Operation**, **Present Capital USD**.

| Тип строки | Признак в HTML | Поля |
|---|---|---|
| Депозит | `<tr>` | дата, сумма депозита, текущий капитал по депозиту |
| Неактивный депозит | `<tr class="mutted">` (серый) | то же; видимо, депозит закрыт выводом |
| Вывод | `<tr class="withdraw">` | дата, текст «Withdraw», сумма со знаком минус (красная) |
| Примечание | `span.info-symbol-for-note[title]` (красная точка) | текст, например «Left after withdraw at Jul 18, 2018» |

Модель для Supabase: `operations(id, profile_id, wp_row_key, date, type: deposit|withdrawal, amount_usd, present_capital_usd, is_muted, note, sort_order)`.

### 3. Сводка (правая колонка)
| Показатель | Пример |
|---|---|
| Net Annualized Return | 9.38% (+ всплывающее пояснение «Compound Interest», статичный текст) |
| Interest Received USD | $44,232.16 |
| Current Capital USD | $89,384.16 + дата расчёта |
| Total Invested USD | $50,500.00 |
| Total Withdraw USD | $5,348.00 |

Ниже реквизиты юрлиц (DANK Capital SAPI de CV, LLC, UG). Это статичный текст.

### 4. Вывод средств (Gravity Forms, форма 10, 3 шага)
1. **Amount, USD** + пароль для подтверждения. Скрытые поля: login и email пользователя. Текст ограничений: дневной лимит на карту; вывод возможен при балансе больше 50 000 USD.
2. **Deposit Instructions:** тип (Card deposit (Mexico only) / Wire Transfer / Check), Bank Name, Card Number, Check to (имя и фамилия), Where to deliver OR deposit, Bank routing number, SWIFT, Account number, Account Holder Name.
3. **Review:** повтор суммы и чекбокс «Yes this is right» → **Send Request**.

Заявка сохраняется как запись Gravity Forms и обрабатывается админом вручную. Деньги автоматически не двигаются.

### 5. Настройки (`#settings`, открываются шестерёнкой)
- **Profile Information** (форма 4): First / Last name, Appeal (Mr. / Ms. / Mrs.), Phone → «Send Request», то есть запрос на изменение, а не мгновенное сохранение.
- **Security Information** (форма 3): Username, Email, смена пароля.

### 6. Прочее
- Вкладка **Contracts:** «COMING SOON».
- **FAQ:** `https://dank.capital/faqs/`.
- Рефералов и уровней (Diamond) у тестового пользователя в кабинете нет. Классы `diamond-*` — это просто названия блоков шапки.

## Что это значит для приложения

**Экраны:** Overview (шапка, капитал, сводка) → Operations (таблица) → Withdraw (3 шага) → Settings (профиль, безопасность, тема) → FAQ. Плюс выписка в PDF вместо печати.

**Открытые вопросы (нужен доступ к админке или коду темы):**
1. Где хранятся строки таблицы операций: ACF repeater, user meta, отдельная таблица? Какие meta_key?
2. **Present Capital и Current capital вводит админ или они считаются в PHP темы** (сложный процент от даты депозита)? Если считаются, то либо переносим формулу в Supabase (SQL-функция), либо WP отправляет уже посчитанные значения. Второй вариант надёжнее, но тогда значения «замирают» до следующей отправки, и нужна ежедневная пересылка.
3. Заявки на вывод и изменение профиля: остаются в Gravity Forms (приложение отправляет их в WP через REST) или переезжают в Supabase с уведомлением админа?
4. Подтверждение вывода паролем: в приложении паролей WP нет, а вход идёт по коду из email. Замена: повторный код из email или Face ID в нативной версии.
