## 7. User Interface and User Experience

Natively provides an advanced, productivity-focused interface designed for real-time operation during meetings, interviews, and presentations.

### Main Interface Components

#### Main Window
The central hub of the application, containing:
- **AI Control Panel**: operation modes, models, and settings management
- **Screenshot Queue**: visual representation of captured images
- **View Modes**: switching between "queue" and "solutions"
- **Control Elements**: buttons for manual analysis, queue clearing, and export

#### Overlay
A semi-transparent window that floats above other windows, providing:
- **Always on Top**: works over Zoom, Teams, Meet, and other applications
- **Minimalist Design**: doesn't distract from the main meeting
- **Quick Access**: instant show/hide via hotkeys
- **Recommendations Display**: suggested answers, explanations, tips

#### Modal Windows
- **SettingsWindowHelper**: detailed audio, AI, hotkey settings
- **ModelSelectorWindowHelper**: active AI model selection
- **LauncherWindow**: quick access to main features

### Display Modes

#### Normal Mode
Standard mode with full feature set:
- Visible window in dock/taskbar
- Full access to all features
- Normal process name and icon

#### Stealth Mode 2.0
Advanced mode for situations requiring hiding assistant usage:

```typescript
public setUndetectable(state: boolean): void {
  this.isUndetectable = state;
  this.windowHelper.setContentProtection(state);
  
  // Apply disguise
  if (state && this.disguiseMode !== 'none') {
    this._applyDisguise(this.disguiseMode);
  } else if (!state) {
    this._applyDisguise('none');
  }
}
```

**Features:**
- Hiding from dock (macOS) or taskbar (Windows)
- Screenshot blocking
- Disabling notifications
- Setting `accessory` flag for macOS

#### Disguise Mode
System for disguising the application as system utilities:

```typescript
private _applyDisguise(mode: 'terminal' | 'settings' | 'activity' | 'none'): void {
  let appName = "";
  switch (mode) {
    case 'terminal': appName = "Terminal "; break;
    case 'settings': appName = "System Settings "; break;
    case 'activity': appName = "Activity Monitor "; break;
    default: appName = "Natively";
  }
  
  process.title = appName;
  app.setName(appName);
  // ... update icons and titles
}
```

**Available Disguise Options:**
- **Terminal**: disguise as terminal
- **System Settings**: disguise as system settings
- **Activity Monitor**: disguise as activity monitor
- **None**: standard display

### Window Management

#### Main Methods
```typescript
public createWindow(): void { /* Create main window */ }
public hideMainWindow(): void { /* Hide window */ }
public showMainWindow(): void { /* Show window */ }
public toggleMainWindow(): void { /* Toggle visibility */ }
public centerAndShowWindow(): void { /* Center and show */ }
```

#### Window Positioning
- **moveWindowLeft/right/up/down()**: move window to one-third of screen
- **centerAndShowWindow()**: center and show window
- Automatic saving of last position and size

### Hotkeys

#### Global Combinations
Managed through `KeybindManager` with full customization support:

```typescript
// Default
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

#### Hotkey Categories
1. **General**:
   - Show/hide main window
   - Take screenshot
   - Move window
   - Switch to overlay

2. **AI Functions**:
   - Voice AI request
   - Answer regeneration
   - Brief answer
   - Detailed answer

3. **Meetings**:
   - Start meeting recording
   - End meeting
   - Add note

### User Interactions

#### Notification System
- **Sound Signals**: short sounds for various events
- **Visual Indicators**: window border color changes
- **Toast Notifications**: temporary status messages

#### State Indication
- **Volume Level**: visual indicator during microphone testing
- **Connection Status**: STT and LLM activity indication
- **Processing Progress**: animated indicators during analysis

### Visual Content Analysis

#### Screenshot Capture
```typescript
public async takeScreenshot(
  onBeforeCapture: () => void,
  onAfterCapture: () => void
): Promise<string> {
  onBeforeCapture();
  const screenshotPath = await this.captureScreen();
  this.screenshotQueue.push(screenshotPath);
  onAfterCapture();
  return screenshotPath;
}
```

#### Capture Modes
1. **Full Screen**: automatic capture of entire screen
2. **Area Selection**: user selects area manually
3. **Automatic**: by triggers (e.g., when code is detected)

#### Screenshot Queue
- Store images for manual analysis
- Visual representation in interface
- Ability to delete individual items

### Themes and Styling

#### Theme Management
Implemented through `ThemeManager`:
- Light theme
- Dark theme
- System (follows OS settings)

#### Technologies
- **TailwindCSS**: utility-first approach to styling
- **React**: component-based interface
- **Vite**: fast build and HMR

### UX Features

#### Minimizing Interruptions
- **Non-intrusive Notifications**: information appears only when needed
- **Do Not Disturb Mode**: disabling notifications during important moments
- **Adaptive Interface**: automatic hiding of secondary elements

#### Performance
- **Lazy Loading**: settings windows preloaded in background
- **Optimized Rendering**: minimal GPU resource consumption
- **Low Latency**: quick response to user actions

#### Accessibility
- Keyboard navigation support
- High contrast color schemes
- Adaptation for various screen sizes

### Communication with Main Process

#### IPC Handlers
```typescript
ipcMain.handle('get-ollama-models', async () => {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      const data = await response.json();
      return data.models.map((m: any) => m.name);
    }
    return [];
  } catch (error) {
    return [];
  }
});
```

#### Main Communication Channels
- `take-screenshot`: screen capture request
- `screenshot-taken`: screenshot taken notification
- `audio-level`: volume level for visualization
- `update-available`: update availability
- `intelligence-*`: events from AI module

This comprehensive approach to interface makes Natively a powerful tool that is simultaneously unobtrusive and functional, providing a balance between informativeness and minimalism.
