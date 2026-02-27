## 5. Artificial Intelligence Module and Speech Processing

Natively implements a multi-layered AI system that combines speech recognition, semantic analysis, response generation, and a local knowledge system (RAG) to create a powerful real-time assistant.

### AI Module Architecture

#### Central Component: IntelligenceManager
The `IntelligenceManager` class is the core of the application's intelligent system. It is responsible for:
- Processing transcriptions from audio channels
- Meeting context management
- Generating recommendations and answers
- Integrating with RAG system for history access
- Creating summaries and clarifying questions

```typescript
private intelligenceManager: IntelligenceManager = new IntelligenceManager(this.processingHelper.getLLMHelper())
```

#### Events and Communication
`IntelligenceManager` uses an event system to interact with the interface:

```typescript
this.intelligenceManager.on('suggested_answer', (answer: string, question: string, confidence: number) => {
  win.webContents.send('intelligence-suggested-answer', { answer, question, confidence })
})

this.intelligenceManager.on('recap', (summary: string) => {
  win.webContents.send('intelligence-recap', { summary })
})
```

Main events:
- `assist_update`: situation analysis updates
- `suggested_answer`: suggested answer to a question
- `refined_answer`: refined or regenerated answer
- `recap`: meeting summary
- `follow_up_questions_update`: clarifying questions
- `manual_answer_result`: result of user's manual request
- `mode_changed`: AI mode change
- `error`: AI operation errors

### Supported AI Models

Natively supports a wide range of cloud and local models:

#### Cloud Models
| Model | Description |
|-------|--------|
| **Gemini 3 Pro/Flash** | Recommended option with huge context window (2M tokens) and low cost |
| **OpenAI GPT-5.2** | High reasoning and analysis capabilities |
| **Anthropic Claude 4.5** | Excellent code understanding and complex tasks |
| **Groq/Llama 3** | Ultra-fast operation (responses almost instant) |

#### Local Models via Ollama
Support for fully offline operation without internet:
- Llama 3
- Mistral
- Gemma
- CodeLlama
- Any other OpenAI-compatible endpoint

### AI Provider System

The application allows using any AI provider through a flexible configuration system:

#### .env Configuration
```env
# Cloud AI
GEMINI_API_KEY=your_key
GROQ_API_KEY=your_key
OPENAI_API_KEY=your_key
CLAUDE_API_KEY=your_key

# Local AI (Ollama)
USE_OLLAMA=true
OLLAMA_MODEL=llama3.2
OLLAMA_URL=http://localhost:11434

# Default Model Configuration
DEFAULT_MODEL=gemini-3-flash-preview
```

#### Dynamic Model Switching
The system supports changing models on the fly during meetings:
- Switching between different cloud providers
- Transitioning from cloud to local models and back
- Automatic detection of available models via Ollama API

### Speech Processing

#### Speech-to-Text Providers
Natively supports multiple speech-to-text systems:

| Provider | Features |
|----------|-----------|
| **Google Cloud STT** | Via Service Account JSON, high accuracy |
| **Deepgram** | Streaming transcription, low latency |
| **Groq** | Ultra-fast processing |
| **OpenAI Whisper** | Precise recognition via OpenAI API |
| **ElevenLabs** | Advanced speech recognition |
| **Azure Speech Services** | Microsoft recognition services |
| **IBM Watson** | IBM speech recognition system |

#### Dual STT System
The application uses two independent STT channels:

```typescript
private googleSTT: GoogleSTT | RestSTT | DeepgramStreamingSTT | null = null; // for interlocutors
private googleSTT_User: GoogleSTT | RestSTT | DeepgramStreamingSTT | null = null; // for user
```

This allows:
- Separate processing of interlocutors' and user's speech
- Using different providers for different channels
- Asking private AI questions without participating in the main conversation

### Context Management

#### Rolling Context Window
The system supports a "memory window" for the current meeting:
- Storing the last N messages as AI context
- Dynamically updating context as the dialog develops
- Prioritizing recent replies for more relevant answers

#### Smart Scope Detection
Innovative request context detection system:
- Automatically determines whether a question relates to the current meeting or history
- Switches between "current conversation" and "search past meetings" modes
- Allows asking questions like "What did John say about API last week?"

### Local Knowledge System (RAG)

#### Fully Local Vector Database
All data is stored and processed exclusively on the user's device:
- Vector embeddings are created locally
- Search occurs in SQLite database
- No raw data leaves the device

#### Automatic Indexing
The system automatically processes meetings in the background:
- Splitting transcripts into semantic chunks
- Creating vector representations
- Indexing by date, topic, participants

#### Global Search
Support for complex queries across entire history:
- "Find all API interface discussions"
- "Show solutions for authentication problem"
- "What did we decide at the meeting on March 15?"

### Visual Content Interpretation

#### Screenshot Analysis
The application can analyze visual content:
- Presentation slides
- Code blocks
- Diagrams and schematics
- Technical documents

#### AI Integration
Screenshots are passed to AI models for analysis:
- Explaining complex concepts
- Finding errors in code
- Design improvement suggestions
- Answering questions about visual material

### AI Operation Modes

#### Live Assistance
Real-time operation during meetings:
- Instant suggestions for formulating answers
- Analysis of technical questions
- Generating counterarguments
- Searching information in history

#### Manual Mode
Manual mode for private requests:
- Ability to ask AI questions via microphone
- Receiving answers without participating in the main conversation
- Preparing complex answers

#### Recap & Summary
Automatic summary generation:
- Highlighting key points
- Formulating decisions
- Creating task lists
- Generating clarifying questions

### Performance and Latency

The system is optimized for real-time operation:
- Interaction latency under 500 ms
- Parallel processing of audio, video, and text requests
- Efficient resource usage even on minimal configurations

This comprehensive AI system makes Natively a powerful tool for professional situations, combining the speed of cloud models with the privacy of local processing.
