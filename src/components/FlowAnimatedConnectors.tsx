import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface AnimatedDot {
  id: string;
  pathId: string;
  color: string;
  size: number;
  duration: number;
  delay: number;
}

interface FlowAnimatedConnectorsProps {
  containerRef: React.RefObject<HTMLElement>;
  dots: AnimatedDot[];
}

export function FlowAnimatedConnectors({ containerRef, dots }: FlowAnimatedConnectorsProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [containerRef]);

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none"
      width={dimensions.width}
      height={dimensions.height}
      style={{ zIndex: 100 }}
    >
      {dots.map((dot) => {
        const pathElement = document.getElementById(dot.pathId);
        if (!pathElement) return null;

        return (
          <motion.circle
            key={dot.id}
            r={dot.size}
            fill={dot.color}
            style={{
              filter: `drop-shadow(0 0 ${dot.size * 2}px ${dot.color})`
            }}
          >
            <animateMotion
              dur={`${dot.duration}s`}
              repeatCount="indefinite"
              begin={`${dot.delay}s`}
            >
              <mpath href={`#${dot.pathId}`} />
            </animateMotion>
          </motion.circle>
        );
      })}
    </svg>
  );
}
