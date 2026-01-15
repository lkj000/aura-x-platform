import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface AutomationPoint {
  id: string;
  time: number; // in seconds
  value: number; // 0-1 normalized
  curve?: 'linear' | 'bezier';
  controlPoint1?: { x: number; y: number };
  controlPoint2?: { x: number; y: number };
}

interface AutomationEditorProps {
  parameter: string;
  points: AutomationPoint[];
  onChange: (points: AutomationPoint[]) => void;
  duration: number; // total duration in seconds
  zoom?: number; // pixels per second
  className?: string;
}

export function AutomationEditor({
  parameter,
  points,
  onChange,
  duration,
  zoom = 40,
  className,
}: AutomationEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Canvas dimensions
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(200);

  // Update canvas size on container resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasWidth(rect.width);
        setCanvasHeight(rect.height);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Convert time to x coordinate
  const timeToX = useCallback((time: number): number => {
    return time * zoom;
  }, [zoom]);

  // Convert value to y coordinate (inverted because canvas y goes down)
  const valueToY = useCallback((value: number): number => {
    const padding = 20;
    return canvasHeight - (value * (canvasHeight - 2 * padding) + padding);
  }, [canvasHeight]);

  // Convert x coordinate to time
  const xToTime = useCallback((x: number): number => {
    return Math.max(0, Math.min(duration, x / zoom));
  }, [zoom, duration]);

  // Convert y coordinate to value
  const yToValue = useCallback((y: number): number => {
    const padding = 20;
    return Math.max(0, Math.min(1, (canvasHeight - y - padding) / (canvasHeight - 2 * padding)));
  }, [canvasHeight]);

  // Draw automation curve
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = (canvasHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }

    // Vertical grid lines (every second)
    for (let i = 0; i <= duration; i++) {
      const x = timeToX(i);
      if (x > canvasWidth) break;
      
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }

    // Sort points by time
    const sortedPoints = [...points].sort((a, b) => a.time - b.time);

    // Draw automation curve
    if (sortedPoints.length > 0) {
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2;
      ctx.beginPath();

      sortedPoints.forEach((point, index) => {
        const x = timeToX(point.time);
        const y = valueToY(point.value);

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevPoint = sortedPoints[index - 1];
          const prevX = timeToX(prevPoint.time);
          const prevY = valueToY(prevPoint.value);

          if (prevPoint.curve === 'bezier' && prevPoint.controlPoint1 && prevPoint.controlPoint2) {
            // Bezier curve
            ctx.bezierCurveTo(
              prevX + prevPoint.controlPoint1.x,
              prevY + prevPoint.controlPoint1.y,
              x + prevPoint.controlPoint2.x,
              y + prevPoint.controlPoint2.y,
              x,
              y
            );
          } else {
            // Linear
            ctx.lineTo(x, y);
          }
        }
      });

      ctx.stroke();

      // Draw points
      sortedPoints.forEach((point) => {
        const x = timeToX(point.time);
        const y = valueToY(point.value);
        const isSelected = point.id === selectedPointId;

        ctx.fillStyle = isSelected ? '#a78bfa' : '#8b5cf6';
        ctx.beginPath();
        ctx.arc(x, y, isSelected ? 6 : 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw outline for selected point
        if (isSelected) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    }

    // Draw parameter label
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(parameter, 10, 20);
  }, [canvasWidth, canvasHeight, points, selectedPointId, parameter, duration, timeToX, valueToY, zoom]);

  // Redraw on changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Handle canvas click to add/select points
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked on existing point
    const clickedPoint = points.find((point) => {
      const px = timeToX(point.time);
      const py = valueToY(point.value);
      const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
      return distance < 8;
    });

    if (clickedPoint) {
      setSelectedPointId(clickedPoint.id);
    } else {
      // Add new point
      const time = xToTime(x);
      const value = yToValue(y);
      const newPoint: AutomationPoint = {
        id: `point-${Date.now()}`,
        time,
        value,
        curve: 'linear',
      };
      onChange([...points, newPoint]);
      setSelectedPointId(newPoint.id);
    }
  }, [points, onChange, timeToX, valueToY, xToTime, yToValue]);

  // Handle point dragging
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedPointId) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [selectedPointId]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !selectedPointId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const time = xToTime(x);
    const value = yToValue(y);

    onChange(
      points.map((point) =>
        point.id === selectedPointId
          ? { ...point, time, value }
          : point
      )
    );
  }, [isDragging, selectedPointId, points, onChange, xToTime, yToValue]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle delete key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedPointId) {
        onChange(points.filter((point) => point.id !== selectedPointId));
        setSelectedPointId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPointId, points, onChange]);

  return (
    <div ref={containerRef} className={cn("relative w-full h-full bg-background border border-border rounded-lg overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        className="cursor-crosshair"
      />
      
      {selectedPointId && (
        <div className="absolute bottom-2 right-2 bg-card border border-border rounded-md px-3 py-2 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-muted-foreground">Time:</span>{' '}
              <span className="font-mono">
                {points.find(p => p.id === selectedPointId)?.time.toFixed(2)}s
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Value:</span>{' '}
              <span className="font-mono">
                {((points.find(p => p.id === selectedPointId)?.value || 0) * 100).toFixed(0)}%
              </span>
            </div>
            <span className="text-muted-foreground text-[10px]">Press Delete to remove</span>
          </div>
        </div>
      )}
    </div>
  );
}
