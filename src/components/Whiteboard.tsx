import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Pen, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { User, WhiteboardPath } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface WhiteboardProps {
  active: boolean;
  classId: string;
  user: User;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ active, classId, user }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{x: number, y: number}[]>([]);
  const [mode, setMode] = useState<'draw' | 'erase'>('draw');
  
  // Remote paths
  const [paths, setPaths] = useState<WhiteboardPath[]>([]);

  // Subscribe to updates
  useEffect(() => {
    if (!active) return;
    const unsubscribe = api.subscribeToWhiteboard(classId, (newPaths) => {
      setPaths(newPaths);
      redrawCanvas(newPaths);
    });
    return () => unsubscribe();
  }, [classId, active]);

  const redrawCanvas = (pathsToDraw: WhiteboardPath[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Config
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    pathsToDraw.forEach(path => {
       ctx.beginPath();
       ctx.strokeStyle = path.type === 'erase' ? '#ffffff' : path.color;
       ctx.lineWidth = path.lineWidth;
       if (path.points.length > 0) {
         ctx.moveTo(path.points[0].x, path.points[0].y);
         path.points.forEach(p => ctx.lineTo(p.x, p.y));
       }
       ctx.stroke();
    });
  };

  useEffect(() => {
    // Resize handling
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.offsetWidth;
        canvasRef.current.height = containerRef.current.offsetHeight;
        redrawCanvas(paths);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Init
    return () => window.removeEventListener('resize', handleResize);
  }, [active, paths]); // Re-run if paths change to keep them

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const pos = getCoordinates(e);
    setCurrentPath([pos]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pos = getCoordinates(e);
    setCurrentPath(prev => [...prev, pos]);
    
    // Optimistic local draw
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
       ctx.lineWidth = mode === 'erase' ? 20 : 3;
       ctx.strokeStyle = mode === 'erase' ? '#fff' : '#000';
       ctx.lineTo(pos.x, pos.y);
       ctx.stroke();
    }
  };

  const stopDrawing = async () => {
    setIsDrawing(false);
    if (currentPath.length > 0) {
      const newPath: WhiteboardPath = {
        id: uuidv4(),
        userId: user.id,
        color: '#000000',
        lineWidth: mode === 'erase' ? 20 : 3,
        points: currentPath,
        timestamp: Date.now(),
        type: mode
      };
      
      // Send to Firestore
      await api.sendWhiteboardPath(classId, newPath);
      setCurrentPath([]);
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return {x:0, y:0};
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleClear = async () => {
    if (confirm("Clear whiteboard for everyone?")) {
      await api.clearWhiteboard(classId);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative bg-white cursor-crosshair overflow-hidden">
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
      
      {/* Toolbars */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-100 border border-slate-300 p-2 rounded-xl flex flex-col items-center gap-4 shadow-xl z-20">
        <button onClick={() => setMode('draw')} className={`p-3 rounded-lg ${mode === 'draw' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}><Pen size={20} /></button>
        <button onClick={() => setMode('erase')} className={`p-3 rounded-lg ${mode === 'erase' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}><Eraser size={20} /></button>
        <button onClick={handleClear} className="p-3 rounded-lg text-red-500 hover:bg-red-100"><Trash2 size={20} /></button>
      </div>
    </div>
  );
};
