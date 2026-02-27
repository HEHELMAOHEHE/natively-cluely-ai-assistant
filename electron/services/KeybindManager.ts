import { log } from '@utils/logger';
import { app, globalShortcut, Menu, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';

export interface KeybindConfig {
    id: string;
    label: string;
    accelerator: string;
    isGlobal: boolean;
    defaultAccelerator: string;
}

// --- DEFAULTS ---
export const DEFAULT_KEYBINDS: KeybindConfig[] = [
    { id: 'general:toggle-visibility', label: 'Toggle Visibility', accelerator: 'CommandOrControl+B', isGlobal: true, defaultAccelerator: 'CommandOrControl+B' },
    { id: 'general:process-screenshots', label: 'Process Screenshots', accelerator: 'CommandOrControl+Enter', isGlobal: false, defaultAccelerator: 'CommandOrControl+Enter' },
    { id: 'general:reset-cancel', label: 'Reset / Cancel', accelerator: 'CommandOrControl+R', isGlobal: false, defaultAccelerator: 'CommandOrControl+R' },
    { id: 'general:take-screenshot', label: 'Take Screenshot', accelerator: 'CommandOrControl+H', isGlobal: false, defaultAccelerator: 'CommandOrControl+H' },
    { id: 'general:selective-screenshot', label: 'Selective Screenshot', accelerator: 'CommandOrControl+Shift+H', isGlobal: false, defaultAccelerator: 'CommandOrControl+Shift+H' },
    { id: 'chat:whatToAnswer', label: 'What to Answer', accelerator: 'CommandOrControl+1', isGlobal: false, defaultAccelerator: 'CommandOrControl+1' },
    { id: 'chat:shorten', label: 'Shorten', accelerator: 'CommandOrControl+2', isGlobal: false, defaultAccelerator: 'CommandOrControl+2' },
    { id: 'chat:followUp', label: 'Follow Up', accelerator: 'CommandOrControl+3', isGlobal: false, defaultAccelerator: 'CommandOrControl+3' },
    { id: 'chat:recap', label: 'Recap', accelerator: 'CommandOrControl+4', isGlobal: false, defaultAccelerator: 'CommandOrControl+4' },
    { id: 'chat:answer', label: 'Answer / Record', accelerator: 'CommandOrControl+5', isGlobal: false, defaultAccelerator: 'CommandOrControl+5' },
    { id: 'chat:scrollUp', label: 'Scroll Up', accelerator: 'CommandOrControl+Up', isGlobal: false, defaultAccelerator: 'CommandOrControl+Up' },
    { id: 'chat:scrollDown', label: 'Scroll Down', accelerator: 'CommandOrControl+Down', isGlobal: false, defaultAccelerator: 'CommandOrControl+Down' },
    { id: 'window:move-up', label: 'Move Window Up', accelerator: 'CommandOrControl+Alt+Up', isGlobal: true, defaultAccelerator: 'CommandOrControl+Alt+Up' },
    { id: 'window:move-down', label: 'Move Window Down', accelerator: 'CommandOrControl+Alt+Down', isGlobal: true, defaultAccelerator: 'CommandOrControl+Alt+Down' },
    { id: 'window:move-left', label: 'Move Window Left', accelerator: 'CommandOrControl+Alt+Left', isGlobal: true, defaultAccelerator: 'CommandOrControl+Alt+Left' },
    { id: 'window:move-right', label: 'Move Window Right', accelerator: 'CommandOrControl+Alt+Right', isGlobal: true, defaultAccelerator: 'CommandOrControl+Alt+Right' },
];

// --- WINDOW HELPER INTERFACE ---
export interface WindowHelper {
    toggleMainWindow(): void;
    moveWindowUp(): void;
    moveWindowDown(): void;
    moveWindowLeft(): void;
    moveWindowRight(): void;
}

// --- KEYBIND MANAGER ---
export class KeybindManager {
    private static instance: KeybindManager;
    private keybinds: Map<string, KeybindConfig> = new Map();
    private filePath: string;
    private windowHelper?: WindowHelper;
    private onUpdateCallbacks: (() => void)[] = [];
    private onShortcutTriggeredCallbacks: ((actionId: string) => void)[] = [];
    private registeredGlobalShortcuts: Set<string> = new Set();

    private constructor() {
        this.filePath = path.join(app.getPath('userData'), 'keybinds.json');
        this.load();
    }

    public static getInstance(): KeybindManager {
        if (!KeybindManager.instance) {
            KeybindManager.instance = new KeybindManager();
        }
        return KeybindManager.instance;
    }

    public onUpdate(callback: () => void) {
        this.onUpdateCallbacks.push(callback);
    }

    public onShortcutTriggered(callback: (actionId: string) => void) {
        this.onShortcutTriggeredCallbacks.push(callback);
    }

    public setWindowHelper(helper: WindowHelper) {
        this.windowHelper = helper;
        this.registerGlobalShortcuts();
    }

    // --- LOAD / SAVE ---
    private load() {
        DEFAULT_KEYBINDS.forEach(kb => this.keybinds.set(kb.id, { ...kb }));
        try {
            if (fs.existsSync(this.filePath)) {
                const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
                for (const fileKb of data) {
                    if (this.keybinds.has(fileKb.id)) {
                        const kb = this.keybinds.get(fileKb.id)!;
                        kb.accelerator = fileKb.accelerator;
                        this.keybinds.set(kb.id, kb);
                    }
                }
            }
        } catch (err) {
            log.warn('[KeybindManager] Failed to load keybinds, using defaults:', err);
        }
    }

    private save() {
        try {
            const data = Array.from(this.keybinds.values()).map(kb => ({
                id: kb.id,
                accelerator: kb.accelerator
            }));
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
        } catch (err) {
            log.error('[KeybindManager] Failed to save keybinds:', err);
        }
    }

    // --- NORMALIZATION ---
    // --- NORMALIZATION AND PLATFORM CONVERSION ---
private normalizeAccelerator(accelerator: string): string {
    if (!accelerator) return '';

    const parts = accelerator.split('+').map(p => p.trim()).filter(Boolean);

    const normalizedParts = parts.map(part => {
        const lower = part.toLowerCase();
        switch (lower) {
            case 'cmdorctrl':
            case 'commandorcontrol':
                return 'CommandOrControl'; // Electron сам конвертирует под платформу
            case 'ctrl':
            case 'control':
                return 'Control';
            case 'cmd':
            case 'command':
            case 'meta':
                return 'Command';
            case 'option':
            case 'alt':
                return 'Alt';
            case 'shift':
                return 'Shift';
            case 'arrowup': return 'Up';
            case 'arrowdown': return 'Down';
            case 'arrowleft': return 'Left';
            case 'arrowright': return 'Right';
        }

        if (/^f\d{1,2}$/i.test(lower)) return lower.toUpperCase(); // F1-F12
        if (part.length === 1) return part.toUpperCase();           // буквы/цифры
        return part; // оставляем как есть
    });

    return normalizedParts.join('+');
}

    private hasDuplicateAccelerator(id: string, accelerator: string): boolean {
        const normalized = this.normalizeAccelerator(accelerator).toLowerCase();
        for (const [key, kb] of this.keybinds.entries()) {
            if (key === id) continue;
            if (this.normalizeAccelerator(kb.accelerator).toLowerCase() === normalized) return true;
        }
        return false;
    }

    // --- PUBLIC METHODS ---
    public getKeybind(id: string): string | undefined {
        return this.keybinds.get(id)?.accelerator;
    }

    public getAllKeybinds(): KeybindConfig[] {
        return Array.from(this.keybinds.values());
    }

    public setKeybind(id: string, accelerator: string): { success: boolean; reason?: string } {
        if (!this.keybinds.has(id)) return { success: false, reason: 'Invalid keybind ID' };

        const normalized = this.normalizeAccelerator(accelerator);
        if (!normalized) return { success: false, reason: 'Empty accelerator' };
        if (this.hasDuplicateAccelerator(id, normalized)) return { success: false, reason: 'Duplicate accelerator' };

        const kb = this.keybinds.get(id)!;
        kb.accelerator = normalized;
        this.keybinds.set(id, kb);
        this.save();

        this.registerGlobalShortcuts();
        this.broadcastUpdate();
        return { success: true };
    }

    public resetKeybinds() {
        this.keybinds.clear();
        DEFAULT_KEYBINDS.forEach(kb => this.keybinds.set(kb.id, { ...kb }));
        this.save();
        this.registerGlobalShortcuts();
        this.broadcastUpdate();
    }

    // --- GLOBAL SHORTCUTS ---
    public registerGlobalShortcuts() {
    // Убираем старые
    this.registeredGlobalShortcuts.forEach(acc => {
        if (globalShortcut.isRegistered(acc)) globalShortcut.unregister(acc);
    });
    this.registeredGlobalShortcuts.clear();

    if (!this.windowHelper) return;

    const mapping: Record<string, () => void> = {
        'general:toggle-visibility': () => this.windowHelper!.toggleMainWindow(),
        'window:move-up': () => this.windowHelper!.moveWindowUp(),
        'window:move-down': () => this.windowHelper!.moveWindowDown(),
        'window:move-left': () => this.windowHelper!.moveWindowLeft(),
        'window:move-right': () => this.windowHelper!.moveWindowRight(),
    };

    Object.entries(mapping).forEach(([id, handler]) => {
        const kb = this.keybinds.get(id);
        if (!kb || !kb.isGlobal || !kb.accelerator) return;

        const acc = this.normalizeAccelerator(kb.accelerator);

        try {
            if (!globalShortcut.isRegistered(acc)) {
                globalShortcut.register(acc, () => {
                    log.info(`[KeybindManager] Shortcut triggered: ${acc} -> ${kb.label}`);
                    // Notify callbacks
                    this.onShortcutTriggeredCallbacks.forEach(cb => cb(kb.id));
                    handler();
                });
                this.registeredGlobalShortcuts.add(acc);
            }
        } catch (err) {
            log.warn(`[KeybindManager] Invalid global shortcut: ${id} (${acc})`, err);
        }
    });

    this.updateMenu();
}

    // --- MENU ---
    public updateMenu() {
        const template: any[] = [
            { label: app.name, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }] },
            {
                label: 'View',
                submenu: [
                    // Note: Toggle Visibility is handled by globalShortcut, not menu accelerator
                    // This prevents double-trigger when pressing Ctrl+B
                    { label: 'Toggle Visibility', click: () => this.windowHelper?.toggleMainWindow() },
                    { type: 'separator' },
                    { label: 'Move Window Up', accelerator: this.getKeybind('window:move-up'), click: () => this.windowHelper?.moveWindowUp() },
                    { label: 'Move Window Down', accelerator: this.getKeybind('window:move-down'), click: () => this.windowHelper?.moveWindowDown() },
                    { label: 'Move Window Left', accelerator: this.getKeybind('window:move-left'), click: () => this.windowHelper?.moveWindowLeft() },
                    { label: 'Move Window Right', accelerator: this.getKeybind('window:move-right'), click: () => this.windowHelper?.moveWindowRight() },
                ]
            }
        ];

        Menu.setApplicationMenu(Menu.buildFromTemplate(template));
        log.info('[KeybindManager] Menu updated');
    }

    // --- IPC ---
    public setupIpcHandlers() {
        ipcMain.handle('keybinds:get-all', () => this.getAllKeybinds());
        ipcMain.handle('keybinds:set', (_, id: string, accelerator: string) => this.setKeybind(id, accelerator));
        ipcMain.handle('keybinds:reset', () => {
            this.resetKeybinds();
            return this.getAllKeybinds();
        });
    }

    // --- BROADCAST ---
    private broadcastUpdate() {
        this.onUpdateCallbacks.forEach(cb => cb());
        const windows = BrowserWindow.getAllWindows();
        const allKeybinds = this.getAllKeybinds();
        windows.forEach(win => {
            if (!win.isDestroyed()) win.webContents.send('keybinds:update', allKeybinds);
        });
    }
}