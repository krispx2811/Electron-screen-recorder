// UI Management Class
class UI {
    constructor() {
        this.elements = {};
        this.isInitialized = false;
        this.buttonGroups = {};
    }
    
    initialize() {
        try {
            this.cacheElements();
            this.bindEvents();
            this.setupInitialState();
            this.isInitialized = true;
            
            console.log('UI initialized successfully');
            return true;
            
        } catch (error) {
            console.error('UI initialization failed:', error);
            return false;
        }
    }
    
    cacheElements() {
        const elementIds = [
            'statusIndicator',
            'statusText', 
            'timerDisplay',
            'recordBtn',
            'stopBtn',
            'fileInput',
            'browseBtn',
            'statusMessage',
            'qualityButtons',
            'fpsButtons',
            'resolutionButtons'
        ];
        
        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                throw new Error(`Required element not found: ${id}`);
            }
            this.elements[id] = element;
        });
        
        // Cache button groups
        this.buttonGroups = {
            quality: this.elements.qualityButtons.querySelectorAll('.setting-btn'),
            fps: this.elements.fpsButtons.querySelectorAll('.setting-btn'),
            resolution: this.elements.resolutionButtons.querySelectorAll('.setting-btn')
        };
    }
    
    bindEvents() {
        console.log('Binding UI events...');
        
        // Control buttons - add immediate debugging
        if (this.elements.recordBtn) {
            console.log('Binding record button events');
            this.elements.recordBtn.addEventListener('click', (e) => {
                console.log('Record button clicked in UI handler');
                e.preventDefault();
                this.handleRecordClick();
            });
        } else {
            console.error('Record button element not found');
        }
        
        if (this.elements.stopBtn) {
            console.log('Binding stop button events');
            this.elements.stopBtn.addEventListener('click', (e) => {
                console.log('Stop button clicked in UI handler');
                e.preventDefault();
                this.handleStopClick();
            });
        } else {
            console.error('Stop button element not found');
        }
        
        // File input
        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('input', (e) => {
                console.log('File input changed:', e.target.value);
                this.handleFileInputChange(e.target.value);
            });
        }
        
        if (this.elements.browseBtn) {
            this.elements.browseBtn.addEventListener('click', (e) => {
                console.log('Browse button clicked');
                e.preventDefault();
                this.showFilePicker();
            });
        }
        
        // Setting buttons
        console.log('Binding setting buttons...');
        this.bindSettingButtons('quality');
        this.bindSettingButtons('fps');
        this.bindSettingButtons('resolution');
        
        // Keyboard shortcuts
        this.bindKeyboardShortcuts();
        
        // Window events
        window.addEventListener('beforeunload', (e) => {
            this.handleBeforeUnload(e);
        });
        
        console.log('UI events binding completed');
    }
    
    bindSettingButtons(setting) {
        const buttons = this.buttonGroups[setting];
        console.log(`Binding ${setting} buttons, found:`, buttons.length);
        
        buttons.forEach((btn, index) => {
            console.log(`Binding ${setting} button ${index}:`, btn.dataset.value);
            btn.addEventListener('click', (e) => {
                console.log(`${setting} button clicked:`, btn.dataset.value);
                e.preventDefault();
                const value = btn.dataset.value;
                this.updateSettingButtons(setting, value);
                this.notifySettingChange(setting, value);
            });
        });
    }
    
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                if (!App.recorder.isRecording) {
                    this.handleRecordClick();
                } else {
                    this.handleStopClick();
                }
            }
            
            if (e.key === 'Escape' && App.recorder.isRecording) {
                this.handleStopClick();
            }
        });
    }
    
    setupInitialState() {
        this.updateStatus('ready');
        this.resetTimer();
        this.updateStatusMessage('Ready to record');
        
        // Set default active buttons
        this.updateSettingButtons('quality', CONFIG.DEFAULT_SETTINGS.quality);
        this.updateSettingButtons('fps', CONFIG.DEFAULT_SETTINGS.fps);
        this.updateSettingButtons('resolution', CONFIG.DEFAULT_SETTINGS.resolution);
    }
    
    updateStatus(status) {
        if (!this.isInitialized) return;
        
        const indicator = this.elements.statusIndicator;
        const text = this.elements.statusText;
        
        indicator.classList.remove('ready', 'recording', 'idle');
        
        switch (status) {
            case 'recording':
                indicator.classList.add('recording');
                text.textContent = 'REC';
                this.elements.recordBtn.disabled = true;
                this.elements.stopBtn.disabled = false;
                this.updateStatusMessage('Recording in progress...');
                break;
                
            case 'ready':
                indicator.classList.add('ready');
                text.textContent = 'READY';
                this.elements.recordBtn.disabled = false;
                this.elements.stopBtn.disabled = true;
                this.updateStatusMessage('Ready to record');
                break;
                
            case 'idle':
                indicator.classList.add('idle');
                text.textContent = 'IDLE';
                this.elements.recordBtn.disabled = true;
                this.elements.stopBtn.disabled = true;
                this.updateStatusMessage('Initializing...');
                break;
        }
    }
    
    updateTimer(seconds) {
        if (!this.isInitialized) return;
        this.elements.timerDisplay.textContent = Utils.formatTime(seconds);
    }
    
    resetTimer() {
        if (!this.isInitialized) return;
        this.elements.timerDisplay.textContent = '00:00:00';
    }
    
    updateStatusMessage(message, type = 'info') {
        if (!this.isInitialized) return;
        
        const element = this.elements.statusMessage;
        element.textContent = message;
        
        // You can add different styling based on type later
        if (type === 'error') {
            element.style.color = '#ef4444';
        } else if (type === 'success') {
            element.style.color = '#22c55e';
        } else {
            element.style.color = '#64748b';
        }
        
        // Auto-clear non-info messages
        if (type !== 'info') {
            setTimeout(() => {
                this.updateStatusMessage('Ready to record');
            }, 3000);
        }
    }
    
    updateSettingButtons(setting, value) {
        const buttons = this.buttonGroups[setting];
        
        buttons.forEach(btn => {
            if (btn.dataset.value === value) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    async showFilePicker() {
        const { ipcRenderer } = require('electron');
        
        try {
            const result = await ipcRenderer.invoke('show-save-dialog', {
                defaultPath: this.elements.fileInput.value
            });
            
            if (!result.canceled && result.filePath) {
                this.elements.fileInput.value = result.filePath;
                this.notifySettingChange('filename', result.filePath);
            }
        } catch (error) {
            console.error('Failed to show file picker:', error);
            this.updateStatusMessage('Failed to open file dialog', 'error');
        }
    }
    
    async handleRecordClick() {
        console.log('handleRecordClick called');
        try {
            if (window.App && window.App.toggleRecording) {
                console.log('Calling App.toggleRecording...');
                await window.App.toggleRecording();
            } else {
                console.error('App.toggleRecording not available');
            }
        } catch (error) {
            console.error('Error in handleRecordClick:', error);
        }
    }
    
    async handleStopClick() {
        console.log('handleStopClick called');
        try {
            if (window.App && window.App.stopRecording) {
                console.log('Calling App.stopRecording...');
                await window.App.stopRecording();
            } else {
                console.error('App.stopRecording not available');
            }
        } catch (error) {
            console.error('Error in handleStopClick:', error);
        }
    }
    
    handleFileInputChange(value) {
        if (value.trim()) {
            this.notifySettingChange('filename', value);
        }
    }
    
    handleBeforeUnload(e) {
        if (App && App.recorder && App.recorder.isRecording) {
            e.preventDefault();
            e.returnValue = 'Recording is in progress. Are you sure you want to leave?';
            return e.returnValue;
        }
    }
    
    notifySettingChange(key, value) {
        console.log(`Setting change notification: ${key} = ${value}`);
        try {
            if (window.App && window.App.recorder) {
                window.App.recorder.updateSettings(key, value);
                console.log('Setting updated successfully');
            } else {
                console.error('App.recorder not available for setting update');
            }
        } catch (error) {
            console.error('Error updating setting:', error);
        }
    }
    
    showError(message) {
        this.updateStatusMessage(message, 'error');
        console.error('UI Error:', message);
    }
    
    showSuccess(message) {
        this.updateStatusMessage(message, 'success');
    }
    
    getCurrentFilename() {
        return this.elements.fileInput.value;
    }
    
    setFilename(filename) {
        this.elements.fileInput.value = filename;
    }
    
    disableControls() {
        const settingButtons = [
            ...this.buttonGroups.quality,
            ...this.buttonGroups.fps,
            ...this.buttonGroups.resolution
        ];
        
        settingButtons.forEach(btn => {
            btn.disabled = true;
        });
        
        this.elements.fileInput.disabled = true;
        this.elements.browseBtn.disabled = true;
    }
    
    enableControls() {
        const settingButtons = [
            ...this.buttonGroups.quality,
            ...this.buttonGroups.fps,
            ...this.buttonGroups.resolution
        ];
        
        settingButtons.forEach(btn => {
            btn.disabled = false;
        });
        
        this.elements.fileInput.disabled = false;
        this.elements.browseBtn.disabled = false;
    }
    
    dispose() {
        this.isInitialized = false;
        this.elements = {};
        this.buttonGroups = {};
    }
}