'use client';

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Snackbar, type SnackbarProps } from './snackbar.js';

export interface SnackbarOptions
  extends Pick<
    SnackbarProps,
    'actionLabel' | 'onAction' | 'dismissible' | 'dismissLabel' | 'duration'
  > {
  /** The message. */
  message: ReactNode;
}

interface SnackbarApi {
  /** Queues a message. Only one shows at a time; the next appears once it has gone. */
  show: (options: SnackbarOptions) => void;
  /** Closes the one showing, if any. The next in the queue then appears. */
  dismiss: () => void;
}

const SnackbarContext = createContext<SnackbarApi | null>(null);

/** The queue's `show` and `dismiss`. Must be used inside a `SnackbarProvider`. */
export function useSnackbar(): SnackbarApi {
  const api = use(SnackbarContext);
  if (!api) throw new Error('useSnackbar must be used inside <SnackbarProvider>.');
  return api;
}

/**
 * Shows queued snackbars, one at a time. Wrap the app once, then call `show` from anywhere:
 *
 * ```tsx
 * const { show } = useSnackbar();
 * show({ message: 'Message archived', actionLabel: 'Undo', onAction: undo });
 * ```
 */
export function SnackbarProvider({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [queue, setQueue] = useState<Array<SnackbarOptions & { id: number }>>([]);
  const [open, setOpen] = useState(false);
  const nextId = useRef(0);
  const current = queue[0];

  const show = useCallback((options: SnackbarOptions) => {
    setQueue((items) => [...items, { ...options, id: nextId.current++ }]);
  }, []);
  const dismiss = useCallback(() => setOpen(false), []);

  // A message waiting at the head of the queue is shown as soon as nothing else is. The one
  // that is animating out is still at the head, but must not be shown again.
  const shown = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (current && !open && shown.current !== current.id) {
      shown.current = current.id;
      setOpen(true);
    }
  }, [current, open]);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <SnackbarContext value={api}>
      {children}
      {current ? (
        <Snackbar
          key={current.id}
          open={open}
          onOpenChange={setOpen}
          actionLabel={current.actionLabel}
          onAction={current.onAction}
          dismissible={current.dismissible}
          dismissLabel={current.dismissLabel}
          duration={current.duration}
          // Gone: make way for the next message.
          onExited={() => setQueue((items) => items.slice(1))}
          className={className}
        >
          {current.message}
        </Snackbar>
      ) : null}
    </SnackbarContext>
  );
}
