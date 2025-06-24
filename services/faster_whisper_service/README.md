# Faster Whisper Transcription Service

This is a real-time speech-to-text service using the Faster Whisper model, optimized for low-latency transcription.

## Features

- Real-time audio transcription using WebSocket
- Optimized chunking strategy (20ms chunks)
- Uses Distil-Whisper model for improved performance
- Automatic GPU detection and utilization
- Reconnection handling
- Docker support

## Prerequisites

- Python 3.10 or higher
- CUDA-compatible GPU (optional but recommended)
- Docker (optional)

## Installation

### Local Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the service:
```bash
python app.py
```

### Docker Setup

1. Build the Docker image:
```bash
docker build -t faster-whisper-service .
```

2. Run the container:
```bash
docker run -p 8000:8000 faster-whisper-service
```

## Usage

The service exposes a WebSocket endpoint at `ws://localhost:8000/transcribe`.

Example client usage (Node.js):
```javascript
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8000/transcribe');

ws.on('open', () => {
  // Send audio data
  ws.send(JSON.stringify({
    audio_data: 'base64_encoded_audio',
    is_final: false
  }));
});

ws.on('message', (data) => {
  const response = JSON.parse(data);
  console.log('Transcription:', response.text);
});
```

## Performance Optimization

- The service processes audio in 20ms chunks
- Buffers 5 chunks (100ms) before processing
- Uses VAD (Voice Activity Detection) for better accuracy
- Automatically uses GPU if available

## Environment Variables

- `MODEL_SIZE`: Set the model size (default: "distil-large-v3")
- `CHUNK_SIZE`: Adjust the chunk size in samples (default: 320)
- `BUFFER_SIZE`: Number of chunks to buffer (default: 5)

## Troubleshooting

1. If you encounter CUDA errors, ensure you have compatible NVIDIA drivers installed
2. For memory issues, try using a smaller model or reducing the buffer size
3. Check the logs for detailed error messages