// Screen Recorder Class
class ScreenRecorder {
    constructor() {
        this.isRecording = false;
        this.mediaRecorder = null;
        this.stream = null;
        this.chunks = [];
        this.startTime = null;
        this.timerInterval = null;
        this.settings = { ...CONFIG.DEFAULT_SETTINGS };
        this.useFFmpeg = true;
        
        // Event callbacks
        this.onStatusChange = null;
        this.onTimerUpdate = null;
        this.onError = null;
        this.onRecordingComplete = null;
    }
    
    async initialize() {
        try {
            // Check FFmpeg availability
            this.useFFmpeg = await Utils.checkFFmpegAvailability();
            
            // Request notification permission
            if ('Notification' in window && Notification.permission === 'default') {
                await Notification.requestPermission();
            }
            
            console.log(`Screen Recorder initialized (FFmpeg: ${this.useFFmpeg})`);
            return true;
            
        } catch (error) {
            console.error('Failed to initialize recorder:', error);
            this.handleError(error.message);
            return false;
        }
    }
    
    async startRecording() {
        if (this.isRecording) {
            this.handleError('Recording already in progress');
            return false;
        }
        
        try {
            // Get display media stream
            this.stream = await this.getDisplayMediaStream();
            
            // Setup media recorder
            await this.setupMediaRecorder();
            
            // Start recording
            this.mediaRecorder.start(1000);
            this.isRecording = true;
            this.startTime = Date.now();
            
            // Start timer
            this.startTimer();
            
            // Handle stream end
            this.stream.getVideoTracks()[0].addEventListener('ended', () => {
                if (this.isRecording) {
                    this.stopRecording();
                }
            });
            
            Utils.showNotification('Recording started', 'success');
            this.notifyStatusChange('recording');
            
            return true;
            
        } catch (error) {
            console.error('Failed to start recording:', error);
            this.handleError(error.message || 'Failed to start recording');
            this.cleanup();
            return false;
        }
    }
    
