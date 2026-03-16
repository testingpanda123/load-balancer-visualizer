import {
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode
} from 'react';
import { useNode, type RectLike } from './diagram';

function mergeRefs<T>(
  ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
  return value => {
    refs.forEach(ref => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
}

export type FlowNodeProps = {
  render?: ReactElement;
  children?: ReactNode;
  disabled?: boolean;
  animated?: boolean;
  animationColor?: string;
  animationDelay?: number;
  secondaryAnimated?: boolean;
  secondaryAnimationColor?: string;
  secondaryAnimationDelay?: number;
};

export const FlowNode = forwardRef<HTMLElement, FlowNodeProps>(
  function FlowNode({ render, children, disabled = false, animated, animationColor, animationDelay, secondaryAnimated, secondaryAnimationColor, secondaryAnimationDelay }, ref) {
    const nodeRef = useRef<HTMLElement>(null);
    const startAnchorRef = useRef<HTMLElement | null>(null);
    const endAnchorRef = useRef<HTMLElement | null>(null);
    const [measurements, setMeasurements] = useState<{
      start: RectLike | null;
      end: RectLike | null;
    }>({ start: null, end: null });

    const nodeProps = useMemo(
      () => ({
        parallel: false,
        disabled,
        animated,
        animationColor,
        animationDelay,
        secondaryAnimated,
        secondaryAnimationColor,
        secondaryAnimationDelay,
        ...measurements
      }),
      [measurements, disabled, animated, animationColor, animationDelay, secondaryAnimated, secondaryAnimationColor, secondaryAnimationDelay]
    );

    const { index, id } = useNode(nodeProps);

    const measureNode = useCallback(() => {
      if (!nodeRef.current) return;

      const rect = nodeRef.current.getBoundingClientRect();
      const nodeRect = rect;

      let startRect: RectLike = nodeRect;
      let endRect: RectLike = nodeRect;

      if (startAnchorRef.current) {
        startRect = startAnchorRef.current.getBoundingClientRect();
      }

      if (endAnchorRef.current) {
        endRect = endAnchorRef.current.getBoundingClientRect();
      }

      setMeasurements(m => {
        const newVal = { start: startRect, end: endRect };
        if (JSON.stringify(m) === JSON.stringify(newVal)) return m;
        return newVal;
      });
    }, []);

    useEffect(() => {
      measureNode();
    });

    useEffect(() => {
      if (!nodeRef.current) return;

      const observer = new MutationObserver(() => {
        measureNode();
      });

      observer.observe(nodeRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });

      return () => {
        observer.disconnect();
      };
    }, [measureNode]);

    const mergedRef = mergeRefs(ref, nodeRef);

    let element: ReactElement;
    if (render && isValidElement(render)) {
      const renderProps = render.props as {
        children?: ReactNode;
        style?: React.CSSProperties;
      };
      element = cloneElement(render, {
        ref: mergedRef,
        'data-node-index': index,
        'data-node-id': id,
        style: { cursor: 'default', ...renderProps.style },
        children: renderProps.children ?? children
      } as React.HTMLAttributes<HTMLElement> & { ref: React.Ref<HTMLElement> });
    } else {
      element = (
        <li
          ref={mergedRef}
          className="py-2 px-3 rounded-md shadow bg-white dark:bg-neutral-800 ring ring-neutral-200 dark:ring-neutral-700"
          style={{ cursor: 'default' }}
          data-node-index={index}
          data-node-id={id}
        >
          {children}
        </li>
      );
    }

    return (
      <FlowNodeAnchorContext.Provider
        value={useMemo(
          () => ({
            registerStartAnchor: anchorRef => {
              startAnchorRef.current = anchorRef;
            },
            registerEndAnchor: anchorRef => {
              endAnchorRef.current = anchorRef;
            }
          }),
          []
        )}
      >
        {element}
      </FlowNodeAnchorContext.Provider>
    );
  }
);

FlowNode.displayName = 'Flow.Node';

type FlowNodeAnchorContextType = {
  registerStartAnchor: (ref: HTMLElement | null) => void;
  registerEndAnchor: (ref: HTMLElement | null) => void;
};

const FlowNodeAnchorContext = createContext<FlowNodeAnchorContextType | null>(
  null
);

export type FlowAnchorProps = {
  type?: 'start' | 'end';
  render?: ReactElement;
  children?: ReactNode;
};

export const FlowAnchor = forwardRef<HTMLElement, FlowAnchorProps>(
  function FlowAnchor({ type, render, children }, ref) {
    const context = useContext(FlowNodeAnchorContext);
    const anchorRef = useRef<HTMLElement>(null);

    if (!context) {
      throw new Error('Flow.Anchor must be used within Flow.Node');
    }

    useEffect(() => {
      if (!anchorRef.current) {
        return;
      }

      if (type === 'start' || type === undefined) {
        context.registerStartAnchor(anchorRef.current);
      }
      if (type === 'end' || type === undefined) {
        context.registerEndAnchor(anchorRef.current);
      }

      return () => {
        if (type === 'start' || type === undefined) {
          context.registerStartAnchor(null);
        }
        if (type === 'end' || type === undefined) {
          context.registerEndAnchor(null);
        }
      };
    }, [type, context]);

    const mergedRef = mergeRefs(ref, anchorRef);

    if (render && isValidElement(render)) {
      const renderProps = render.props as { children?: ReactNode };
      return cloneElement(render, {
        ref: mergedRef,
        children: renderProps.children ?? children
      } as React.HTMLAttributes<HTMLElement> & { ref: React.Ref<HTMLElement> });
    }

    return <div ref={mergedRef}>{children}</div>;
  }
);

FlowAnchor.displayName = 'Flow.Anchor';
