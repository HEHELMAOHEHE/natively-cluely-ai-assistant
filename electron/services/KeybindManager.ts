import { app, globalShortcut, Menu, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';

export interface KeybindConfig {
    id: string;
    label: string;
    accelerator: string; // Electron Accelerator string
    isGlobal: boolean;   // Registered with globalShortcut
    defaultAccelerator: string;
}

export const DEFAULT_KEYBINDS: KeybindConfig[] = [
    // General
    { id: 'general:toggle-visibility', label: 'Toggle Visibility', accelerator: 'CommandOrControl+B', isGlobal: true, defaultAccelerator: 'CommandOrControl+B' },
    { id: 'general:process-screenshots', label: 'Process Screenshots', accelerator: 'CommandOrControl+Enter', isGlobal: false, defaultAccelerator: 'CommandOrControl+Enter' },
    { id: 'general:reset-cancel', label: 'Reset / Cancel', accelerator: 'CommandOrControl+R', isGlobal: false, defaultAccelerator: 'CommandOrControl+R' },
    { id: 'general:take-screenshot', label: 'Take Screenshot', accelerator: 'CommandOrControl+H', isGlobal: false, defaultAccelerator: 'CommandOrControl+H' },
    { id: 'general:selective-screenshot', label: 'Selective Screenshot', accelerator: 'CommandOrControl+Shift+H', isGlobal: false, defaultAccelerator: 'CommandOrControl+Shift+H' },

    // Chat - Window Local (Handled via Menu or Renderer logic, but centralized here)
    { id: 'chat:whatToAnswer', label: 'What to Answer', accelerator: 'CommandOrControl+1', isGlobal: false, defaultAccelerator: 'CommandOrControl+1' },
    { id: 'chat:shorten', label: 'Shorten', accelerator: 'CommandOrControl+2', isGlobal: false, defaultAccelerator: 'CommandOrControl+2' },
    { id: 'chat:followUp', label: 'Follow Up', accelerator: 'CommandOrControl+3', isGlobal: false, defaultAccelerator: 'CommandOrControl+3' },
    { id: 'chat:recap', label: 'Recap', accelerator: 'CommandOrControl+4', isGlobal: false, defaultAccelerator: 'CommandOrControl+4' },
    { id: 'chat:answer', label: 'Answer / Record', accelerator: 'CommandOrControl+5', isGlobal: false, defaultAccelerator: 'CommandOrControl+5' },
    { id: 'chat:scrollUp', label: 'Scroll Up', accelerator: 'CommandOrControl+Up', isGlobal: false, defaultAccelerator: 'CommandOrControl+Up' },
    { id: 'chat:scrollDown', label: 'Scroll Down', accelerator: 'CommandOrControl+Down', isGlobal: false, defaultAccelerator: 'CommandOrControl+Down' },

    // Window Movement
    { id: 'window:move-up', label: 'Move Window Up', accelerator: 'CommandOrControl+Alt+Up', isGlobal: true, defaultAccelerator: 'CommandOrControl+Alt+Up' },
    { id: 'window:move-down', label: 'Move Window Down', accelerator: 'CommandOrControl+Alt+Down', isGlobal: true, defaultAccelerator: 'CommandOrControl+Alt+Down' },
    { id: 'window:move-left', label: 'Move Window Left', accelerator: 'CommandOrControl+Alt+Left', isGlobal: true, defaultAccelerator: 'CommandOrControl+Alt+Left' },
    { id: 'window:move-right', label: 'Move Window Right', accelerator: 'CommandOrControl+Alt+Right', isGlobal: true, defaultAccelerator: 'CommandOrControl+Alt+Right' },
];

export class KeybindManager {
    private static instance: KeybindManager;
    private keybinds: Map<string, KeybindConfig> = new Map();
    private filePath: string;
    private windowHelper: any; // Type avoided for circular dep, passed in init
    private onUpdateCallbacks: (() => void)[] = [];
    private registeredGlobalShortcuts: Set<string> = new Set();

    private constructor() {
        this.filePath = path.join(app.getPath('userData'), 'keybinds.json');
        this.load();
    }

    public onUpdate(callback: () => void) {
        this.onUpdateCallbacks.push(callback);
    }

    public static getInstance(): KeybindManager {
        if (!KeybindManager.instance) {
            KeybindManager.instance = new KeybindManager();
        }
        return KeybindManager.instance;
    }

    public setWindowHelper(windowHelper: any) {
        this.windowHelper = windowHelper;
        // Re-register globals now that we have the helper
        this.registerGlobalShortcuts();
    }

    private load() {
        // 1. Load Defaults
        DEFAULT_KEYBINDS.forEach(kb => this.keybinds.set(kb.id, { ...kb }));

        // 2. Load Overrides
        try {
            if (fs.existsSync(this.filePath)) {
                const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
                // Validate and merge
                for (const fileKb of data) {
                    if (this.keybinds.has(fileKb.id)) {
                        const current = this.keybinds.get(fileKb.id)!;
                        current.accelerator = fileKb.accelerator;
                        this.keybinds.set(fileKb.id, current);
                    }
                }
            }
        } catch (error) {
            console.error('[KeybindManager] Failed to load keybinds:', error);
        }
    }

    private save() {
        try {
            const data = Array.from(this.keybinds.values()).map(kb => ({
                id: kb.id,
                accelerator: kb.accelerator
            }));
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('[KeybindManager] Failed to save keybinds:', error);
        }
    }

    public getKeybind(id: string): string | undefined {
        return this.keybinds.get(id)?.accelerator;
    }

    public getAllKeybinds(): KeybindConfig[] {
        return Array.from(this.keybinds.values());
    }

    private normalizeAccelerator(accelerator: string): string {
        return (accelerator || '')
            .split('+')
            .map(part => part.trim())
            .filter(Boolean)
            .map(part => {
                const lower = part.toLowerCase();
                if (lower === 'cmdorctrl' || lower === 'commandorcontrol') return 'CommandOrControl';
                if (lower === 'ctrl' || lower === 'control') return 'Control';
                if (lower === 'cmd' || lower === 'command' || lower === 'meta') return 'Command';
                if (lower === 'option' || lower === 'alt') return 'Alt';
                if (lower === 'arrowup') return 'Up';
                if (lower === 'arrowdown') return 'Down';
                if (lower === 'arrowleft') return 'Left';
                if (lower === 'arrowright') return 'Right';
                if (part.length === 1) return part.toUpperCase();
                return part;
            })
            .join('+');
    }

    private hasDuplicateAccelerator(id: string, accelerator: string): boolean {
        const normalized = this.normalizeAccelerator(accelerator).toLowerCase();
        for (const [existingId, kb] of this.keybinds.entries()) {
            if (existingId === id) continue;
            if (this.normalizeAccelerator(kb.accelerator).toLowerCase() === normalized) {
                return true;
            }
        }
        return false;
    }

    public setKeybind(id: string, accelerator: string): boolean {
        if (!this.keybinds.has(id)) return false;

        const normalized = this.normalizeAccelerator(accelerator);
        if (!normalized || this.hasDuplicateAccelerator(id, normalized)) {
            return false;
        }

        const kb = this.keybinds.get(id)!;
        kb.accelerator = normalized;
        this.keybinds.set(id, kb);

        this.save();
        this.registerGlobalShortcuts(); // Re-register if it was a global one
        this.broadcastUpdate();
        return true;
    }

    public resetKeybinds() {
        this.keybinds.clear();
        DEFAULT_KEYBINDS.forEach(kb => this.keybinds.set(kb.id, { ...kb }));
        this.save();
        this.registerGlobalShortcuts();
        this.broadcastUpdate();
    }

    public registerGlobalShortcuts() {
        for (const accelerator of this.registeredGlobalShortcuts) {
            try {
                globalShortcut.unregister(accelerator);
            } catch {
                // ignore
            }
        }
        this.registeredGlobalShortcuts.clear();

        const register = (id: string, handler: () => void) => {
            const kb = this.keybinds.get(id);
            if (!kb || !kb.isGlobal || !kb.accelerator) return;
            const accelerator = this.normalizeAccelerator(kb.accelerator);
            try {
                globalShortcut.register(accelerator, handler);
                const ok = globalShortcut.isRegistered(accelerator);
                if (ok) {
                    this.registeredGlobalShortcuts.add(accelerator);
                } else {
                    console.warn(`[KeybindManager] Failed to register global shortcut: ${id} (${accelerator})`);
                }
            } catch (error) {
                console.warn(`[KeybindManager] Invalid global shortcut: ${id} (${accelerator})`, error);
            }
        };

        register('general:toggle-visibility', () => this.windowHelper?.toggleMainWindow());
        register('window:move-up', () => this.windowHelper?.moveWindowUp());
        register('window:move-down', () => this.windowHelper?.moveWindowDown());
        register('window:move-left', () => this.windowHelper?.moveWindowLeft());
        register('window:move-right', () => this.windowHelper?.moveWindowRight());

        this.updateMenu();
    }

    public updateMenu() {
        const toggleKb = this.keybinds.get('general:toggle-visibility');
        const toggleAccelerator = toggleKb ? toggleKb.accelerator : 'CommandOrControl+B';

        const template: any[] = [
            {
                label: app.name,
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide', accelerator: 'CommandOrControl+Option+H' },
                    { role: 'hideOthers', accelerator: 'CommandOrControl+Option+Shift+H' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' }
                ]
            },
            {
                role: 'editMenu'
            },
            {
                label: 'View',
                submenu: [
                    {
                        label: 'Toggle Visibility',
                        accelerator: toggleAccelerator,
                        click: () => {
                            if (this.windowHelper) {
                                this.windowHelper.toggleMainWindow();
                            }
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Move Window Up',
                        accelerator: this.getKeybind('window:move-up') || 'CommandOrControl+Up',
                        click: () => this.windowHelper?.moveWindowUp()
                    },
                    {
                        label: 'Move Window Down',
                        accelerator: this.getKeybind('window:move-down') || 'CommandOrControl+Down',
                        click: () => this.windowHelper?.moveWindowDown()
                    },
                    {
                        label: 'Move Window Left',
                        accelerator: this.getKeybind('window:move-left') || 'CommandOrControl+Left',
                        click: () => this.windowHelper?.moveWindowLeft()
                    },
                    {
                        label: 'Move Window Right',
                        accelerator: this.getKeybind('window:move-right') || 'CommandOrControl+Right',
                        click: () => this.windowHelper?.moveWindowRight()
                    },
                    { type: 'separator' },
                    { role: 'reload' },
                    { role: 'forceReload' },
                    { role: 'toggleDevTools' },
                    { type: 'separator' },
                    { role: 'resetZoom' },
                    { role: 'zoomIn' },
                    { role: 'zoomOut' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' }
                ]
            },
            {
                role: 'windowMenu'
            },
            {
                role: 'help',
                submenu: [
                    {
                        label: 'Learn More',
                        click: async () => {
                            const { shell } = require('electron');
                            await shell.openExternal('https://electronjs.org');
                        }
                    }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
        console.log('[KeybindManager] Application menu updated');
    }

    private broadcastUpdate() {
        // Notify main process listeners
        this.onUpdateCallbacks.forEach(cb => cb());

        const windows = BrowserWindow.getAllWindows();
        const allKeybinds = this.getAllKeybinds();
        windows.forEach(win => {
            if (!win.isDestroyed()) {
                win.webContents.send('keybinds:update', allKeybinds);
            }
        });
    }

    public setupIpcHandlers() {
        ipcMain.handle('keybinds:get-all', () => {
            return this.getAllKeybinds();
        });

        ipcMain.handle('keybinds:set', (_, id: string, accelerator: string) => {
            console.log(`[KeybindManager] Set ${id} -> ${accelerator}`);
            return this.setKeybind(id, accelerator);
        });

        ipcMain.handle('keybinds:reset', () => {
            console.log('[KeybindManager] Reset defaults');
            this.resetKeybinds();
            return this.getAllKeybinds();
        });
    }
}
