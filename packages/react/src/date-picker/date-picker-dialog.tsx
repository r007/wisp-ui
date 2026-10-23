'use client';

import { type ReactNode, useId, useMemo, useState } from 'react';
import { Button } from '../button/button.js';
import { useControllableState } from '../foundation/use-controllable-state.js';
import { useModalDialog } from '../foundation/use-modal-dialog.js';
import { IconButton } from '../icon-button/icon-button.js';
import { TextField } from '../text-field/text-field.js';
import { Calendar, type CalendarLabels, DEFAULT_CALENDAR_LABELS } from './calendar.js';
import type { DatePickerProps } from './date-picker.js';
import tokens from './date-picker.tokens.generated.module.css';
import styles from './date-picker-dialog.module.css';
import {
  clampDate,
  compareDays,
  dateFormat,
  formatDigits,
  formatter,
  parseDate,
} from './date-utils.js';

export type DatePickerMode = 'calendar' | 'input';

/** Every piece of text the dialog shows or announces, for translating it. */
export interface DatePickerLabels extends CalendarLabels {
  /** The small text over the headline, and the dialog's name. */
  selectDate: string;
  /** The headline in text-entry mode. */
  enterDate: string;
  /** Names the text field. */
  date: string;
  /** The button that switches to the text field. */
  useKeyboard: string;
  /** The button that switches back to the calendar. */
  useCalendar: string;
  /** Under the field when what was typed is not a date in the locale's format. */
  invalidFormat: string;
  /** Under the field when the date is before `min` or after `max`. */
  outOfRange: string;
  /** Under the field when the date is one that cannot be chosen. */
  unavailable: string;
  cancel: string;
  confirm: string;
}

const DEFAULT_LABELS: DatePickerLabels = {
  ...DEFAULT_CALENDAR_LABELS,
  selectDate: 'Select date',
  enterDate: 'Enter date',
  date: 'Date',
  useKeyboard: 'Switch to text input',
  useCalendar: 'Switch to calendar',
  invalidFormat: 'Invalid format.',
  outOfRange: 'Out of range.',
  unavailable: 'This date is not available.',
  cancel: 'Cancel',
  confirm: 'OK',
};

const EditGlyph = () => (
  <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
    <path d="M180-180h44l472-471-44-44-472 471v44Zm-60 60v-128l575-574q8-8 19-12.5t23-4.5q11 0 22 4.5t20 12.5l44 44q9 9 13 20t4 22q0 11-4.5 22.5T823-694L248-120H120Zm659-617-41-41 41 41Zm-105 64-22-22 44 44-22-22Z" />
  </svg>
);

const CalendarGlyph = () => (
  <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
    <path d="M180-80q-24 0-42-18t-18-42v-620q0-24 18-42t42-18h65v-60h65v60h340v-60h65v60h65q24 0 42 18t18 42v620q0 24-18 42t-42 18H180Zm0-60h600v-430H180v430Zm0-490h600v-130H180v130Zm0 0v-130 130Zm300 230q-17 0-28.5-11.5T440-440q0-17 11.5-28.5T480-480q17 0 28.5 11.5T520-440q0 17-11.5 28.5T480-400Zm-188.5-11.5Q280-423 280-440t11.5-28.5Q303-480 320-480t28.5 11.5Q360-457 360-440t-11.5 28.5Q337-400 320-400t-28.5-11.5ZM640-400q-17 0-28.5-11.5T600-440q0-17 11.5-28.5T640-480q17 0 28.5 11.5T680-440q0 17-11.5 28.5T640-400ZM480-240q-17 0-28.5-11.5T440-280q0-17 11.5-28.5T480-320q17 0 28.5 11.5T520-280q0 17-11.5 28.5T480-240Zm-188.5-11.5Q280-263 280-280t11.5-28.5Q303-320 320-320t28.5 11.5Q360-297 360-280t-11.5 28.5Q337-240 320-240t-28.5-11.5ZM640-240q-17 0-28.5-11.5T600-280q0-17 11.5-28.5T640-320q17 0 28.5 11.5T680-280q0 17-11.5 28.5T640-240Z" />
  </svg>
);

export interface DatePickerDialogProps
  extends Pick<
    DatePickerProps,
    'min' | 'max' | 'isDateDisabled' | 'today' | 'locale' | 'firstDayOfWeek'
  > {
  /** Whether the dialog is shown. */
  open: boolean;
  /** Called when the user dismisses it: Cancel, Escape, the scrim, and after OK. */
  onOpenChange?: (open: boolean) => void;
  /** The day the dialog starts from each time it opens, or `null` for none. */
  value?: Date | null;
  /** Called with the chosen day when OK is pressed. */
  onConfirm?: (date: Date) => void;
  /** The calendar, or a text field to type the date in. Controlled when defined. @default 'calendar' */
  mode?: DatePickerMode;
  defaultMode?: DatePickerMode;
  onModeChange?: (mode: DatePickerMode) => void;
  /** Shows the button that switches between the calendar and the text field. @default true */
  showModeToggle?: boolean;
  /** Replaces the headline, which is the chosen day, or "Select date" while there is none. */
  headline?: ReactNode;
  /** Replaces any of the texts, e.g. to translate them. */
  labels?: Partial<DatePickerLabels>;
}