    async stopRecording() {
        if (!this.isRecording) return false;
        
        try {
            this.isRecording = false;
            
            // Stop timer
            this.stopTimer();
            
            // Stop media recorder
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            }
            
            // Stop stream
            this.stopStream();
            
            Utils.showNotification('Recording stopped', 'success');
            this.notifyStatusChange('ready');
            
            return true;
            
        } catch (error) {
            console.error('Failed to stop recording:', error);
            this.handleError('Failed to stop recording');
            return false;
        }
    }
    
    async getDisplayMediaStream() {
        try {
            console.log('Attempting to get screen sources via Electron...');
            
            // Use Electron's desktopCapturer instead of browser API
            const { ipcRenderer } = require('electron');
            const sources = await ipcRenderer.invoke('get-sources');
            
            console.log('Available sources:', sources.length);
            
            if (sources.length === 0) {
                throw new Error('No screen sources available');
            }
            
            // Find the primary screen source
            const primarySource = sources.find(source => 
                source.name === 'Entire Screen' || 
                source.name === 'Screen 1' || 
                source.name.includes('Screen')
            ) || sources[0];
            
            console.log('Using source:', primarySource.name);
            
            // Get resolution settings
            const resolution = CONFIG.RESOLUTION_MAP[this.settings.resolution];
            const [width, height] = resolution.split('x').map(Number);
            
            const constraints = {
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: primarySource.id,
                        minWidth: width,
                        maxWidth: width,
                        minHeight: height,
                        maxHeight: height,
                        minFrameRate: parseInt(this.settings.fps),
                        maxFrameRate: parseInt(this.settings.fps)
                    }
                }
            };
            
            console.log('Getting user media with Electron constraints...');
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Screen capture stream obtained successfully');
            return stream;
            
        } catch (error) {
            console.error('Electron screen capture failed, trying fallback:', error);
            
            // Fallback to regular getDisplayMedia if available
            try {
                const resolution = CONFIG.RESOLUTION_MAP[this.settings.resolution];
                const [width, height] = resolution.split('x').map(Number);
                
                const constraints = {
                    video: {
                        width: { ideal: width },
                        height: { ideal: height },
                        frameRate: { ideal: parseInt(this.settings.fps) }
                    },
                    audio: false
                };
                
                console.log('Trying standard getDisplayMedia...');
                const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
                console.log('Standard screen capture succeeded');
                return stream;
                
            } catch (fallbackError) {
                console.error('Both screen capture methods failed:', fallbackError);
                throw new Error('Screen capture not available. Please ensure screen recording permissions are granted.');
            }
        }
    }
    
    async setupMediaRecorder() {
        const mimeType = this.getBestMimeType();
        console.log('Setting up MediaRecorder with mimeType:', mimeType);
        
        const options = mimeType ? { mimeType } : {};
        
        try {
            this.mediaRecorder = new MediaRecorder(this.stream, options);
            this.chunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                console.log('Data available, size:', event.data.size);
                if (event.data.size > 0) {
                    this.chunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                console.log('MediaRecorder stopped, saving recording...');
                this.saveRecording();
            };
            
            this.mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event.error);
                this.handleError('Recording error occurred: ' + event.error.message);
            };
            
            this.mediaRecorder.onstart = () => {
                console.log('MediaRecorder started successfully');
            };
            
            console.log('MediaRecorder setup completed');
        } catch (error) {
            console.error('Failed to setup MediaRecorder:', error);
            throw new Error(`Failed to setup recording: ${error.message}`);
        }
    }
    
    getBestMimeType() {
        const extension = Utils.getFileExtension(this.settings.filename);
        const preferredFormat = CONFIG.SUPPORTED_FORMATS.webm.includes(extension) ? 'webm' : 'mp4';
        
        const types = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4'
        ];
        
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        
        return '';
    }
    
    saveRecording() {
        if (this.chunks.length === 0) {
            this.handleError('No recording data to save');
            return;
        }
        
        try {
            const mimeType = this.getBestMimeType();
            const blob = new Blob(this.chunks, { type: mimeType });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.settings.filename;
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            const fileSize = (blob.size / (1024 * 1024)).toFixed(2);
            Utils.showNotification(`Recording saved: ${this.settings.filename} (${fileSize}MB)`, 'success');
            
            if (this.onRecordingComplete) {
                this.onRecordingComplete({
                    filename: this.settings.filename,
                    size: blob.size,
                    duration: this.getRecordingDuration()
                });
            }
            
        } catch (error) {
            console.error('Failed to save recording:', error);
            this.handleError('Failed to save recording');
        } finally {
            this.cleanup();
        }
    }
    
    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.startTime && this.onTimerUpdate) {
                const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
                this.onTimerUpdate(elapsed);
            }
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    stopStream() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }
    
    cleanup() {
        this.stopTimer();
        this.stopStream();
        this.mediaRecorder = null;
        this.chunks = [];
        this.startTime = null;
    }
    
    getRecordingDuration() {
        return this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
    }
    
    updateSettings(key, value) {
        this.settings[key] = value;
        
        if (key === 'filename') {
            const ext = Utils.getFileExtension(value);
            const supportedExtensions = [
                ...CONFIG.SUPPORTED_FORMATS.webm,
                ...CONFIG.SUPPORTED_FORMATS.mp4
            ];
            
            if (!supportedExtensions.includes(ext)) {
                this.settings.filename = value + '.webm';
            }
        }
        
        console.log(`Setting updated: ${key} = ${this.settings[key]}`);
    }
    
    getSettings() {
        return { ...this.settings };
    }
    
    handleError(message) {
        console.error(`Recording error: ${message}`);
        Utils.showNotification(message, 'error');
        
        if (this.onError) {
            this.onError(message);
        }
    }
    
    notifyStatusChange(status) {
        if (this.onStatusChange) {
            this.onStatusChange(status);
        }
    }
    
    getStatus() {
        return {
            isRecording: this.isRecording,
            duration: this.getRecordingDuration(),
            settings: this.getSettings(),
            useFFmpeg: this.useFFmpeg
        };
    }
    
    dispose() {
        if (this.isRecording) {
            this.stopRecording();
        }
        this.cleanup();
        
        this.onStatusChange = null;
        this.onTimerUpdate = null;
        this.onError = null;
        this.onRecordingComplete = null;
    }
}