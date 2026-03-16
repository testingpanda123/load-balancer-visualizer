import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useTransform,
  type MotionValue,
  type PanInfo
} from 'framer-motion';
import { Connectors, type Connector } from './connectors';
import {
  DescendantsProvider,
  useDescendantIndex,
  useDescendants,
  type DescendantInfo
} from './use-children';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

const DEFAULT_PADDING = {
  y: 64,
  x: 16
};

const MIN_SCROLLBAR_THUMB_SIZE = 10;

type Orientation = 'horizontal' | 'vertical';
type Align = 'start' | 'center';

interface DiagramContextValue {
  orientation: Orientation;
  align: Align;
  x: MotionValue<number>;
  y: MotionValue<number>;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}

const DiagramContext = createContext<DiagramContextValue | null>(null);

export function useDiagramContext(): DiagramContextValue {
  const context = useContext(DiagramContext);
  if (context === null) {
    throw new Error('useDiagramContext must be used within a FlowDiagram');
  }
  return context;
}

interface FlowDiagramProps {
  orientation?: Orientation;
  align?: Align;
  canvas?: boolean;
  padding?: { x?: number; y?: number };
  className?: string;
  children?: ReactNode;
}

export function FlowDiagram({
  orientation = 'horizontal',
  align = 'start',
  canvas = true,
  padding,
  className,
  children
}: FlowDiagramProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const resolvedPadding = {
    x: padding?.x ?? DEFAULT_PADDING.x,
    y: padding?.y ?? DEFAULT_PADDING.y
  };

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [bounds, setBounds] = useState<{ x: number; y: number } | null>(null);
  const [dimensions, setDimensions] = useState<{
    viewportWidth: number;
    viewportHeight: number;
    contentWidth: number;
    contentHeight: number;
  } | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const [canPan, setCanPan] = useState(false);

  useEffect(() => {
    if (!canvas) return;
    if (!wrapperRef.current || !contentRef.current) return;

    const measureBounds = () => {
      if (!wrapperRef.current || !contentRef.current) return;

      const wrapper = wrapperRef.current.getBoundingClientRect();
      const content = contentRef.current.getBoundingClientRect();

      const availableWidth = wrapper.width - resolvedPadding.x * 2;
      const availableHeight = wrapper.height - resolvedPadding.y * 2;

      setBounds({
        x: Math.min(0, availableWidth - content.width),
        y: Math.min(0, availableHeight - content.height)
      });

      setDimensions({
        viewportWidth: availableWidth,
        viewportHeight: availableHeight,
        contentWidth: content.width,
        contentHeight: content.height
      });

      setCanPan(
        content.width > availableWidth || content.height > availableHeight
      );
    };

    measureBounds();

    const resizeObserver = new ResizeObserver(measureBounds);
    resizeObserver.observe(wrapperRef.current);
    resizeObserver.observe(contentRef.current);

    return () => resizeObserver.disconnect();
  }, [canvas, resolvedPadding.x, resolvedPadding.y]);

  useEffect(() => {
    if (!canvas) return;
    if (!bounds) return;

    if (x.get() < bounds.x) {
      x.set(bounds.x);
    }
    if (y.get() < bounds.y) {
      y.set(bounds.y);
    }
  }, [canvas, bounds, x, y]);

  useEffect(() => {
    if (!canvas) return;
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [canvas]);

  useEffect(() => {
    if (!canvas) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleWheel = (e: WheelEvent) => {
      if (!bounds) return;

      const canScrollX = bounds.x < 0;
      const canScrollY = bounds.y < 0;

      if (!canScrollX && !canScrollY) return;

      e.preventDefault();

      if (canScrollY) {
        const newY = Math.max(bounds.y, Math.min(0, y.get() - e.deltaY));
        y.set(newY);
      }

      if (canScrollX) {
        const newX = Math.max(bounds.x, Math.min(0, x.get() - e.deltaX));
        x.set(newX);
      }
    };

    wrapper.addEventListener('wheel', handleWheel, { passive: false });
    return () => wrapper.removeEventListener('wheel', handleWheel);
  }, [canvas, bounds, x, y]);

  const isEventFromNode = (e: PointerEvent) => {
    const target = e.target as HTMLElement;
    return target.closest('[data-node-id]') !== null;
  };

  const handlePanStart = (e: PointerEvent) => {
    if (isEventFromNode(e)) return;
    setIsPanning(true);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  const handlePan = (_: PointerEvent, info: PanInfo) => {
    if (!bounds || !isPanning) return;
    x.set(Math.max(bounds.x, Math.min(0, x.get() + info.delta.x)));
    y.set(Math.max(bounds.y, Math.min(0, y.get() + info.delta.y)));
  };

  const handlePanEnd = () => {
    if (!isPanning) return;
    setIsPanning(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const canScrollX = bounds && bounds.x < 0;
  const canScrollY = bounds && bounds.y < 0;

  const scrollThumbWidth =
    dimensions && dimensions.contentWidth > 0 && dimensions.viewportWidth > 0
      ? Math.max(
          MIN_SCROLLBAR_THUMB_SIZE,
          (dimensions.viewportWidth / dimensions.contentWidth) * 100
        )
      : 0;
  const scrollThumbHeight =
    dimensions && dimensions.contentHeight > 0 && dimensions.viewportHeight > 0
      ? Math.max(
          MIN_SCROLLBAR_THUMB_SIZE,
          (dimensions.viewportHeight / dimensions.contentHeight) * 100
        )
      : 0;

  const scrollbarXPercent = useTransform(
    x,
    [0, bounds?.x ?? 0],
    [0, 100 - scrollThumbWidth]
  );
  const scrollbarYPercent = useTransform(
    y,
    [0, bounds?.y ?? 0],
    [0, 100 - scrollThumbHeight]
  );

  const scrollTop = useMotionTemplate`${scrollbarYPercent}%`;
  const scrollLeft = useMotionTemplate`${scrollbarXPercent}%`;

  const contextValue = useMemo(
    () => ({ orientation, align, x, y, wrapperRef }),
    [orientation, align, x, y]
  );

  if (!canvas) {
    return (
      <DiagramContext.Provider value={contextValue}>
        <div className={className}>
          <FlowNodeList>{children}</FlowNodeList>
        </div>
      </DiagramContext.Provider>
    );
  }

  return (
    <DiagramContext.Provider value={contextValue}>
      <motion.div
        ref={wrapperRef}
        className={cn('relative overflow-hidden grow isolate group', className)}
        style={{
          paddingTop: resolvedPadding.y,
          paddingBottom: resolvedPadding.y,
          paddingLeft: resolvedPadding.x,
          paddingRight: resolvedPadding.x,
          cursor: canPan && !isPanning ? 'grab' : undefined
        }}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
      >
        <motion.div ref={contentRef} className="w-max mx-auto" style={{ x, y }}>
          <FlowNodeList>{children}</FlowNodeList>
        </motion.div>

        {canScrollY && (
          <div className="absolute right-1 top-1 bottom-1 w-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 opacity-0 group-hover:opacity-100">
            <motion.div
              className="absolute w-full rounded-full bg-neutral-400 dark:bg-neutral-500"
              style={{
                height: `${scrollThumbHeight}%`,
                top: scrollTop
              }}
            />
          </div>
        )}

        {canScrollX && (
          <div className="absolute bottom-1 left-1 right-1 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 opacity-0 group-hover:opacity-100">
            <motion.div
              className="absolute h-full rounded-full bg-neutral-400 dark:bg-neutral-500"
              style={{
                width: `${scrollThumbWidth}%`,
                left: scrollLeft
              }}
            />
          </div>
        )}
      </motion.div>
    </DiagramContext.Provider>
  );
}

export type RectLike = {
  x: number;
  y: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type NodeData = {
  parallel?: boolean;
  disabled?: boolean;
  start?: RectLike | null;
  end?: RectLike | null;
  animated?: boolean;
  animationColor?: string;
  animationDelay?: number;
  secondaryAnimated?: boolean;
  secondaryAnimationColor?: string;
  secondaryAnimationDelay?: number;
};

export const useNodeGroup = () => useDescendants<NodeData>();

export const useNode = (props: NodeData) => useDescendantIndex<NodeData>(props);

export const getNodeRect = (
  node: DescendantInfo<NodeData> | undefined,
  { type = 'start' }: { type?: 'start' | 'end' }
): RectLike | null => {
  if (!node) return null;
  return node.props[type] ?? null;
};

export function FlowNodeList({ children }: { children: ReactNode }) {
  const { orientation, align } = useDiagramContext();
  const descendants = useNodeGroup();
  const containerRef = useRef<HTMLDivElement>(null);

  const connectors = useMemo(() => {
    const edges: Connector[] = [];
    const nodes = descendants.descendants;
    const containerRect = containerRef.current?.getBoundingClientRect();

    const offsetX = containerRect?.left ?? 0;
    const offsetY = containerRect?.top ?? 0;

    for (let i = 0; i < nodes.length - 1; i++) {
      const currentNode = nodes[i];
      const nextNode = nodes[i + 1];

      if (currentNode.props?.parallel || nextNode.props?.parallel) continue;

      const currentRect = getNodeRect(currentNode, { type: 'start' });
      const nextRect = getNodeRect(nextNode, { type: 'end' });

      if (currentRect && nextRect) {
        const isDisabled =
          currentNode.props.disabled || nextNode.props.disabled;
        edges.push({
          x1: currentRect.left - offsetX + currentRect.width,
          y1: currentRect.top - offsetY + currentRect.height / 2,
          x2: nextRect.left - offsetX,
          y2: nextRect.top - offsetY + nextRect.height / 2,
          disabled: isDisabled,
          single: true
        });
      }
    }

    return edges;
  }, [descendants.descendants]);

  return (
    <DescendantsProvider value={descendants}>
      <div className="relative" ref={containerRef}>
        <ul
          className={cn(
            'ml-0 list-none',
            orientation === 'vertical'
              ? 'grid auto-rows-min gap-16'
              : 'flex gap-16',
            orientation === 'horizontal' &&
              (align === 'center' ? 'items-center' : 'items-start')
          )}
        >
          {children}
        </ul>
        <div className="absolute inset-0 pointer-events-none">
          <Connectors connectors={connectors} orientation={orientation}>
            {connectors.map((connector, index) => {
              const animations = [];
              
              if (!connector.disabled && connector.animated) {
                animations.push(
                  <circle
                    key={`traffic-${index}`}
                    r={3}
                    fill={connector.animationColor || '#4ade80'}
                    style={{
                      filter: `drop-shadow(0 0 6px ${connector.animationColor || '#4ade80'})`
                    }}
                  >
                    <animateMotion
                      dur="2.5s"
                      repeatCount="indefinite"
                      begin={`${connector.animationDelay || 0}s`}
                    >
                      <mpath href={`#path-${index}`} />
                    </animateMotion>
                  </circle>
                );
              }
              
              if (!connector.disabled && connector.secondaryAnimated) {
                animations.push(
                  <circle
                    key={`monitor-${index}`}
                    r={1.5}
                    fill={connector.secondaryAnimationColor || '#22d3ee'}
                    style={{
                      filter: `drop-shadow(0 0 4px ${connector.secondaryAnimationColor || '#22d3ee'})`
                    }}
                  >
                    <animateMotion
                      dur="1.5s"
                      repeatCount="indefinite"
                      begin={`${connector.secondaryAnimationDelay || 0}s`}
                    >
                      <mpath href={`#path-${index}`} />
                    </animateMotion>
                  </circle>
                );
              }
              
              return animations;
            })}
          </Connectors>
        </div>
      </div>
    </DescendantsProvider>
  );
}
