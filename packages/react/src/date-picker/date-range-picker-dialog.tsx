'use client';

import { type ReactNode, useId, useMemo, useState } from 'react';
import { Button } from '../button/button.js';
import { cx } from '../foundation/cx.js';
import { useControllableState } from '../foundation/use-controllable-state.js';
import { useModalDialog } from '../foundation/use-modal-dialog.js';
import { IconButton } from '../icon-button/icon-button.js';
import { TextField } from '../text-field/text-field.js';
import tokens from './date-picker.tokens.generated.module.css';
import type { DatePickerMode } from './date-picker-dialog.js';
import type { DateRangePickerProps } from './date-range-picker.js';
import styles from './date-range-picker-dialog.module.css';
import { compareDays, dateFormat, formatDigits, formatter, parseDate } from './date-utils.js';
import { type DateRange, EMPTY_RANGE, RangeCalendar } from './range-calendar.js';

/** Every piece of text the dialog shows or announces, for translating it. */
export interface DateRangePickerLabels {
  /** The dialog's name. */
  selectDates: string;
  /** The headline before a start is chosen, and the label of the first field. */
  startDate: string;
  /** The headline before an end is chosen, and the label of the second field. */
  endDate: string;
  close: string;
  save: string;
  /** The button that switches to the text fields. */
  useKeyboard: string;
  /** The button that switches back to the calendar. */
  useCalendar: string;
  /** Under a field when what was typed is not a date in the locale's format. */
  invalidFormat: string;
  /** Under a field when the date is before `min` or after `max`. */
  outOfRange: string;
  /** Under a field when the date is one that cannot be chosen. */
  unavailable: string;
  /** Under the end field when it is before the start. */
  endBeforeStart: string;
}

const DEFAULT_LABELS: DateRangePickerLabels = {
  selectDates: 'Select dates',
  startDate: 'Start date',
  endDate: 'End date',
  close: 'Close',
  save: 'Save',
  useKeyboard: 'Switch to text input',
  useCalendar: 'Switch to calendar',
  invalidFormat: 'Invalid format.',
  outOfRange: 'Out of range.',
  unavailable: 'This date is not available.',
  endBeforeStart: 'The end must not be before the start.',
};

const CloseGlyph = () => (
  <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
    <path d="m249-207-42-42 231-231-231-231 42-42 231 231 231-231 42 42-231 231 231 231-42 42-231-231-231 231Z" />
  </svg>
);

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

export interface DateRangePickerDialogProps
  extends Pick<
    DateRangePickerProps,
    'min' | 'max' | 'isDateDisabled' | 'today' | 'locale' | 'firstDayOfWeek'
  > {
  /** Whether the dialog is shown. */
  open: boolean;
  /** Called when the user dismisses it: Close, Escape, and after Save. */
  onOpenChange?: (open: boolean) => void;
  /** The range the dialog starts from each time it opens. */
  value?: DateRange;
  /** Called with the chosen range when Save is pressed. */
  onConfirm?: (range: { start: Date; end: Date }) => void;
  /** The calendar, or text fields to type the dates in. Controlled when defined. @default 'calendar' */
  mode?: DatePickerMode;
  defaultMode?: DatePickerMode;
  onModeChange?: (mode: DatePickerMode) => void;
  /** Shows the button that switches between the calendar and the fields. @default true */
  showModeToggle?: boolean;
  /** Replaces the headline, which says the range chosen so far. */
  headline?: ReactNode;
  /** Replaces any of the texts, e.g. to translate them. */
  labels?: Partial<DateRangePickerLabels>;
}

/**
 * A date range picker in a modal that fills the window: a close button and Save in the header
 * over a headline that says the range, and months to scroll through, or two text fields to type
 * the dates in. The range is only reported, by `onConfirm`, when Save is pressed (it needs both
 * ends), and the dialog starts afresh from `value` each time it opens.
 *
 * ```tsx
 * <DateRangePickerDialog open={open} onOpenChange={setOpen} value={range} onConfirm={setRange} />
 * ```
 */
export function DateRangePickerDialog({
  open,
  onOpenChange,
  value = EMPTY_RANGE,
  onConfirm,
  labels: labelsProp,
  ...rest
}: DateRangePickerDialogProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const modal = useModalDialog({ open, onOpenChange });
  const [draft, setDraft] = useState<DateRange>(value);
  // Each opening starts afresh: from the value it is given, on the calendar, at its month.
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
    <dialog
      ref={modal.ref}
      {...modal.props}
      aria-label={labels.selectDates}
      className={styles.dialog}
    >
      <DialogSurface
        key={openings}
        {...rest}
        labels={labels}
        draft={draft}
        onDraftChange={setDraft}
        onClose={() => onOpenChange?.(false)}
        onSave={(range) => {
          onConfirm?.(range);
          onOpenChange?.(false);
        }}
      />
    </dialog>
  );
}

