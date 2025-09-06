
import React, { useState, useRef, useCallback } from 'react';
import type { ImageData } from '../types';
import { UploadIcon, CameraIcon } from './Icons';

interface ImageUploaderProps {
  onImageSelected: (imageData: ImageData) => void;
}

const parseDataUrl = (dataUrl: string): { base64: string; mimeType: string } => {
  const parts = dataUrl.split(',');
  const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const base64 = parts[1];
  return { base64, mimeType };
};

const CameraCapture: React.FC<{ onCapture: (dataUrl: string) => void, onCancel: () => void }> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access the camera. Please ensure you have granted permission.");
      onCancel();
    }
  }, [onCancel]);
  
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
  }, [stream]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        onCapture(dataUrl);
      }
    }
    stopCamera();
  };

  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 p-4 rounded-lg shadow-xl relative w-full max-w-lg">
            <video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded-md"></video>
            <div className="flex justify-center gap-4 mt-4">
                <button onClick={handleCapture} className="px-6 py-2 bg-amber-400 text-slate-900 font-bold rounded-lg">Capture</button>
                <button onClick={() => { stopCamera(); onCancel(); }} className="px-6 py-2 bg-slate-600 text-white font-bold rounded-lg">Cancel</button>
            </div>
        </div>
    </div>
  );
};


const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setPreview(dataUrl);
        const { base64, mimeType } = parseDataUrl(dataUrl);
        onImageSelected({ base64, mimeType, dataUrl });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleCameraCapture = (dataUrl: string) => {
    setPreview(dataUrl);
    const { base64, mimeType } = parseDataUrl(dataUrl);
    onImageSelected({ base64, mimeType, dataUrl });
    setIsCameraOpen(false);
  };

  return (
    <>
      <div
        className="w-full aspect-square bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-600 flex flex-col items-center justify-center p-4 cursor-pointer hover:border-amber-400 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        {preview ? (
          <img src={preview} alt="Preview" className="max-w-full max-h-full object-contain rounded-md" />
        ) : (
          <div className="text-center text-slate-400 flex flex-col items-center gap-4">
             <UploadIcon className="w-8 h-8"/>
            <span>Click to upload a file</span>
            <span className="text-xs">or</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCameraOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700/80 text-slate-300 font-semibold rounded-md border border-slate-600 hover:bg-slate-600/80 transition-colors"
            >
              <CameraIcon className="w-5 h-5"/>
              USE CAMERA
            </button>
          </div>
        )}
      </div>
      {isCameraOpen && <CameraCapture onCapture={handleCameraCapture} onCancel={() => setIsCameraOpen(false)} />}
    </>
  );
};

export default ImageUploader;
