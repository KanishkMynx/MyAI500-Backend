from fastapi import FastAPI, WebSocket
from faster_whisper import WhisperModel
import numpy as np
import asyncio
import json
import logging
import base64
from pydantic import BaseModel
from typing import List
import torch

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Initialize Whisper model with Distil-Whisper checkpoint
model = WhisperModel(
    model_size_or_path="distil-medium.en",
    device="cuda" if torch.cuda.is_available() else "cpu",
    compute_type="float16" if torch.cuda.is_available() else "int8",
    num_workers=4
)

# Audio chunk size (20ms)
CHUNK_SIZE = 320  # 16000 Hz * 0.02 seconds
SAMPLE_RATE = 16000

class AudioChunk(BaseModel):
    audio_data: str  # base64 encoded audio data
    is_final: bool = False

async def process_audio_chunk(audio_data: str) -> str:
    try:
        # Decode base64 audio data
        decoded_data = base64.b64decode(audio_data)
        # Convert audio data to numpy array
        audio_array = np.frombuffer(decoded_data, dtype=np.float32)
        
        # Transcribe with faster-whisper
        segments, _ = model.transcribe(
            audio_array,
            beam_size=1,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 100}
        )
        
        # Get transcription text
        text = " ".join([segment.text for segment in segments])
        return text.strip()
    except Exception as e:
        logger.error(f"Error processing audio chunk: {e}")
        return ""

@app.websocket("/transcribe")
async def transcribe_websocket(websocket: WebSocket):
    await websocket.accept()
    buffer = []
    
    try:
        while True:
            # Receive audio chunk
            data = await websocket.receive_json()
            chunk = AudioChunk(**data)
            
            # Add to buffer
            if chunk.audio_data:
                buffer.append(chunk.audio_data)
            
            # Process if buffer is full or final chunk received
            if len(buffer) >= 5 or chunk.is_final:  # Process every 100ms (5 chunks of 20ms)
                # Process the latest chunk
                audio_data = buffer[-1]
                transcription = await process_audio_chunk(audio_data)
                
                if transcription:
                    await websocket.send_json({
                        "text": transcription,
                        "is_final": chunk.is_final
                    })
                
                # Clear buffer if final chunk
                if chunk.is_final:
                    buffer = []
                else:
                    # Keep last chunk for context
                    buffer = buffer[-1:]
                    
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)