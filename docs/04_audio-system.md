## 4. Система аудио-захвата

Natively реализует продвинутую двухканальную систему захвата аудио, которая является ключевой особенностью приложения и обеспечивает его высокую эффективность в профессиональных сценариях.

### Архитектура аудио-системы

Система построена на разделении двух независимых аудио-потоков:

#### 1. Захват системного аудио (System Audio Capture)
- **Назначение**: запись звука от собеседников в Zoom, Google Meet, Teams и других приложениях
- **Реализация**: нативный модуль на Rust для прямого доступа к системным аудио-бассейнам
- **Преимущества**:
  - Высокое качество без помех от окружающего шума
  - Отсутствие необходимости использовать микрофон для записи собеседников
  - Низкая задержка обработки (<500 мс)
  - Поддержка любых приложений (не только браузерные)

#### 2. Захват микрофона (Microphone Capture)
- **Назначение**: запись голоса пользователя для команд и диктовки
- **Изолированный канал**: позволяет пользователю задавать частные вопросы ИИ, не взаимодействуя с основной встречей
- **Глобальное переключение**: возможность мгновенного включения/выключения через горячие клавиши

### Техническая реализация

#### Основные компоненты

```typescript
// В AppState.ts
private systemAudioCapture: SystemAudioCapture | null = null;
private microphoneCapture: MicrophoneCapture | null = null;
private googleSTT: GoogleSTT | RestSTT | DeepgramStreamingSTT | null = null; // для собеседников
private googleSTT_User: GoogleSTT | RestSTT | DeepgramStreamingSTT | null = null; // для пользователя
```

#### Поток данных

**Для системного аудио:**
```
SystemAudioCapture → (Buffer) → STT (googleSTT) → transcript → IntelligenceManager → UI
```

**Для микрофона:**
```
MicrophoneCapture → (Buffer) → STT (googleSTT_User) → transcript → IntelligenceManager → UI
```

#### Ключевые методы

```typescript
private setupSystemAudioPipeline(): void {
  // Инициализация захвата системного аудио
  this.systemAudioCapture = new SystemAudioCapture();
  this.systemAudioCapture.on('data', (chunk: Buffer) => {
    this.googleSTT?.write(chunk);
  });
  
  // Инициализация захвата микрофона
  this.microphoneCapture = new MicrophoneCapture();
  this.microphoneCapture.on('data', (chunk: Buffer) => {
    this.googleSTT_User?.write(chunk);
  });
}
```

### Поддержка различных провайдеров STT

Система поддерживает множество Speech-to-Text провайдеров, которые могут быть выбраны пользователем:

#### Доступные провайдеры:
- **Google Cloud Speech-to-Text**: через Service Account JSON
- **Deepgram Streaming STT**: с поддержкой потоковой транскрипции
- **Groq**: ультрабыстрое распознавание речи
- **OpenAI Whisper**: точное распознавание через API OpenAI
- **ElevenLabs**: высокоточное распознавание
- **Azure Speech Services**: сервисы распознавания речи от Microsoft
- **IBM Watson**: система распознавания речи от IBM

#### Механизм выбора провайдера:
```typescript
const sttProvider = CredentialsManager.getInstance().getSttProvider();

if (sttProvider === 'deepgram') {
  this.googleSTT = new DeepgramStreamingSTT(apiKey);
} else if (sttProvider === 'groq' || sttProvider === 'openai' || ...) {
  this.googleSTT = new RestSTT(sttProvider, apiKey, modelOverride, region);
} else {
  this.googleSTT = new GoogleSTT(); // fallback
}
```

### Управление устройствами

Пользователь может настраивать конкретные устройства ввода/вывода:

```typescript
public async reconfigureAudio(inputDeviceId?: string, outputDeviceId?: string): Promise<void> {
  // Перенастройка захвата системного аудио
  this.systemAudioCapture?.stop();
  this.systemAudioCapture = new SystemAudioCapture(outputDeviceId);
  
  // Перенастройка захвата микрофона
  this.microphoneCapture?.stop();
  this.microphoneCapture = new MicrophoneCapture(inputDeviceId);
}
```

### Динамическая переконфигурация

Система поддерживает изменение провайдеров "на лету":

```typescript
public async reconfigureSttProvider(): Promise<void> {
  // Остановка существующих STT
  this.googleSTT?.stop();
  this.googleSTT_User?.stop();
  
  // Очистка и повторная инициализация
  this.setupSystemAudioPipeline();
  
  // Перезапуск при активной встрече
  if (this.isMeetingActive) {
    this.googleSTT?.start();
    this.googleSTT_User?.start();
  }
}
```

### Обработка ошибок и отказоустойчивость

Система включает механизмы восстановления при ошибках:

```typescript
this.systemAudioCapture.on('error', (err: Error) => {
  console.error('[Main] SystemAudioCapture Error:', err);
  // Автоматическое восстановление с fallback на дефолтное устройство
});
```

### Тестирование аудио

Встроенный тест уровня громкости для проверки работоспособности:

```typescript
public startAudioTest(deviceId?: string): void {
  this.audioTestCapture = new MicrophoneCapture(deviceId);
  this.audioTestCapture.on('data', (chunk: Buffer) => {
    // Расчет RMS для визуального отображения уровня
    const level = Math.min(rms / 10000, 1.0);
    win.webContents.send('audio-level', level);
  });
}
```

### Особенности реализации

#### Ленивая инициализация
Пайплайн аудио создается только при необходимости, что предотвращает потребление ресурсов при запуске:

```typescript
// LAZY INIT: Do not setup pipeline here to prevent launch volume surge.
// this.setupSystemAudioPipeline()
```

#### Синхронизация частот дискретизации
Критически важная синхронизация параметров между захватом и STT:

```typescript
// Синхронизация частоты дискретизации
const sysRate = this.systemAudioCapture?.getSampleRate() || 16000;
this.googleSTT?.setSampleRate(sysRate);

const micRate = this.microphoneCapture?.getSampleRate() || 16000;
this.googleSTT_User?.setSampleRate(micRate);
```

#### Разделение ролей
Четкое разделение функций между двумя каналами:
- **Канал 1 (system audio)**: анализ чужой речи, контекст встречи, понимание вопросов
- **Канал 2 (microphone)**: частные запросы к ИИ, подготовка ответов, внутренние размышления

### Преимущества архитектуры

1. **Высокая точность**: разделение источников позволяет избежать смешивания голосов
2. **Конфиденциальность**: возможность задавать личные вопросы ИИ без участия в основной беседе
3. **Гибкость**: поддержка разных провайдеров для разных каналов
4. **Производительность**: оптимизированная обработка каждого канала
5. **Отказоустойчивость**: fallback-механизмы при ошибках конфигурации

Эта двухканальная архитектура делает Natively особенно эффективным инструментом для технических интервью, продаж и других профессиональных ситуаций, где требуется как анализ происходящего, так и подготовка собственных ответов.

