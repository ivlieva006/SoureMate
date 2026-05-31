# SourceMate 1.0.0

SourceMate - учебный веб-сервис и Telegram-бот для поиска научных источников, подбора релевантных публикаций и проверки учебных работ на возможные заимствования.

Версия `1.0.0` фиксирует первый стабильный MVP: веб-кабинет, авторизацию, загрузку документов, отчет оригинальности, карточки источников, PDF-экспорт, подписки, AI-поддержку и Telegram-бота.

## Возможности

- Поиск научных источников по теме пользователя.
- Агрегация данных из Crossref, Semantic Scholar, OpenAlex, Wikipedia, CyberLeninka и НЭБ.
- Расширение запроса и оценка релевантности через локальную LLM Ollama.
- Telegram-бот с постраничной выдачей результатов.
- Веб-интерфейс: главная страница, авторизация, личный кабинет, настройки и подписка.
- Регистрация, вход и восстановление доступа через код на почту.
- Профиль пользователя: имя, роль, аватар, почта, пароль, настройки и сессии.
- Загрузка TXT, DOCX и PDF-документов.
- Проверка оригинальности, совпадений и похожих источников.
- Детальный отчет с проблемными фрагментами, метриками и рекомендациями.
- Карточка источника с DOI, авторами, годом, ссылкой, ГОСТ- и BibTeX-цитированием.
- PDF-экспорт отчета из личного кабинета.
- AI-помощник для вопросов по отчетам, загрузке и настройкам.
- Локальное runtime-хранилище без внешней базы данных.

## Скриншоты

### Веб-интерфейс

<img src="screenshots/main.png" alt="Главная страница SourceMate" width="800">

### Telegram-бот

<img src="screenshots/tg_bot.png" alt="Telegram-бот SourceMate" width="300">

### AI-помощник

<img src="screenshots/ai_support.png" alt="AI-помощник SourceMate" width="300">

## Технологии

- Node.js
- JavaScript
- HTML и CSS
- Telegraf
- Ollama
- dotenv
- p-limit
- node-fetch
- formidable
- mammoth
- pdf-parse
- pdfkit
- nodemailer
- Brevo API или SMTP

## Структура проекта

```text
source search bot/
├── public/                       # Веб-интерфейс
│   ├── index.html                # Главная страница
│   ├── auth.html                 # Авторизация и восстановление доступа
│   ├── cabinet.html              # Личный кабинет
│   ├── subscription.html         # Подписки и тарифы
│   ├── report.html               # Детальный отчет проверки
│   ├── source.html               # Карточка источника
│   ├── support.js                # AI-помощник в интерфейсе
│   └── assets/                   # Изображения и SVG-ресурсы
├── src/
│   ├── config/
│   │   └── config.js             # Конфигурация приложения
│   ├── core/
│   │   ├── aggregate.js          # Агрегация и ранжирование источников
│   │   ├── antiplagiarism.js     # Проверка документов на заимствования
│   │   ├── domain_profile.js     # Профиль предметной области
│   │   ├── file_text.js          # Извлечение текста из файлов
│   │   ├── source_content.js     # Получение текста найденных источников
│   │   ├── ranking.js            # Эвристическое ранжирование
│   │   └── lexical_relevance.js  # Лексическая релевантность
│   ├── data/
│   │   └── sources/              # Модули внешних источников
│   ├── llm/
│   │   └── llm.js                # Работа с локальной LLM
│   ├── transport/
│   │   └── telegram/             # Telegram-бот
│   └── web/
│       ├── server.js             # Веб-сервер и API
│       └── mailer.js             # Отправка кодов по почте
├── data/                         # Локальное runtime-хранилище
├── screenshots/                  # Скриншоты для README
├── .env.example                  # Пример переменных окружения
├── package.json
└── README.md
```

## Установка

```bash
git clone https://github.com/ivlieva006/SoureMate.git
cd SoureMate
npm install
```

Создайте `.env` на основе примера:

```bash
cp .env.example .env
```

Минимальная конфигурация:

```env
WEB_PORT=3000
BOT_TOKEN=telegram_bot_token

LLM_ENABLED=true
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3.1

MAIL_FROM=SourceMate <user@example.com>
MAIL_DEV_FALLBACK=true
```

