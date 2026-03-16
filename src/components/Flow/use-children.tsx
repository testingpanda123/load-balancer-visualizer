import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';

export type DescendantInfo<T = Record<string, unknown>> = {
  id: string;
  props: T;
  renderOrder: number;
};

type DescendantsContextType<DescendantType = Record<string, unknown>> = {
  register: (
    id: string,
    renderOrder: number,
    props?: DescendantType
  ) => { unregister: () => void };
  descendants: DescendantInfo<DescendantType>[];
  claimRenderOrder: (id: string) => number;
};

const DescendantsContext = createContext<DescendantsContextType | null>(null);

export function useDescendants<
  DescendantType extends Record<string, unknown>
>(): DescendantsContextType<DescendantType> {
  const [registeredDescendants, setRegisteredDescendants] = useState<
    DescendantInfo<DescendantType>[]
  >([]);
  const descendantsRef = useRef<Map<string, DescendantInfo<DescendantType>>>(
    new Map()
  );

  const renderOrderCounterRef = useRef(0);
  const renderOrderMapRef = useRef<Map<string, number>>(new Map());

  renderOrderCounterRef.current = 0;
  renderOrderMapRef.current.clear();

  const claimRenderOrder = useCallback((id: string): number => {
    if (!renderOrderMapRef.current.has(id)) {
      renderOrderMapRef.current.set(id, renderOrderCounterRef.current++);
    }
    return renderOrderMapRef.current.get(id) as number;
  }, []);

  const register = useCallback(
    (
      id: string,
      renderOrder: number,
      props: DescendantType = {} as DescendantType
    ) => {
      const descendantInfo: DescendantInfo<DescendantType> = {
        id,
        props,
        renderOrder
      };
      descendantsRef.current.set(id, descendantInfo);

      const sortedDescendants = Array.from(
        descendantsRef.current.values()
      ).sort((a, b) => a.renderOrder - b.renderOrder);
      setRegisteredDescendants(sortedDescendants);

      const unregister = () => {
        descendantsRef.current.delete(id);
        const remainingDescendants = Array.from(
          descendantsRef.current.values()
        ).sort((a, b) => a.renderOrder - b.renderOrder);
        setRegisteredDescendants(remainingDescendants);
      };

      return { unregister };
    },
    []
  );

  const contextValue: DescendantsContextType<DescendantType> = useMemo(
    () => ({
      register,
      descendants: registeredDescendants,
      claimRenderOrder
    }),
    [register, registeredDescendants, claimRenderOrder]
  );

  return contextValue;
}

type DescendantsProviderProps<T extends Record<string, unknown>> = {
  value: DescendantsContextType<T>;
  children: ReactNode;
};

export function DescendantsProvider<T extends Record<string, unknown>>({
  value,
  children
}: DescendantsProviderProps<T>) {
  return (
    <DescendantsContext.Provider
      value={value as unknown as DescendantsContextType}
    >
      {children}
    </DescendantsContext.Provider>
  );
}

export function useDescendantsContext<
  T extends Record<string, unknown>
>(): DescendantsContextType<T> {
  const context = useContext(DescendantsContext);

  if (!context) {
    throw new Error(
      'useDescendantsContext must be used within DescendantsProvider'
    );
  }

  return context as DescendantsContextType<T>;
}

export function useDescendantIndex<T extends Record<string, unknown>>(
  props?: T
) {
  const context = useDescendantsContext<T>();
  const id = useId();

  const renderOrder = context.claimRenderOrder(id);

  const unregisterRef = useRef<(() => void) | null>(null);
  const registerRef = useRef(context.register);

  registerRef.current = context.register;

  useEffect(() => {
    const { unregister } = registerRef.current(id, renderOrder, props);

    if (!unregisterRef.current) {
      unregisterRef.current = unregister;
    }

    return () => {
      if (unregisterRef.current) {
        unregisterRef.current();
        unregisterRef.current = null;
      }
    };
  }, [id, renderOrder, props]);

  const index = useMemo(() => {
    return context.descendants.findIndex(descendant => descendant.id === id);
  }, [context.descendants, id]);

  const getPrevious = useCallback((): DescendantInfo<T> | undefined => {
    if (index <= 0) return undefined;
    return context.descendants[index - 1];
  }, [context.descendants, index]);

  const getNext = useCallback((): DescendantInfo<T> | undefined => {
    if (index < 0 || index >= context.descendants.length - 1) return undefined;
    return context.descendants[index + 1];
  }, [context.descendants, index]);

  return { index, id, getPrevious, getNext };
}
