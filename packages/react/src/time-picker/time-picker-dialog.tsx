'use client';

import { useId, useState } from 'react';
import { Button } from '../button/button.js';
import { cx } from '../foundation/cx.js';
import { useModalDialog } from '../foundation/use-modal-dialog.js';
import { DEFAULT_LABELS, NOON, TimePicker, type TimePickerProps } from './time-picker.js';
import styles from './time-picker-dialog.module.css';
import type { TimeValue } from './time-value.js';

export interface TimePickerDialogProps
  extends Omit<
    TimePickerProps,
    'value' | 'defaultValue' | 'onValueChange' | 'actions' | 'headlineId'
  > {
  /** Whether the dialog is shown. */
  open: boolean;
  /** Called when the user dismisses it: Cancel, Escape, the scrim, and after OK. */
  onOpenChange?: (open: boolean) => void;
  /** The time the dialog starts from each time it opens. @default 12:00 */
  value?: TimeValue;
  /** Called with the chosen time when OK is pressed. */
  onConfirm?: (value: TimeValue) => void;
}

/**
 * A `TimePicker` in a modal dialog with Cancel and OK buttons. The time is only reported, by
 * `onConfirm`, when OK is pressed; the picker starts from `value` each time it opens.
 *
 * ```tsx
 * <TimePickerDialog open={open} onOpenChange={setOpen} value={time} onConfirm={setTime} />
 * ```
 */
export function TimePickerDialog({
  open,
  onOpenChange,
  value = NOON,
  onConfirm,
  labels: labelsProp,
  className,
  ...rest
}: TimePickerDialogProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const headlineId = useId();
  const modal = useModalDialog({ open, onOpenChange });
  const [draft, setDraft] = useState(value);
  // Each opening starts afresh: from the value it is given, on the hours, in the default mode.
  // Adjusting state while rendering, not in an effect, so the picker is new in the very commit
  // that shows the dialog and nothing flashes or takes the focus from it.
  const [wasOpen, setWasOpen] = useState(open);
  const [openings, setOpenings] = useState(0);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(value);
      setOpenings(openings + 1);
    }
  }

  return (
    <dialog ref={modal.ref} {...modal.props} aria-labelledby={headlineId} className={styles.dialog}>
      <TimePicker
        key={openings}
        {...rest}
        value={draft}
        onValueChange={setDraft}
        labels={labels}
        headlineId={headlineId}
        className={cx(styles.surface, className)}
        data-elevated=""
        actions={
          <>
            <Button variant="text" onClick={() => onOpenChange?.(false)}>
              {labels.cancel}
            </Button>
            <Button
              variant="text"
              onClick={() => {
                onConfirm?.(draft);
                onOpenChange?.(false);
              }}
            >
              {labels.confirm}
            </Button>
          </>
        }
      />
    </dialog>
  );
}
