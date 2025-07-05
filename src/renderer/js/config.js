// Configuration constants
const CONFIG = {
    DEFAULT_SETTINGS: {
        quality: 'High',
        fps: '30',
        resolution: '1080p',
        filename: 'recording.webm'
    },
    
    QUALITY_MAP: {
        'High': { webm: '23', mp4: '18' },
        'Medium': { webm: '33', mp4: '23' },
        'Low': { webm: '40', mp4: '28' }
    },
    
    RESOLUTION_MAP: {
        '720p': '1280x720',
        '1080p': '1920x1080',
        '1440p': '2560x1440'
    },
    
    SUPPORTED_FORMATS: {
        webm: ['webm'],
        mp4: ['mp4', 'avi']
    }
};