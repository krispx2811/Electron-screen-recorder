// Main Application Controller
class App {
    constructor() {
        this.recorder = null;
        this.ui = null;
        this.isInitialized = false;
    }
    
    async initialize() {
        try {
            console.log('Starting OMEGA Screen Recorder...');
            
            // Initialize UI first
            this.ui = new UI();
            if (!this.ui.initialize()) {
                throw new Error('Failed to initialize UI');
            }
            
            // Set initial status
            this.ui.updateStatus('idle');
            
            // Initialize recorder
            this.recorder = new ScreenRecorder();
            
            // Setup recorder callbacks
            this.setupRecorderCallbacks();
            
            // Initialize recorder
            const recorderInitialized = await this.recorder.initialize();
            if (!recorderInitialized) {
                throw new Error('Failed to initialize recorder');
            }
            
            // Set ready status
            this.ui.updateStatus('ready');
            this.isInitialized = true;
            
            console.log('Application initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Application initialization failed:', error);
            
            if (this.ui) {
                this.ui.showError('Failed to initialize. Please refresh the page.');
            }
            
            return false;
        }
    }
    
    setupRecorderCallbacks() {
        // Status change callback
        this.recorder.onStatusChange = (status) => {
            this.ui.updateStatus(status);
            
            if (status === 'recording') {
                this.ui.disableControls();
            } else {
                this.ui.enableControls();
            }
        };
        
        // Timer update callback
        this.recorder.onTimerUpdate = (seconds) => {
            this.ui.updateTimer(seconds);
        };
        
        // Error callback
        this.recorder.onError = (message) => {
            this.ui.showError(message);
            this.ui.updateStatus('ready');
            this.ui.enableControls();
        };
        
        // Recording complete callback
        this.recorder.onRecordingComplete = (info) => {
            this.handleRecordingComplete(info);
        };
    }
    
    async toggleRecording() {
        if (!this.isInitialized) {
            this.ui.showError('Application not initialized');
            return false;
        }
        
        if (this.recorder.isRecording) {
            return await this.stopRecording();
        } else {
            return await this.startRecording();
        }
    }
    
    async startRecording() {
        if (!this.isInitialized) {
            this.ui.showError('Application not initialized');
            return false;
        }
        
        if (this.recorder.isRecording) {
            this.ui.showError('Recording already in progress');
            return false;
        }
        
        try {
            // Update filename from UI if changed
            const currentFilename = this.ui.getCurrentFilename();
            if (currentFilename !== this.recorder.settings.filename) {
                this.recorder.updateSettings('filename', currentFilename);
            }
            
            // Start recording
            const success = await this.recorder.startRecording();
            
            if (success) {
                console.log('Recording started successfully');
            }
            
            return success;
            
        } catch (error) {
            console.error('Start recording failed:', error);
            this.ui.showError('Failed to start recording');
            return false;
        }
    }
    
    async stopRecording() {
        if (!this.isInitialized) {
            return false;
        }
        
        if (!this.recorder.isRecording) {
            return true;
        }
        
        try {
            const success = await this.recorder.stopRecording();
            
            if (success) {
                console.log('Recording stopped successfully');
                this.ui.resetTimer();
            }
            
            return success;
            
        } catch (error) {
            console.error('Stop recording failed:', error);
            this.ui.showError('Failed to stop recording');
            return false;
        }
    }
    
    handleRecordingComplete(info) {
        console.log('Recording completed:', info);
        
        const fileSize = (info.size / (1024 * 1024)).toFixed(2);
        const duration = Utils.formatTime(info.duration);
        const message = `Recording saved: ${info.filename} (${fileSize}MB, ${duration})`;
        
        this.ui.showSuccess('Recording saved successfully');
        console.log(message);
    }
    
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            recorder: this.recorder ? this.recorder.getStatus() : null,
            ui: this.ui ? { isInitialized: this.ui.isInitialized } : null
        };
    }
    
    updateSettings(settings) {
        if (!this.isInitialized || !this.recorder) {
            return;
        }
        
        Object.keys(settings).forEach(key => {
            this.recorder.updateSettings(key, settings[key]);
        });
        
        console.log('Settings updated:', settings);
    }
    
    reset() {
        if (this.recorder && this.recorder.isRecording) {
            this.stopRecording();
        }
        
        if (this.ui) {
            this.ui.resetTimer();
            this.ui.updateStatus('ready');
            this.ui.enableControls();
        }
        
        console.log('Application reset');
    }
    
    handleError(context, error) {
        console.error(`${context}:`, error);
        
        if (this.ui) {
            this.ui.showError(`${context}: ${error.message}`);
        }
        
        if (this.recorder && this.recorder.isRecording) {
            this.recorder.stopRecording();
        }
    }
    
    dispose() {
        console.log('Disposing application...');
        
        if (this.recorder && this.recorder.isRecording) {
            this.recorder.stopRecording();
        }
        
        if (this.recorder) {
            this.recorder.dispose();
            this.recorder = null;
        }
        
        if (this.ui) {
            this.ui.dispose();
            this.ui = null;
        }
        
        this.isInitialized = false;
        console.log('Application disposed');
    }
}

// Create global app instance
window.App = new App();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing application...');
    
    // Add immediate button test
    const recordBtn = document.getElementById('recordBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    if (recordBtn) {
        console.log('Record button found');
        recordBtn.addEventListener('click', () => {
            console.log('Record button clicked!');
        });
    } else {
        console.error('Record button not found!');
    }
    
    if (stopBtn) {
        console.log('Stop button found');
        stopBtn.addEventListener('click', () => {
            console.log('Stop button clicked!');
        });
    } else {
        console.error('Stop button not found!');
    }
    
    try {
        const initialized = await window.App.initialize();
        
        if (initialized) {
            console.log('✅ Application ready!');
        } else {
            throw new Error('Application initialization failed');
        }
        
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.textContent = 'Failed to initialize. Please restart the app.';
            statusElement.style.color = '#ef4444';
        }
    }
});

// Handle page unload
window.addEventListener('beforeunload', (e) => {
    if (window.App && window.App.recorder && window.App.recorder.isRecording) {
        const message = 'Recording is in progress. Are you sure you want to leave?';
        e.preventDefault();
        e.returnValue = message;
        return message;
    }
});

// Handle unload cleanup
window.addEventListener('unload', () => {
    if (window.App) {
        window.App.dispose();
    }
});

// Handle uncaught errors
window.addEventListener('error', (e) => {
    console.error('Uncaught error:', e.error);
    
    if (window.App) {
        window.App.handleError('Uncaught error', e.error);
    }
});

// Export for debugging
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        App: window.App,
        CONFIG,
        Utils
    };
}