/**
 * A date picker in a modal dialog: a headline that says the chosen day, a calendar or a text
 * field to type the date in, and Cancel and OK. The day is only reported, by `onConfirm`, when
 * OK is pressed, and the dialog starts afresh from `value` each time it opens.
 *
 * ```tsx
 * <DatePickerDialog open={open} onOpenChange={setOpen} value={date} onConfirm={setDate} />
 * ```
 */
export function DatePickerDialog({
  open,
  onOpenChange,
  value = null,
  onConfirm,
  labels: labelsProp,
  ...rest
}: DatePickerDialogProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const nameId = useId();
  const modal = useModalDialog({ open, onOpenChange });
  const [draft, setDraft] = useState<Date | null>(value);
  // Each opening starts afresh: from the value it is given, on the calendar, on the month of it.
  // Adjusting state while rendering, not in an effect, so the contents are new in the very commit
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
    <dialog ref={modal.ref} {...modal.props} aria-labelledby={nameId} className={styles.dialog}>
      <DialogSurface
        key={openings}
        {...rest}
        nameId={nameId}
        labels={labels}
        draft={draft}
        onDraftChange={setDraft}
        onCancel={() => onOpenChange?.(false)}
        onConfirm={(date) => {
          onConfirm?.(date);
          onOpenChange?.(false);
        }}
      />
    </dialog>
  );
}

interface DialogSurfaceProps
  extends Omit<DatePickerDialogProps, 'open' | 'onOpenChange' | 'value' | 'onConfirm' | 'labels'> {
  nameId: string;
  labels: DatePickerLabels;
  draft: Date | null;
  onDraftChange: (date: Date | null) => void;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
}

/** The dialog's contents: new each time it opens, so the mode and the month start afresh. */
function DialogSurface({
  min,
  max,
  isDateDisabled,
  today,
  locale,
  firstDayOfWeek,
  mode: modeProp,
  defaultMode = 'calendar',
  onModeChange,
  showModeToggle = true,
  headline,
  nameId,
  labels,
  draft,
  onDraftChange,
  onCancel,
  onConfirm,
}: DialogSurfaceProps) {
  const [mode, setMode] = useControllableState<DatePickerMode>({
    value: modeProp,
    defaultValue: defaultMode,
    onChange: onModeChange,
  });
  const input = mode === 'input';
  const format = useMemo(() => dateFormat(locale), [locale]);
  /** What the text field holds, kept apart from the day so a half-typed date is not lost. */
  const [text, setText] = useState(() => (draft ? formatDigits(draft, locale) : ''));
  const [error, setError] = useState<string | undefined>(undefined);

  const check = (date: Date) => {
    if ((min && compareDays(date, min) < 0) || (max && compareDays(date, max) > 0))
      return labels.outOfRange;
    if (isDateDisabled?.(date)) return labels.unavailable;
    return undefined;
  };

  const type = (next: string) => {
    setText(next);
    if (next.trim() === '') {
      setError(undefined);
      onDraftChange(null);
      return;
    }
    const date = parseDate(next, format.order);
    if (!date) {
      setError(labels.invalidFormat);
      onDraftChange(null);
      return;
    }
    const problem = check(date);
    setError(problem);
    onDraftChange(problem ? null : date);
  };

  const headlineText =
    headline ??
    (input
      ? labels.enterDate
      : draft
        ? formatter(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(draft)
        : labels.selectDate);

  return (
    <div
      className={`${styles.surface} ${tokens.root} ${tokens.modal} ${input ? tokens.input : ''}`}
      data-mode={mode}
    >
      <div className={styles.header}>
        <div className={styles.supporting} id={nameId}>
          {labels.selectDate}
        </div>
        <div className={styles.headlineRow}>
          <div className={styles.headline}>{headlineText}</div>
          {showModeToggle ? (
            <IconButton
              aria-label={input ? labels.useCalendar : labels.useKeyboard}
              onClick={() => {
                if (input) {
                  // Back to the calendar on what was typed, if it was a date.
                  setError(undefined);
                } else {
                  setText(draft ? formatDigits(draft, locale) : '');
                  setError(undefined);
                }
                setMode(input ? 'calendar' : 'input');
              }}
            >
              {input ? <CalendarGlyph /> : <EditGlyph />}
            </IconButton>
          ) : null}
        </div>
      </div>

      {input ? (
        <div className={styles.entry}>
          <TextField
            variant="outlined"
            label={labels.date}
            placeholder={format.hint}
            supportingText={format.hint}
            error={error !== undefined}
            errorText={error}
            value={text}
            inputMode="numeric"
            autoComplete="off"
            onValueChange={type}
          />
        </div>
      ) : (
        <Calendar
          value={draft}
          onSelect={onDraftChange}
          min={min}
          max={max}
          isDateDisabled={isDateDisabled}
          today={today}
          locale={locale}
          firstDayOfWeek={firstDayOfWeek}
          variant="modal"
          labels={labels}
          defaultMonth={draft ? clampDate(draft, min, max) : undefined}
        />
      )}

      <div className={styles.actions}>
        <Button variant="text" onClick={onCancel}>
          {labels.cancel}
        </Button>
        <Button
          variant="text"
          disabled={!draft || error !== undefined}
          onClick={() => draft && onConfirm(draft)}
        >
          {labels.confirm}
        </Button>
      </div>
    </div>
  );
}
