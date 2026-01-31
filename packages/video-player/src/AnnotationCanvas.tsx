'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import type { AnnotationCanvasProps, Point, AnnotationData } from './types';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ffffff'];

export function AnnotationCanvas({
  videoRef,
  annotations,
  isDrawing,
  selectedTool,
  onAnnotationCreate,
  currentTime,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(3);

  // Resize canvas to match video
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [videoRef]);

  // Render annotations
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing annotations
    annotations.forEach((annotation) => {
      drawAnnotation(ctx, annotation.data, annotation.type, canvas);
    });

    // Draw current drawing
    if (currentPoints.length > 0 && selectedTool === 'pencil') {
      ctx.beginPath();
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      currentPoints.forEach((point, i) => {
        if (i === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
    }

    // Draw shape preview
    if (startPoint && isMouseDown && currentPoints.length > 0) {
      const endPoint = currentPoints[currentPoints.length - 1];
      drawShapePreview(ctx, startPoint, endPoint, selectedTool, selectedColor, strokeWidth);
    }
  }, [annotations, currentPoints, startPoint, isMouseDown, selectedTool, selectedColor, strokeWidth]);

  const getCanvasPoint = useCallback((e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing || !selectedTool) return;

      const point = getCanvasPoint(e);
      setIsMouseDown(true);
      setStartPoint(point);
      setCurrentPoints([point]);
    },
    [isDrawing, selectedTool, getCanvasPoint]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isMouseDown || !isDrawing) return;

      const point = getCanvasPoint(e);

      if (selectedTool === 'pencil') {
        setCurrentPoints((prev) => [...prev, point]);
      } else {
        setCurrentPoints([point]);
      }
    },
    [isMouseDown, isDrawing, selectedTool, getCanvasPoint]
  );

  const handleMouseUp = useCallback(() => {
    if (!isMouseDown || !startPoint || !selectedTool) return;

    const endPoint = currentPoints[currentPoints.length - 1] || startPoint;

    const annotationData: AnnotationData = {
      color: selectedColor,
      strokeWidth,
    };

    if (selectedTool === 'pencil') {
      annotationData.points = currentPoints;
    } else {
      annotationData.startPoint = startPoint;
      annotationData.endPoint = endPoint;
    }

    onAnnotationCreate?.({
      videoId: '', // Will be set by parent
      userId: '', // Will be set by parent
      type: selectedTool as any,
      startTime: currentTime,
      data: annotationData,
    });

    setIsMouseDown(false);
    setStartPoint(null);
    setCurrentPoints([]);
  }, [isMouseDown, startPoint, currentPoints, selectedTool, selectedColor, strokeWidth, currentTime, onAnnotationCreate]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`annotation-canvas ${isDrawing ? 'drawing' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Color picker - shown when drawing */}
      {isDrawing && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 rounded-lg p-2">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`w-6 h-6 rounded-full border-2 ${
                selectedColor === color ? 'border-white' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}

          <div className="w-px h-6 bg-white/30 mx-1" />

          <input
            type="range"
            min="1"
            max="10"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
            className="w-20"
          />
        </div>
      )}
    </>
  );
}

function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  data: AnnotationData,
  type: string,
  canvas: HTMLCanvasElement
) {
  ctx.strokeStyle = data.color;
  ctx.fillStyle = data.color;
  ctx.lineWidth = data.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (type) {
    case 'pencil':
      if (data.points && data.points.length > 0) {
        ctx.beginPath();
        data.points.forEach((point, i) => {
          if (i === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      }
      break;

    case 'arrow':
      if (data.startPoint && data.endPoint) {
        drawArrow(ctx, data.startPoint, data.endPoint);
      }
      break;

    case 'circle':
      if (data.startPoint && data.endPoint) {
        const radius = Math.hypot(
          data.endPoint.x - data.startPoint.x,
          data.endPoint.y - data.startPoint.y
        );
        ctx.beginPath();
        ctx.arc(data.startPoint.x, data.startPoint.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;

    case 'rectangle':
      if (data.startPoint && data.endPoint) {
        ctx.strokeRect(
          data.startPoint.x,
          data.startPoint.y,
          data.endPoint.x - data.startPoint.x,
          data.endPoint.y - data.startPoint.y
        );
      }
      break;

    case 'player-x':
      if (data.startPoint) {
        const size = 15;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(data.startPoint.x - size, data.startPoint.y - size);
        ctx.lineTo(data.startPoint.x + size, data.startPoint.y + size);
        ctx.moveTo(data.startPoint.x + size, data.startPoint.y - size);
        ctx.lineTo(data.startPoint.x - size, data.startPoint.y + size);
        ctx.stroke();
      }
      break;

    case 'player-o':
      if (data.startPoint) {
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(data.startPoint.x, data.startPoint.y, 15, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;

    case 'text':
      if (data.startPoint && data.text) {
        ctx.font = `${data.fontSize || 16}px sans-serif`;
        ctx.fillText(data.text, data.startPoint.x, data.startPoint.y);
      }
      break;
  }
}

function drawShapePreview(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  tool: string | null,
  color: string,
  strokeWidth: number
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.setLineDash([5, 5]);

  switch (tool) {
    case 'arrow':
      drawArrow(ctx, start, end);
      break;
    case 'circle':
      const radius = Math.hypot(end.x - start.x, end.y - start.y);
      ctx.beginPath();
      ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'rectangle':
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      break;
  }

  ctx.setLineDash([]);
}

function drawArrow(ctx: CanvasRenderingContext2D, start: Point, end: Point) {
  const headLength = 15;
  const angle = Math.atan2(end.y - start.y, end.x - start.x);

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  // Arrow head
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle - Math.PI / 6),
    end.y - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle + Math.PI / 6),
    end.y - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}
