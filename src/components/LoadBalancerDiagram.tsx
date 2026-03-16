import { type CSSProperties, type ReactNode, useState, useRef, useCallback, useMemo } from 'react';
import { Users, Database, Server, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Pool, MonitorGroup, HealthStatus, SteeringMethod } from '../types';
import { getPoolHealth, getEndpointHealth } from '../utils/healthCalculations';
import { getActivePoolsForSteering, getSteeringDisplayName } from '../utils/trafficSteering';

const PILL_HEIGHT = 42;
const SMALL_PILL_HEIGHT = 30;
const NODE_GAP = 8;

interface LoadBalancerDiagramProps {
  pools: Pool[];
  monitorGroups: MonitorGroup[];
  steeringMethod: SteeringMethod;
  onPoolClick?: (poolId: string) => void;
  showMonitors?: boolean;
  className?: string;
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function BackgroundDots({ size = 12 }: { size?: number }) {
  const id = 'lb-diagram-dots';
  return (
    <svg width="100%" height="100%">
      <defs>
        <pattern
          id={id}
          viewBox={`-${size / 2} -${size / 2} ${size} ${size}`}
          patternUnits="userSpaceOnUse"
          width={size}
          height={size}
        >
          <circle cx="0" cy="0" r="1" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

function Pill({
  label,
  children,
  onClick,
  healthStatus,
  isClickable = false
}: {
  label?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  healthStatus?: HealthStatus;
  isClickable?: boolean;
}) {
  const Component = onClick ? 'button' : 'div';
  
  const healthColors = {
    healthy: 'ring-green-500/50 dark:ring-green-500/30',
    degraded: 'ring-yellow-500/50 dark:ring-yellow-500/30',
    critical: 'ring-red-500/50 dark:ring-red-500/30'
  };
  
  const ringClass = healthStatus ? healthColors[healthStatus] : 'ring-neutral-950/10 dark:ring-neutral-800';

  return (
    <Component
      className={cn(
        'w-fit relative flex items-center rounded-full ring-2 pr-[14px] bg-kumo-surface dark:bg-neutral-900 shadow',
        label ? 'gap-2' : 'p-2 gap-1.5',
        isClickable && 'cursor-pointer hover:ring-4 transition-all pl-0',
        !isClickable && 'pl-2',
        ringClass
      )}
      style={{
        height: label ? SMALL_PILL_HEIGHT : PILL_HEIGHT
      }}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      {label && (
        <div
          className="truncate flex items-center rounded-full bg-blue-50 dark:bg-blue-900 dark:text-blue-200 dark:ring-blue-500 ring ring-blue-300 text-blue-700 p-1.5 pr-2.5 gap-1 min-w-0"
          style={{
            height: SMALL_PILL_HEIGHT
          }}
        >
          {label}
        </div>
      )}
      {children}
    </Component>
  );
}

export function LoadBalancerDiagram({
  pools,
  monitorGroups,
  steeringMethod,
  onPoolClick,
  showMonitors = true,
  className
}: LoadBalancerDiagramProps) {
  const poolCount = pools.length;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Calculate which pools should receive traffic based on steering method
  const activePoolIds = useMemo(
    () => getActivePoolsForSteering(pools, monitorGroups, steeringMethod),
    [pools, monitorGroups, steeringMethod]
  );
  
  // Calculate total endpoints for proper spacing
  const totalEndpoints = pools.reduce((sum, pool) => sum + pool.endpoints.length, 0);
  
  const calculatedContentHeight =
    24 +
    PILL_HEIGHT / 2 +
    Math.max(poolCount, totalEndpoints) * SMALL_PILL_HEIGHT +
    Math.max(poolCount - 1, totalEndpoints - 1) * NODE_GAP +
    PILL_HEIGHT / 2 +
    24;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.min(Math.max(0.5, zoom + delta), 3);
    setZoom(newZoom);
  }, [zoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  return (
    <div className={cn('h-full relative overflow-hidden', className)}>
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-kumo-surface border border-custom rounded-lg hover:bg-kumo-control transition-colors shadow-lg"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-kumo-surface border border-custom rounded-lg hover:bg-kumo-control transition-colors shadow-lg"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="p-2 bg-kumo-surface border border-custom rounded-lg hover:bg-kumo-control transition-colors shadow-lg"
          title="Reset View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <div className="px-2 py-1 bg-kumo-surface border border-custom rounded-lg text-[10px] font-mono text-center shadow-lg">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Zoomable/Pannable Container */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div
          className="grid relative h-full"
          style={{
            minHeight: `${calculatedContentHeight}px`,
            minWidth: '100%',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
        {/* Background dots */}
        <div className="col-start-1 row-start-1 text-kumo-recessed">
          <BackgroundDots />
        </div>

        {/* Main content */}
        <div className="col-start-1 row-start-1 relative flex items-center justify-center py-6 px-4 sm:px-6">
          <div className="flex gap-8">
            {/* Layer 1: User Request */}
            <div className="relative z-10 w-fit flex flex-col items-center">
              <Pill>
                <Users className="w-5 h-5 text-blue-400" />
                <div className="flex flex-col">
                  <p className="font-medium text-sm">Incoming Traffic</p>
                  <p className="text-[10px] text-kumo-subtle">{getSteeringDisplayName(steeringMethod)}</p>
                </div>
              </Pill>
            </div>

            {/* Connections to pools */}
            <svg
              width="32"
              height={
                poolCount * SMALL_PILL_HEIGHT +
                (poolCount - 1) * NODE_GAP +
                (PILL_HEIGHT - SMALL_PILL_HEIGHT) / 2
              }
              fill="none"
              strokeWidth="2"
              className="stroke-kumo-line relative"
            >
              {pools.map((pool, i) => {
                const monitorGroup = pool.monitorGroupId
                  ? monitorGroups.find(mg => mg.id === pool.monitorGroupId)
                  : undefined;
                const health = getPoolHealth(pool, monitorGroup);
                const height =
                  (SMALL_PILL_HEIGHT + NODE_GAP) * i + PILL_HEIGHT / 2;
                const pathId = `pool-path-${i}`;
                const isActive = activePoolIds.includes(pool.id);
                
                return (
                  <g key={i}>
                    <path
                      id={pathId}
                      d={`M 0 21 C 16 21 16 ${height} 32 ${height}`}
                    />
                    {health !== 'critical' && isActive && (
                      <motion.circle
                        r="3"
                        fill={health === 'healthy' ? '#4ade80' : '#facc15'}
                        className="drop-shadow-[0_0_6px_rgba(74,222,128,0.8)]"
                      >
                        <animateMotion
                          dur="2s"
                          repeatCount="indefinite"
                          begin={`${i * 0.3}s`}
                        >
                          <mpath href={`#${pathId}`} />
                        </animateMotion>
                      </motion.circle>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Layer 2: Pools */}
            <ul
              className="relative space-y-[var(--gap)] !ml-0 translate-y-1.5"
              style={{ '--gap': `${NODE_GAP}px` } as CSSProperties}
            >
              {pools.map(pool => {
                const monitorGroup = pool.monitorGroupId
                  ? monitorGroups.find(mg => mg.id === pool.monitorGroupId)
                  : undefined;
                const health = getPoolHealth(pool, monitorGroup);

                return (
                  <li key={pool.id}>
                    <Pill
                      label={
                        <>
                          <Database className="w-4 h-4" />
                          <p className="text-xs font-medium">Pool</p>
                        </>
                      }
                      onClick={() => onPoolClick?.(pool.id)}
                      healthStatus={health}
                      isClickable={!!onPoolClick}
                    >
                      <p className="font-mono text-sm truncate max-w-[120px]">
                        {pool.name}
                      </p>
                    </Pill>
                  </li>
                );
              })}
            </ul>

            {/* Connections to endpoints */}
            <svg
              width="32"
              height={
                totalEndpoints * SMALL_PILL_HEIGHT +
                (totalEndpoints - 1) * NODE_GAP +
                (PILL_HEIGHT - SMALL_PILL_HEIGHT) / 2
              }
              fill="none"
              strokeWidth="2"
              className="stroke-kumo-line relative"
            >
              {pools.flatMap((pool, poolIdx) => {
                const poolStartIdx = pools
                  .slice(0, poolIdx)
                  .reduce((sum, p) => sum + p.endpoints.length, 0);
                
                const monitorGroup = pool.monitorGroupId
                  ? monitorGroups.find(mg => mg.id === pool.monitorGroupId)
                  : undefined;
                const poolHealth = getPoolHealth(pool, monitorGroup);
                const isPoolActive = activePoolIds.includes(pool.id);
                
                return pool.endpoints.map((endpoint, endpointIdx) => {
                  const globalIdx = poolStartIdx + endpointIdx;
                  const poolHeight = (SMALL_PILL_HEIGHT + NODE_GAP) * poolIdx + PILL_HEIGHT / 2;
                  const endpointHeight = (SMALL_PILL_HEIGHT + NODE_GAP) * globalIdx + PILL_HEIGHT / 2;
                  const pathId = `endpoint-path-${pool.id}-${endpointIdx}`;
                  const endpointHealth = getEndpointHealth(pool, endpoint, monitorGroup);
                  
                  return (
                    <g key={`${pool.id}-${endpointIdx}`}>
                      <path
                        id={pathId}
                        d={`M 0 ${poolHeight} C 16 ${poolHeight} 16 ${endpointHeight} 32 ${endpointHeight}`}
                      />
                      {poolHealth !== 'critical' && endpointHealth !== 'critical' && isPoolActive && (
                        <motion.circle
                          r="2.5"
                          fill={endpointHealth === 'healthy' ? '#4ade80' : '#facc15'}
                          className="drop-shadow-[0_0_4px_rgba(74,222,128,0.6)]"
                        >
                          <animateMotion
                            dur="2.5s"
                            repeatCount="indefinite"
                            begin={`${(poolIdx * 0.3 + endpointIdx * 0.15)}s`}
                          >
                            <mpath href={`#${pathId}`} />
                          </animateMotion>
                        </motion.circle>
                      )}
                      {showMonitors && (
                        <motion.circle
                          r="1.5"
                          fill={pool.monitorGroupId ? '#22d3ee' : '#f472b6'}
                          opacity="0.7"
                          className={pool.monitorGroupId ? 'drop-shadow-[0_0_3px_rgba(34,211,238,0.5)]' : 'drop-shadow-[0_0_3px_rgba(244,114,182,0.5)]'}
                        >
                          <animateMotion
                            dur="1.5s"
                            repeatCount="indefinite"
                            begin={`${(poolIdx * 0.2 + endpointIdx * 0.1)}s`}
                          >
                            <mpath href={`#${pathId}`} />
                          </animateMotion>
                        </motion.circle>
                      )}
                    </g>
                  );
                });
              })}
            </svg>

            {/* Layer 3: Endpoints */}
            <ul
              className="relative space-y-[var(--gap)] !ml-0 translate-y-1.5"
              style={{ '--gap': `${NODE_GAP}px` } as CSSProperties}
            >
              {pools.flatMap(pool => {
                const monitorGroup = pool.monitorGroupId
                  ? monitorGroups.find(mg => mg.id === pool.monitorGroupId)
                  : undefined;

                return pool.endpoints.map(endpoint => {
                  const health = getEndpointHealth(pool, endpoint, monitorGroup);

                  return (
                    <li key={endpoint.id}>
                      <Pill
                        label={
                          <>
                            <Server className="w-4 h-4" />
                            <p className="text-xs font-medium">Endpoint</p>
                          </>
                        }
                        healthStatus={health}
                      >
                        <p className="font-mono text-sm truncate max-w-[120px]">
                          {endpoint.name}
                        </p>
                      </Pill>
                    </li>
                  );
                });
              })}
            </ul>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
