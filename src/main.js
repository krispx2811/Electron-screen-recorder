const { app, BrowserWindow, ipcMain, desktopCapturer, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 380,
        height: 650,
        minWidth: 380,
        minHeight: 650,
        resizable: true, // Allow resizing
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            enableRemoteModule: true
        },
        backgroundColor: '#1e1e2e',
        show: false
    });

    mainWindow.loadFile('src/renderer/index.html');

    // Show window when ready to prevent white flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Open DevTools in development
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC handlers
ipcMain.handle('get-sources', async () => {
    try {
        console.log('Getting desktop capturer sources...');
        const sources = await desktopCapturer.getSources({
            types: ['window', 'screen'],
            thumbnailSize: { width: 150, height: 150 }
        });
        console.log(`Found ${sources.length} sources:`, sources.map(s => s.name));
        return sources;
    } catch (error) {
        console.error('Error getting sources:', error);
        return [];
    }
});

ipcMain.handle('show-save-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: options.defaultPath || 'recording.webm',
        filters: [
            { name: 'WebM Videos', extensions: ['webm'] },
            { name: 'MP4 Videos', extensions: ['mp4'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    return result;
});

ipcMain.handle('show-message', async (event, options) => {
    return await dialog.showMessageBox(mainWindow, options);
});

ipcMain.handle('check-ffmpeg', async () => {
    const { spawn } = require('child_process');
    
    return new Promise((resolve) => {
        try {
            const ffmpeg = spawn('ffmpeg', ['-version']);
            
            ffmpeg.on('close', (code) => {
                resolve(code === 0);
            });
            
            ffmpeg.on('error', () => {
                resolve(false);
            });
        } catch (error) {
            resolve(false);
        }
    });
});