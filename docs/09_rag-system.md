## 9. Установка и настройка

Natively предоставляет гибкие варианты установки для разных категорий пользователей: конечных пользователей, разработчиков и тех, кто хочет внести свой вклад в проект.

### Для конечных пользователей (End Users)

#### Быстрый старт
1. **Скачайте последнюю версию** с [релизов GitHub](https://github.com/evinjohnn/natively-cluely-ai-assistant/releases)
2. **Установите приложение**:
   - **macOS**: перетащите Natively.app в папку Applications
   - **Windows**: запустите установочный файл
   - **Linux**: распакуйте архив и запустите исполняемый файл

3. **Решение проблем на macOS**:
```
# Если появляется "Unidentified Developer"
Right-click app > Open > Click Open

# Если появляется "App is Damaged"
xattr -cr /Applications/Natively.app
# Или укажите путь, где установлено приложение
```

4. **Запустите приложение** из папки Applications или через меню запуска

### Для разработчиков (Developers)

#### Требования к системе
- **Node.js** (v20+ рекомендуется)
- **Git**
- **Rust** (требуется для нативного захвата аудио)

#### Установка и запуск
```bash
# Клонирование репозитория
git clone https://github.com/evinjohnn/natively-cluely-ai-assistant.git
cd natively-cluely-ai-assistant

# Установка зависимостей
npm install

# Создание файла конфигурации .env
touch .env
```

#### Настройка переменных окружения (.env)
```env
# Cloud AI
GEMINI_API_KEY=your_key
GROQ_API_KEY=your_key
OPENAI_API_KEY=your_key
CLAUDE_API_KEY=your_key
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json

# Speech Providers (Optional - only one needed)
DEEPGRAM_API_KEY=your_key
ELEVENLABS_API_KEY=your_key
AZURE_SPEECH_KEY=your_key
AZURE_SPEECH_REGION=eastus
IBM_WATSON_API_KEY=your_key
IBM_WATSON_REGION=us-south

# Local AI (Ollama)
USE_OLLAMA=true
OLLAMA_MODEL=llama3.2
OLLAMA_URL=http://localhost:11434

# Default Model Configuration
DEFAULT_MODEL=gemini-3-flash-preview
```

#### Запуск приложения
```bash
# Разработка
npm start

# Сборка дистрибутива
npm run dist
```

### Настройка API-ключей

#### Поддерживаемые провайдеры ИИ
| Провайдер | Переменная | Описание |
|---------|----------|--------|
| **Gemini** | `GEMINI_API_KEY` | Рекомендуемый вариант с большим контекстным окном |
| **Groq** | `GROQ_API_KEY` | Ультрабыстрая работа с Llama 3 |
| **OpenAI** | `OPENAI_API_KEY` | GPT-5.2 с высокими способностями к рассуждению |
| **Anthropic** | `CLAUDE_API_KEY` | Claude 4.5 для сложных задач |
| **Google STT** | `GOOGLE_APPLICATION_CREDENTIALS` | Путь к JSON-файлу сервисного аккаунта |

#### Настройка Google Cloud Speech-to-Text
1. Создайте или выберите проект в Google Cloud Console
2. Включите API Speech-to-Text
3. Создайте Service Account
4. Назначьте роль: `roles/speech.client`
5. Сгенерируйте и скачайте JSON-ключ
6. Укажите путь к файлу в настройках Natively

### Конфигурация локального ИИ (Ollama)

Для полностью автономной работы без интернета:

1. **Установите Ollama**:
```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows - загрузите с ollama.com/download
```

2. **Запустите модель**:
```bash
# Запуск Llama 3
ollama run llama3

# Запуск Mistral
ollama run mistral

# Запуск CodeLlama
ollama run codellama
```

3. **Настройка в .env**:
```env
USE_OLLAMA=true
OLLAMA_MODEL=llama3
OLLAMA_URL=http://localhost:11434
```

4. Приложение автоматически обнаружит работающий экземпляр Ollama

### Настройка горячих клавиш

#### Глобальные сочетания по умолчанию
```json
{
  "general": {
    "toggle-visibility": "CmdOrCtrl+Shift+Space",
    "take-screenshot": "CmdOrCtrl+H",
    "move-left": "CmdOrCtrl+Alt+Left",
    "move-right": "CmdOrCtrl+Alt+Right"
  },
  "ai": {
    "manual-prompt": "CmdOrCtrl+M",
    "regenerate-answer": "CmdOrCtrl+R"
  }
}
```

#### Настройка через интерфейс
1. Откройте настройки приложения
2. Перейдите в раздел "Key Bindings"
3. Нажмите на нужное действие и введите новое сочетание
4. Сохраните изменения

### Аудио-конфигурация

#### Двойная система аудио
Natively использует два независимых канала:

1. **System Audio Capture** - для записи собеседников
2. **Microphone Capture** - для команд пользователя

#### Выбор устройств
1. Откройте настройки аудио
2. Выберите устройства ввода/вывода:
   - **Input Device**: микрофон пользователя
   - **Output Device**: аудиовыход системы

3. Протестируйте уровень громкости

### Обновление приложения

#### Автоматическое обновление
- Приложение проверяет наличие обновлений при запуске
- Уведомление о доступности новой версии появляется в интерфейсе
- Возможность скачать и установить обновление одним кликом

#### Особенности для macOS
На macOS не подписанные приложения не могут автоматически перезапускаться после обновления. Вместо этого:
1. Приложение открывает папку с загруженным обновлением
2. Пользователь должен вручную установить новую версию
3. Старая версия закрывается

### Системные требования

#### Минимальные требования
- **Операционная система**: macOS, Windows или Linux
- **RAM**: 4GB
- **Дисковое пространство**: ~500MB + место для хранения записей
- **Node.js**: v20+

#### Рекомендуемые конфигурации
- **Для облачных моделей**: 8GB RAM, стабильное интернет-соединение
- **Для локальных моделей (Ollama)**: 16GB+ RAM, мощный CPU/GPU

### Устранение неполадок

#### Распространенные проблемы

**Проблема**: "Unidentified Developer" на macOS
- **Решение**: Правый клик > Открыть > Открыть

**Проблема**: "App is Damaged"
- **Решение**: Выполнить в Terminal `xattr -cr /Applications/Natively.app`

**Проблема**: Не работает захват системного звука
- **Решение**: Убедитесь, что установлен Rust и права доступа к аудиосистеме предоставлены

**Проблема**: Нет связи с Ollama
- **Решение**: Проверьте, что Ollama запущен (`ollama serve`) и URL указан правильно

**Проблема**: STT не распознает речь
- **Решение**: Проверьте API-ключи и выберите подходящий провайдер в настройках

### Безопасная установка

#### Проверка целостности
Поскольку проект открытый, вы можете:
1. Проверить исходный код перед установкой
2. Собрать приложение самостоятельно из исходников
3. Убедиться в отсутствии шпионского ПО

#### Хранение ключей
- API-ключи хранятся только локально
- Используются системные хранилища секретов:
  - **macOS Keychain**
  - **Windows Credential Vault**
  - **libsecret** для Linux

Эта комплексная документация по установке и настройке позволяет пользователям любого уровня начать использовать Natively эффективно и безопасно.

