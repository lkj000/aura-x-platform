import React, { useEffect, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Circle, Square, Minus, Waves, BarChart3 } from 'lucide-react';
import { useAudioEngine } from '@/hooks/useAudioEngine';

export interface AutomationPoint {
  id: number;
  time: number;
  value: number;
  curveType?: string | null;
  handleInX?: number | null;
  handleInY?: number | null;
  handleOutX?: number | null;
  handleOutY?: number | null;
}

export interface AutomationLane {
  id: number;
  parameter: string;
  enabled: boolean;
  points: AutomationPoint[];
}

interface AutomationLaneRendererProps {
  trackId: number;
  projectId: number;
  parameter: 'volume' | 'pan' | 'eq_low' | 'eq_mid' | 'eq_high' | 'reverb_wet' | 'delay_wet';
  zoom: number;
  timelineWidth: number;
  pixelsPerSecond: number;
  onPointsChange?: (points: AutomationPoint[]) => void;
  isPlaying?: boolean;
}

export default function AutomationLaneRenderer({
  trackId,
  projectId,
  parameter,
  zoom,
  timelineWidth,
  pixelsPerSecond,
  onPointsChange,
  isPlaying = false,
}: AutomationLaneRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPointId, setDragPointId] = useState<number | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordMode, setRecordMode] = useState<'replace' | 'overdub'>('replace');
  const [curveType, setCurveType] = useState<'linear' | 'bezier' | 'step'>('linear');
  const audioEngine = useAudioEngine();
  const recordingIntervalRef = useRef<number | null>(null);

  // Query automation lanes for this track
  const lanesQuery = trpc.automation.getByTrack.useQuery({ trackId });
  const pointsQuery = trpc.automation.getPoints.useQuery(
    { laneId: lanesQuery.data?.find(l => l.parameter === parameter)?.id || 0 },
    { enabled: !!lanesQuery.data?.find(l => l.parameter === parameter) }
  );

  // Mutations
  const createLane = trpc.automation.createLane.useMutation();
  const createPoint = trpc.automation.createPoint.useMutation();
  const updatePoint = trpc.automation.updatePoint.useMutation();
  const deletePoint = trpc.automation.deletePoint.useMutation();

  const lane = lanesQuery.data?.find(l => l.parameter === parameter);
  const points = pointsQuery.data || [];

  // Initialize lane if it doesn't exist
  useEffect(() => {
    if (!lanesQuery.data || lanesQuery.isLoading) return;
    
    if (!lane) {
      createLane.mutate({
        projectId,
        trackId,
        parameter,
        enabled: true,
      });
    }
  }, [lanesQuery.data, lane, projectId, trackId, parameter]);

  // Render automation curve
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !lane || !lane.enabled) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = 'rgba(100, 100, 120, 0.2)';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines (value levels)
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    if (points.length === 0) return;

    // Sort points by time
    const sortedPoints = [...points].sort((a, b) => Number(a.time) - Number(b.time));

    // Draw automation curve
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    sortedPoints.forEach((point, index) => {
      const x = Number(point.time) * pixelsPerSecond * zoom;
      const y = canvas.height - (Number(point.value) * canvas.height);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevPoint = sortedPoints[index - 1];
        const prevX = Number(prevPoint.time) * pixelsPerSecond * zoom;
        const prevY = canvas.height - (Number(prevPoint.value) * canvas.height);

        // Check if curve type is bezier
        if (prevPoint.curveType === 'bezier' || point.curveType === 'bezier') {
          // Use cubic bezier curve with control points
          const cp1x = prevX + (x - prevX) * 0.33;
          const cp1y = prevY;
          const cp2x = prevX + (x - prevX) * 0.67;
          const cp2y = y;
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
        } else if (prevPoint.curveType === 'step') {
          // Step curve (hold value until next point)
          ctx.lineTo(x, prevY);
          ctx.lineTo(x, y);
        } else {
          // Linear interpolation (default)
          ctx.lineTo(x, y);
        }
      }
    });

    ctx.stroke();

    // Draw automation points
    sortedPoints.forEach(point => {
      const x = Number(point.time) * pixelsPerSecond * zoom;
      const y = canvas.height - (Number(point.value) * canvas.height);

      ctx.fillStyle = point.id === hoveredPointId ? '#a78bfa' : '#8b5cf6';
      ctx.beginPath();
      ctx.arc(x, y, point.id === dragPointId ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();

      // Draw point border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [lane, points, zoom, pixelsPerSecond, hoveredPointId, dragPointId]);

  // Handle canvas click to add point
  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!lane || isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on existing point
    const clickedPoint = points.find(point => {
      const px = Number(point.time) * pixelsPerSecond * zoom;
      const py = canvas.height - (Number(point.value) * canvas.height);
      const distance = Math.sqrt(Math.pow(px - x, 2) + Math.pow(py - y, 2));
      return distance < 8;
    });

    if (clickedPoint) {
      // Delete point on click
      if (e.shiftKey) {
        await deletePoint.mutateAsync({ id: clickedPoint.id });
        await pointsQuery.refetch();
      }
      return;
    }

    // Add new point
    const time = x / (pixelsPerSecond * zoom);
    const value = 1 - (y / canvas.height);

    await createPoint.mutateAsync({
      laneId: lane.id,
      time: Math.max(0, time),
      value: Math.max(0, Math.min(1, value)),
      curveType,
    });

    await pointsQuery.refetch();
    
    if (onPointsChange) {
      onPointsChange(pointsQuery.data || []);
    }
  };

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!lane) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find point under cursor
    const clickedPoint = points.find(point => {
      const px = Number(point.time) * pixelsPerSecond * zoom;
      const py = canvas.height - (Number(point.value) * canvas.height);
      const distance = Math.sqrt(Math.pow(px - x, 2) + Math.pow(py - y, 2));
      return distance < 8;
    });

    if (clickedPoint) {
      setIsDragging(true);
      setDragPointId(clickedPoint.id);
    }
  };

  // Handle mouse move for dragging
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging && dragPointId) {
      // Update point position
      const time = x / (pixelsPerSecond * zoom);
      const value = 1 - (y / canvas.height);

      updatePoint.mutate({
        id: dragPointId,
        time: Math.max(0, time),
        value: Math.max(0, Math.min(1, value)),
      });
    } else {
      // Update hovered point
      const hoveredPoint = points.find(point => {
        const px = Number(point.time) * pixelsPerSecond * zoom;
        const py = canvas.height - (Number(point.value) * canvas.height);
        const distance = Math.sqrt(Math.pow(px - x, 2) + Math.pow(py - y, 2));
        return distance < 8;
      });

      setHoveredPointId(hoveredPoint?.id || null);
    }
  };

  // Handle mouse up to stop dragging
  const handleMouseUp = async () => {
    if (isDragging) {
      setIsDragging(false);
      setDragPointId(null);
      await pointsQuery.refetch();
      
      if (onPointsChange) {
        onPointsChange(pointsQuery.data || []);
      }
    }
  };

  // Handle recording button click
  const handleRecordClick = () => {
    if (!audioEngine) return;

    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      const recordedPoints = audioEngine.stopAutomationRecording();
      if (recordedPoints && recordedPoints.length > 0) {
        // Save recorded points to database
        if (recordMode === 'replace' && lane) {
          // Delete existing points
          points.forEach(point => {
            deletePoint.mutate({ id: point.id });
          });
        }

        // Create new points
        recordedPoints.forEach(point => {
          if (lane) {
            createPoint.mutate({
              laneId: lane.id,
              time: point.time,
              value: point.value,
            });
          }
        });

        // Refetch points
        setTimeout(() => pointsQuery.refetch(), 500);
      }
    } else {
      // Start recording
      setIsRecording(true);
      audioEngine.startAutomationRecording(trackId.toString(), parameter, recordMode);

      // Poll current parameter value during playback
      recordingIntervalRef.current = window.setInterval(() => {
        // Get current value from track channel
        const currentValue = audioEngine.getParameterValue(trackId.toString(), parameter);
        audioEngine.recordAutomationPoint(currentValue);
      }, 50); // Record at 20Hz
    }
  };

  // Cleanup recording interval on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // Stop recording if playback stops
  useEffect(() => {
    if (!isPlaying && isRecording) {
      handleRecordClick();
    }
  }, [isPlaying]);

  if (!lane || !lane.enabled) {
    return null;
  }

  return (
    <div className="relative w-full h-16 bg-background/50 border-t border-border">
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-muted/30 border-r border-border flex flex-col items-center justify-center gap-1 px-1">
        <span className="text-xs text-muted-foreground uppercase font-mono">
          {parameter}
        </span>
        <div className="flex gap-0.5">
          <Button
            variant={isRecording ? 'destructive' : 'ghost'}
            size="icon"
            className="h-5 w-5"
            onClick={handleRecordClick}
            title={isRecording ? 'Stop recording' : 'Start recording automation'}
          >
            {isRecording ? (
              <Square className="h-2.5 w-2.5 fill-current" />
            ) : (
              <Circle className="h-2.5 w-2.5 fill-current text-red-500" />
            )}
          </Button>
        </div>
        <div className="flex gap-0.5">
          <Button
            variant={curveType === 'linear' ? 'default' : 'ghost'}
            size="icon"
            className="h-5 w-5"
            onClick={() => setCurveType('linear')}
            title="Linear curve"
          >
            <Minus className="h-2.5 w-2.5" />
          </Button>
          <Button
            variant={curveType === 'bezier' ? 'default' : 'ghost'}
            size="icon"
            className="h-5 w-5"
            onClick={() => setCurveType('bezier')}
            title="Bezier curve"
          >
            <Waves className="h-2.5 w-2.5" />
          </Button>
          <Button
            variant={curveType === 'step' ? 'default' : 'ghost'}
            size="icon"
            className="h-5 w-5"
            onClick={() => setCurveType('step')}
            title="Step curve"
          >
            <BarChart3 className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={timelineWidth}
        height={64}
        className="absolute left-24 top-0 cursor-crosshair"
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}
