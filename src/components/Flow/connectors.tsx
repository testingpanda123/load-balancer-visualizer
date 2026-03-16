import { forwardRef, useId, type ReactNode } from 'react';

export interface Connector {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isBottom?: boolean;
  disabled?: boolean;
  single?: boolean;
  animated?: boolean;
  animationColor?: string;
  animationDelay?: number;
  secondaryAnimated?: boolean;
  secondaryAnimationColor?: string;
  secondaryAnimationDelay?: number;
}

type ConnectorsProps = {
  connectors: Connector[];
  children?: ReactNode;
} & Omit<PathProps, 'isBottom' | 'single'>;

type PathProps = Partial<{
  cornerRadius: number;
  midOffset: number;
  arrowheadOffset: number;
  isBottom: boolean;
  single: boolean;
  orientation: 'vertical' | 'horizontal';
}>;

const FLAT_THRESHOLD = 2;

export function createRoundedPath(
  { x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number },
  {
    cornerRadius: maxCornerRadius = 8,
    midOffset = 32,
    arrowheadOffset = 8,
    isBottom = false,
    single = false,
    orientation = 'vertical'
  }: PathProps = {}
) {
  const cornerRadius = Math.min(
    maxCornerRadius,
    Math.abs(orientation === 'horizontal' ? (y2 - y1) / 2 : (x2 - x1) / 2)
  );
  if (orientation === 'horizontal') {
    if (Math.abs(y2 - y1) <= FLAT_THRESHOLD)
      return `M ${x1} ${y1} L ${x2 - arrowheadOffset} ${y2}`;

    const verticalX = single || isBottom ? x2 - midOffset : x1 + midOffset;
    const isGoingRight = x2 > x1;
    const horizontalSign = isGoingRight ? 1 : -1;
    const isGoingDown = y2 > y1;
    const verticalSign = isGoingDown ? 1 : -1;

    const firstHorizontalEnd = verticalX - horizontalSign * cornerRadius;
    const verticalStart = y1 + verticalSign * cornerRadius;
    const verticalEnd = y2 - verticalSign * cornerRadius;
    const secondHorizontalStart = verticalX + horizontalSign * cornerRadius;
    const pathEndX = x2 - horizontalSign * arrowheadOffset;

    const bottomCurveCommands = [
      `L ${firstHorizontalEnd} ${y1}`,
      `Q ${verticalX} ${y1} ${verticalX} ${verticalStart}`,
      single
        ? `L ${verticalX} ${verticalEnd} Q ${verticalX} ${y2} ${secondHorizontalStart} ${y2}`
        : `L ${verticalX} ${y2}`
    ];

    const topCurveCommands = [
      single
        ? `L ${firstHorizontalEnd} ${y1} Q ${verticalX} ${y1} ${verticalX} ${verticalStart}`
        : `L ${verticalX} ${y1}`,
      `L ${verticalX} ${verticalEnd}`,
      `Q ${verticalX} ${y2} ${secondHorizontalStart} ${y2}`
    ];

    const commands = [
      `M ${x1} ${y1}`,
      isBottom ? [...bottomCurveCommands] : [...topCurveCommands],
      `L ${pathEndX} ${y2}`
    ];

    return commands.join(' ');
  }

  if (Math.abs(x2 - x1) <= FLAT_THRESHOLD)
    return `M ${x1} ${y1} L ${x2} ${y2 - arrowheadOffset}`;

  const horizontalY = y2 - midOffset;
  const isGoingRight = x2 > x1;
  const horizontalSign = isGoingRight ? 1 : -1;
  const isGoingDown = y2 > y1;
  const verticalSign = isGoingDown ? 1 : -1;

  const firstVerticalEnd = horizontalY - cornerRadius;
  const horizontalStart = x1 + horizontalSign * cornerRadius;
  const horizontalEnd = x2 - horizontalSign * cornerRadius;
  const secondVerticalStart = horizontalY + cornerRadius;
  const pathEndY = y2 - verticalSign * arrowheadOffset;

  const bottomCurveCommands = [
    `L ${x1} ${firstVerticalEnd}`,
    `Q ${x1} ${horizontalY} ${horizontalStart} ${horizontalY}`,
    `L ${x2} ${horizontalY}`
  ];

  const topCurveCommands = [
    `L ${x1} ${horizontalY}`,
    `L ${horizontalEnd} ${horizontalY}`,
    `Q ${x2} ${horizontalY} ${x2} ${secondVerticalStart}`
  ];

  const commands = [
    `M ${x1} ${y1}`,
    isBottom ? [...bottomCurveCommands] : [...topCurveCommands],
    `L ${x2} ${pathEndY}`
  ];

  return commands.join(' ');
}

export const Connectors = forwardRef<SVGSVGElement, ConnectorsProps>(
  function Connectors({ connectors, children, ...pathProps }, svgRef) {
    const id = useId();
    return (
      <svg
        width="100%"
        height="100%"
        aria-hidden="true"
        className="text-kumo-inactive overflow-visible"
        ref={svgRef}
      >
        <defs>
          <marker
            id={id}
            markerWidth="8"
            markerHeight="8"
            refX="0"
            refY="4"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path
              d="M 0,1.5 Q 0,0 1.5,0 Q 3.5,1 5.8,3.2 Q 6.5,4 5.8,4.8 Q 3.5,7 1.5,8 Q 0,8 0,6.5 Z"
              fill="currentColor"
              stroke="none"
            />
          </marker>
        </defs>
        {[...connectors]
          .sort((a, b) => {
            if (a.disabled && !b.disabled) return -1;
            if (!a.disabled && b.disabled) return 1;
            return 0;
          })
          .map((connector, index) => {
            const path = createRoundedPath(connector, {
              isBottom: connector.isBottom,
              single: connector.single,
              ...pathProps
            });
            return (
              <g
                key={index}
                className={
                  connector.disabled
                    ? 'text-neutral-300 dark:text-neutral-700'
                    : undefined
                }
              >
                <rect
                  x={connector.x1}
                  y={connector.y1}
                  width="3"
                  height="6"
                  transform="translate(0 -3)"
                  rx="1"
                  fill="currentColor"
                />
                <path
                  id={`path-${index}`}
                  d={path}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  markerEnd={`url(#${id})`}
                  data-index={index}
                />
                {connector.animated && !connector.disabled && (
                  <circle
                    r="3"
                    fill={connector.animationColor || '#4ade80'}
                    className="drop-shadow-[0_0_6px_rgba(74,222,128,0.8)]"
                  >
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      begin={`${connector.animationDelay || 0}s`}
                    >
                      <mpath href={`#path-${index}`} />
                    </animateMotion>
                  </circle>
                )}
              </g>
            );
          })}
        {children}
      </svg>
    );
  }
);