interface DialogSurfaceProps
  extends Omit<
    DateRangePickerDialogProps,
    'open' | 'onOpenChange' | 'value' | 'onConfirm' | 'labels'
  > {
  labels: DateRangePickerLabels;
  draft: DateRange;
  onDraftChange: (range: DateRange) => void;
  onClose: () => void;
  onSave: (range: { start: Date; end: Date }) => void;
}

/** The dialog's contents: new each time it opens, so the mode and the scroll start afresh. */
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
  labels,
  draft,
  onDraftChange,
  onClose,
  onSave,
}: DialogSurfaceProps) {
  const [mode, setMode] = useControllableState<DatePickerMode>({
    value: modeProp,
    defaultValue: defaultMode,
    onChange: onModeChange,
  });
  const input = mode === 'input';
  const format = useMemo(() => dateFormat(locale), [locale]);
  const fieldIds = { start: useId(), end: useId() };
  /** What each field holds, kept apart from the range so a half-typed date is not lost. */
  const [text, setText] = useState({
    start: draft.start ? formatDigits(draft.start, locale) : '',
    end: draft.end ? formatDigits(draft.end, locale) : '',
  });
  const [errors, setErrors] = useState<{ start?: string; end?: string }>({});

  /** Why a typed date cannot be used, if it cannot. */
  const check = (date: Date) => {
    if ((min && compareDays(date, min) < 0) || (max && compareDays(date, max) > 0))
      return labels.outOfRange;
    return isDateDisabled?.(date) ? labels.unavailable : undefined;
  };

  /** Reads both fields afresh, so each error and the range follow what is typed. */
  const read = (next: { start: string; end: string }) => {
    const found: { start?: string; end?: string } = {};
    const dates: { start: Date | null; end: Date | null } = { start: null, end: null };
    for (const side of ['start', 'end'] as const) {
      const value = next[side].trim();
      if (value === '') continue;
      const date = parseDate(value, format.order);
      if (!date) found[side] = labels.invalidFormat;
      else {
        const problem = check(date);
        if (problem) found[side] = problem;
        else dates[side] = date;
      }
    }
    if (dates.start && dates.end && compareDays(dates.end, dates.start) < 0) {
      found.end = labels.endBeforeStart;
      dates.end = null;
    }
    setErrors(found);
    onDraftChange(dates);
  };

  const type = (side: 'start' | 'end', value: string) => {
    const next = { ...text, [side]: value };
    setText(next);
    read(next);
  };

  const range = (() => {
    const { start, end } = draft;
    const same = (a: Date) =>
      formatter(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(a);
    if (start && end) {
      return formatter(locale, { month: 'short', day: 'numeric', year: 'numeric' }).formatRange(
        start,
        end,
      );
    }
    return `${start ? same(start) : labels.startDate} – ${labels.endDate}`;
  })();

  const complete = draft.start !== null && draft.end !== null;

  return (
    <div className={cx(styles.surface, tokens.root, tokens.modal, tokens.range)} data-mode={mode}>
      <div className={styles.header}>
        <div className={styles.bar}>
          <IconButton aria-label={labels.close} onClick={onClose}>
            <CloseGlyph />
          </IconButton>
          <div className={styles.barEnd}>
            {showModeToggle ? (
              <IconButton
                aria-label={input ? labels.useCalendar : labels.useKeyboard}
                onClick={() => {
                  if (!input)
                    setText({
                      start: draft.start ? formatDigits(draft.start, locale) : '',
                      end: draft.end ? formatDigits(draft.end, locale) : '',
                    });
                  setErrors({});
                  setMode(input ? 'calendar' : 'input');
                }}
              >
                {input ? <CalendarGlyph /> : <EditGlyph />}
              </IconButton>
            ) : null}
            <Button
              variant="text"
              disabled={!complete}
              onClick={() => {
                const { start, end } = draft;
                if (start && end) onSave({ start, end });
              }}
            >
              {labels.save}
            </Button>
          </div>
        </div>
        <div className={styles.headline}>{headline ?? range}</div>
      </div>

      {input ? (
        <div className={styles.entry}>
          {(['start', 'end'] as const).map((side) => (
            <TextField
              key={side}
              id={fieldIds[side]}
              variant="outlined"
              label={side === 'start' ? labels.startDate : labels.endDate}
              placeholder={format.hint}
              supportingText={format.hint}
              error={errors[side] !== undefined}
              errorText={errors[side]}
              value={text[side]}
              inputMode="numeric"
              autoComplete="off"
              onValueChange={(value) => type(side, value)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.calendar}>
          <RangeCalendar
            value={draft}
            onChange={onDraftChange}
            min={min}
            max={max}
            isDateDisabled={isDateDisabled}
            today={today}
            locale={locale}
            firstDayOfWeek={firstDayOfWeek}
          />
        </div>
      )}
    </div>
  );
}
