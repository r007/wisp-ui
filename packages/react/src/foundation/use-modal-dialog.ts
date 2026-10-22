import { type MouseEvent, type PointerEvent, type SyntheticEvent, useEffect, useRef } from 'react';

export interface ModalDialogOptions {
  /** Whether the dialog is shown. The parent owns this; the hook makes the DOM follow it. */
  open: boolean;
  /** Called when the user asks to dismiss: Escape, a scrim click, or a native `close`. */
  onOpenChange?: ((open: boolean) => void) | undefined;
}

/**
 * Drives a native `<dialog>` as a modal (focus trap, top layer, inert page, Escape)
 * while React owns whether it is open.
 *
 * Closing is animated in every browser. Chromium can keep a closing dialog on
 * screen with `transition-behavior: allow-discrete`; Firefox cannot, so the exit
 * animation is not left to CSS. Instead the dialog stays `[open]` and gets a
 * `data-closing` attribute: style that state as the "exited" one. Once the
 * animations that started finish, `close()` is called.
 *
 * Contract for the markup: the `<dialog>` has no padding and its child fills it,
 * so a click that targets the dialog itself can only have landed on the scrim.
 *
 * ```tsx
 * const { ref, props } = useModalDialog({ open, onOpenChange });
 * return <dialog ref={ref} {...props}><div className={surface}>…</div></dialog>;
 * ```
 */
export function useModalDialog({ open, onOpenChange }: ModalDialogOptions) {
  const ref = useRef<HTMLDialogElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const openRef = useRef(open);
  openRef.current = open;
  /** Whether the press that became this click started on the scrim too. */
  const pressedScrim = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open) {
      dialog.removeAttribute('data-closing');
      if (!dialog.open) dialog.showModal();
      return;
    }
    if (!dialog.open) return;

    // `getAnimations()` flushes style, so it already sees the transitions that
    // the attribute starts. With reduced motion there are none and it closes at once.
    let cancelled = false;
    dialog.setAttribute('data-closing', '');
    const running = dialog.getAnimations({ subtree: true });
    Promise.allSettled(running.map((animation) => animation.finished)).then(() => {
      if (cancelled) return;
      dialog.close();
      dialog.removeAttribute('data-closing');
    });
    return () => {
      // Reopened mid-exit: the effect above takes it from here.
      cancelled = true;
    };
  }, [open]);

  return {
    ref,
    props: {
      // Escape: let the parent decide, so the dialog stays controlled.
      onCancel(event: SyntheticEvent<HTMLDialogElement>) {
        event.preventDefault();
        onOpenChangeRef.current?.(false);
      },
      // Closed by the platform itself, e.g. a `<form method="dialog">` button.
      onClose() {
        if (openRef.current) onOpenChangeRef.current?.(false);
      },
      onPointerDown(event: PointerEvent<HTMLDialogElement>) {
        pressedScrim.current = event.target === event.currentTarget;
      },
      // A click that targets the dialog itself landed on the scrim. A drag that
      // started inside (selecting text) and ended on the scrim is not a dismissal.
      onClick(event: MouseEvent<HTMLDialogElement>) {
        const startedOnScrim = pressedScrim.current ?? true;
        pressedScrim.current = undefined;
        if (event.target === event.currentTarget && startedOnScrim)
          onOpenChangeRef.current?.(false);
      },
    },
  };
}