Для реальной отправки писем настройте Brevo:

```env
BREVO_API_KEY=your_brevo_api_key
```

или SMTP:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=user@example.com
SMTP_PASS=app-password
SMTP_FROM=SourceMate <user@example.com>
```

## Ollama

Если используется локальная LLM, установите Ollama и загрузите модель:

```bash
ollama pull llama3.1
ollama serve
```

Также можно запустить Ollama через npm-скрипт:

```bash
npm run ollama
```

## Запуск

Веб-версия:

```bash
npm run web
```

После запуска откройте:

```text
http://localhost:3000
```

Демо-аккаунт создается автоматически при первом запуске локальной базы:

```text
student@mail.ru / 12345678
```

Telegram-бот:

```bash
npm start
```

## Основные сценарии

### Проверка документа

1. Откройте личный кабинет.
2. Загрузите TXT, DOCX или PDF-файл.
3. Укажите тему работы, если нужно уточнить поиск.
4. Дождитесь отчета оригинальности.
5. Откройте детальный отчет, карточки источников или скачайте PDF.

### Поиск источников в Telegram

1. Запустите `npm start`.
2. Напишите тему боту.
3. Получите подборку источников с постраничной навигацией.
4. При необходимости отправьте документ с подписью-темой.

## Как работает проверка документов

1. Сервер принимает файл и извлекает текст.
2. SourceMate определяет тему проверки или использует тему пользователя.
3. Агрегатор ищет релевантные публикации во внешних источниках.
4. Система загружает доступные тексты найденных материалов.
5. Документ сравнивается с источниками по шинглам.
6. Формируется отчет: оригинальность, совпадения, похожие источники, фрагменты и рекомендации.
7. Отчет можно открыть в кабинете или экспортировать в PDF.

## Основные API

- `GET /api/auth/me` - текущий пользователь.
- `GET /api/cabinet/state` - состояние кабинета, сессии и проверки.
- `GET /api/subscription/state` - состояние подписки.
- `POST /api/auth/register/request` - запрос кода регистрации.
- `POST /api/auth/register/verify` - подтверждение регистрации.
- `POST /api/auth/login` - вход.
- `POST /api/auth/logout` - выход.
- `POST /api/auth/recover/request` - запрос кода восстановления.
- `POST /api/auth/recover/verify` - подтверждение кода восстановления.
- `POST /api/auth/recover/reset` - установка нового пароля.
- `POST /api/account/profile` - обновление профиля.
- `POST /api/account/password` - смена пароля.
- `POST /api/account/avatar` - загрузка аватара.
- `POST /api/account/settings` - сохранение настроек.
- `POST /api/account/sessions/revoke-other` - завершение других сессий.
- `POST /api/subscription/checkout` - выбор тарифа.
- `POST /api/subscription/team-request` - заявка на командный доступ.
- `POST /api/support/chat` - сообщение AI-помощнику.
- `POST /api/antiplagiarism/check` - проверка документа.
- `POST /api/cabinet/check/delete` - удаление проверки.
- `POST /api/reports/export` - экспорт отчета в PDF.

## Данные и безопасность

- `.env` не должен попадать в репозиторий.
- Runtime-данные хранятся в `data/users.json`.
- Пароли хранятся как PBKDF2-хеш с солью.
- Сессии передаются через HTTP-only cookie.
- Аватары сохраняются в `public/uploads/avatars/`.
- Для локальной разработки можно включить `MAIL_DEV_FALLBACK=true`, чтобы видеть код подтверждения без почтового провайдера.
- Для продакшена нужен настроенный Brevo API или SMTP-провайдер.

## NPM-скрипты

```bash
npm run web      # веб-сервер SourceMate
npm start        # Telegram-бот
npm run ollama   # локальный сервер Ollama
```

## Статус 1.0.0

`1.0.0` - первый стабильный учебный MVP. В релиз входят веб-кабинет, авторизация, проверка документов, поиск источников, отчеты, экспорт PDF, подписки, AI-поддержка и Telegram-бот.

Дальнейшие направления развития: полноценная база данных, расширенный биллинг, командные кабинеты, улучшенная проверка цитирования, больше источников и интеграции с образовательными платформами.
