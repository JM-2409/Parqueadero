import React, { useRef, useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';
import { Camera, X } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

export default function CameraOCR({ onScan, onClose }: { onScan: (plate: string) => void, onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setError('No se pudo acceder a la cámara. ' + err.message);
    }
  };

  React.useEffect(() => {
    startCamera();
    const currentVideo = videoRef.current;
    return () => {
      if (currentVideo?.srcObject) {
        const stream = currentVideo.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageUrl = canvas.toDataURL('image/png');
    
    setIsScanning(true);
    try {
      const result = await Tesseract.recognize(imageUrl, 'eng', {
        logger: m => console.log(m)
      });
      // Extract something that looks like a plate (letras y números)
      const rawText = result.data.text.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      // Only keep the first 6 characters to match usual plate formats roughly
      let text = rawText.length >= 5 ? rawText.substring(0, 6) : rawText;
      
      if (text.length >= 3) {
        onScan(text);
        onClose();
      } else {
        setError(`No se detectó un texto claro (detectado: ${rawText}). Reinténtalo.`);
        setTimeout(() => setError(""), 3000);
      }
    } catch (err) {
      setError('Error al analizar la imagen.');
      setTimeout(() => setError(""), 3000);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 z-[60] flex flex-col pt-10 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex justify-between items-center p-6 text-white">
        <h3 className="font-bold text-xl uppercase tracking-wider">Escanear Placa</h3>
        <button onClick={onClose} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
          <X size={28} />
        </button>
      </div>
      
      <div className="flex-1 relative flex items-center justify-center p-4">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full max-h-[60vh] object-cover rounded-2xl bg-black shadow-2xl"
        ></video>
        <canvas ref={canvasRef} className="hidden"></canvas>
        
        {/* Overlay Guide */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="border-[4px] border-indigo-400/80 w-72 h-32 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] flex items-center justify-center">
            <span className="text-white/50 text-sm font-medium tracking-widest uppercase">Alinee la placa aquí</span>
          </div>
        </div>

        {error && (
          <div className="absolute bottom-4 left-4 right-4 text-center text-red-100 font-medium bg-red-600/90 py-3 px-4 rounded-xl shadow-lg animate-in slide-in-from-bottom-2">
            {error}
          </div>
        )}
      </div>

      <div className="px-8 pb-16 flex flex-col items-center">
        <p className="text-slate-400 text-sm mb-6 font-medium text-center">Toque el botón para capturar la imagen y extraer el texto de la placa (OCR).</p>
        <button 
          onClick={capturePhoto} 
          disabled={isScanning}
          className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-[0_0_0_4px_rgba(79,70,229,1)] active:scale-95 transition-transform disabled:opacity-80 disabled:scale-95"
        >
          {isScanning ? <Spinner /> : <Camera size={40} className="text-white ml-0.5 mt-0.5" />}
        </button>
      </div>
    </div>
  );
}
