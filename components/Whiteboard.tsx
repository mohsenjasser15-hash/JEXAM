import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Pen, Trash2, Image as ImageIcon } from 'lucide-react';

interface WhiteboardProps {
  active: boolean;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000'); // Default black for white paper
  const [lineWidth, setLineWidth] = useState(3);
  const [mode, setMode] = useState<'draw' | 'erase'>('draw');

  useEffect(() => {
    // Resize canvas to fit container
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        // Save current content
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvasRef.current.width;
        tempCanvas.height = canvasRef.current.height;
        tempCtx?.drawImage(canvasRef.current, 0, 0);

        canvasRef.current.width = width;
        canvasRef.current.height = height;
        
        // Restore content
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
           ctx.lineCap = 'round';
           ctx.lineJoin = 'round';
           ctx.drawImage(tempCanvas, 0, 0, width, height);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [active]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { offsetX, offsetY } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    // Erase paints white now
    ctx.strokeStyle = mode === 'erase' ? '#ffffff' : color; 
    ctx.lineWidth = mode === 'erase' ? 30 : lineWidth;
    
    // Remove glow for paper look, simpler clean lines
    ctx.shadowBlur = 0;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { offsetX, offsetY } = getCoordinates(e, canvas);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.closePath();
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    const rect = canvas.getBoundingClientRect();
    return {
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
          // Draw image centered, scaled down if too big
          const maxWidth = canvas.width * 0.8;
          const maxHeight = canvas.height * 0.8;
          let w = img.width;
          let h = img.height;

          if (w > maxWidth) {
            h = (maxWidth / w) * h;
            w = maxWidth;
          }
          if (h > maxHeight) {
            w = (maxHeight / h) * w;
            h = maxHeight;
          }

          const x = (canvas.width - w) / 2;
          const y = (canvas.height - h) / 2;
          
          ctx.drawImage(img, x, y, w, h);
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div ref={containerRef} className="w-full h-full relative bg-white cursor-crosshair overflow-hidden">
      {/* Paper Grid Pattern Background */}
      <div className="absolute inset-0 pointer-events-none opacity-10" 
           style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="touch-none relative z-10"
      />
      
      {/* LEFT Toolbar: Drawing Tools */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-100 border border-slate-300 p-2 rounded-xl flex flex-col items-center gap-4 shadow-xl z-20">
        <button 
          onClick={() => { setMode('draw'); setColor('#000000'); }}
          className={`p-3 rounded-lg transition-all ${mode === 'draw' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
          title="Pen (Black)"
        >
          <Pen size={20} />
        </button>

        <button 
          onClick={() => setMode('erase')}
          className={`p-3 rounded-lg transition-all ${mode === 'erase' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
          title="Eraser"
        >
          <Eraser size={20} />
        </button>
      </div>

      {/* RIGHT Toolbar: Actions & Media */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-100 border border-slate-300 p-2 rounded-xl flex flex-col items-center gap-4 shadow-xl z-20">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleImageUpload} 
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="p-3 rounded-lg text-slate-700 hover:bg-blue-100 hover:text-blue-600 transition-colors"
          title="Upload Image"
        >
          <ImageIcon size={20} />
        </button>

        <div className="h-px w-full bg-slate-300 my-1"></div>

        <button 
          onClick={clearCanvas}
          className="p-3 rounded-lg text-red-500 hover:bg-red-100 transition-colors"
          title="Clear Board"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
};
