/**
 * ================================================================================
 * InstallPingManager - Anonymous Install Counter
 * ================================================================================
 */

import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const INSTALL_PING_URL = 'https://divine-sun-927d.natively.workers.dev';

// Local storage paths
const INSTALL_ID_PATH = path.join(app.getPath('userData'), 'install_id.txt');
const INSTALL_PING_SENT_PATH = path.join(app.getPath('userData'), 'install_ping_sent.txt');

export function getOrCreateInstallId(): string {
    try {
        if (fs.existsSync(INSTALL_ID_PATH)) {
            const existingId = fs.readFileSync(INSTALL_ID_PATH, 'utf-8').trim();
            if (existingId && existingId.length > 0) {
                return existingId;
            }
        }

        const newId = uuidv4();
        fs.writeFileSync(INSTALL_ID_PATH, newId, 'utf-8');
        console.log('[InstallPingManager] Generated new install ID');
        return newId;
    } catch (error) {
        console.error('[InstallPingManager] Error managing install ID:', error);
        return uuidv4();
    }
}

function hasInstallPingBeenSent(): boolean {
    try {
        if (fs.existsSync(INSTALL_PING_SENT_PATH)) {
            const value = fs.readFileSync(INSTALL_PING_SENT_PATH, 'utf-8').trim();
            return value === 'true';
        }
        return false;
    } catch {
        return false;
    }
}

function markInstallPingSent(): void {
    try {
        fs.writeFileSync(INSTALL_PING_SENT_PATH, 'true', 'utf-8');
        console.log('[InstallPingManager] Install ping marked as sent');
    } catch (error) {
        console.error('[InstallPingManager] Error marking ping as sent:', error);
    }
}

export async function sendAnonymousInstallPing(): Promise<void> {
    try {
        if (hasInstallPingBeenSent()) {
            console.log('[InstallPingManager] Install ping already sent, skipping');
            return;
        }

        const installId = getOrCreateInstallId();
        const version = app.getVersion();
        const platform = process.platform;

        const payload = {
            app: 'natively',
            install_id: installId,
            version: version,
            platform: platform
        };

        console.log('[InstallPingManager] Sending anonymous install ping...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(INSTALL_PING_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            markInstallPingSent();
            console.log('[InstallPingManager] Install ping sent successfully');
        } else {
            console.log(`[InstallPingManager] Install ping failed with status: ${response.status}`);
        }
    } catch (error) {
        console.log('[InstallPingManager] Install ping failed (silent):', error instanceof Error ? error.message : 'Unknown error');
    }
}

export const InstallPingManager = {
    getOrCreateInstallId,
    sendAnonymousInstallPing
};
