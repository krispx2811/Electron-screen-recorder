// Utility functions
class Utils {
    static formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    static getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }
    
    static generateFilename(extension = 'webm') {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
        return `recording_${timestamp}.${extension}`;
    }
    
    static async checkFFmpegAvailability() {
        const { ipcRenderer } = require('electron');
        return await ipcRenderer.invoke('check-ffmpeg');
    }
    
    static showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('OMEGA Screen Recorder', {
                body: message,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%238b5cf6"><circle cx="12" cy="12" r="10"/></svg>'
            });
        }
    }
}