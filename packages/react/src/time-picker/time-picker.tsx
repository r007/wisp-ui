'use client';

import {
  type ChangeEvent,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from 'react';
import { cx } from '../foundation/cx.js';
import { useMergedRef } from '../foundation/merge-refs.js';
import { StateLayer } from '../foundation/state-layer.js';
import { useControllableState } from '../foundation/use-controllable-state.js';
import { useMediaQuery } from '../foundation/use-media-query.js';
import { useStateLayer } from '../foundation/use-state-layer.js';
import { IconButton } from '../icon-button/icon-button.js';
import { TimeDial } from './time-dial.js';
import styles from './time-picker.module.css';
import tokens from './time-picker.tokens.generated.module.css';
import {
  type DayPeriod,
  formatHour,
  formatMinute,
  type HourCycle,
  hourFrom12,
  hourOf12,
  periodOf,
  type TimeUnit,
  type TimeValue,
} from './time-value.js';

export type TimePickerMode = 'dial' | 'input';
export type TimePickerOrientation = 'auto' | 'vertical' | 'horizontal';

/** Every piece of text the picker shows or announces, for translating it. */
export interface TimePickerLabels {
  /** The headline over the clock. */
  headline: string;
  /** The headline over the text fields. */
  inputHeadline: string;
  /** Names the hour: the dial, its button and the field. */
  hour: string;
  /** Names the minute. */
  minute: string;
  am: string;
  pm: string;
  /** Names the AM and PM choice. */
  period: string;
  /** The button that switches to the text fields. */
  useKeyboard: string;
  /** The button that switches back to the clock. */
  useClock: string;
  /** The dialog's cancel button. */
  cancel: string;
  /** The dialog's confirm button. */
  confirm: string;
}

export const DEFAULT_LABELS: TimePickerLabels = {
  headline: 'Select time',
  inputHeadline: 'Enter time',
  hour: 'Hour',
  minute: 'Minute',
  am: 'AM',
  pm: 'PM',
  period: 'AM or PM',
  useKeyboard: 'Switch to text input',
  useClock: 'Switch to clock',
  cancel: 'Cancel',
  confirm: 'OK',
};

export const NOON: TimeValue = { hours: 12, minutes: 0 };

const KeyboardGlyph = () => (
  <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
    <path d="M140-200q-24 0-42-18.5T80-260v-440q0-24 18-42t42-18h680q24 0 42 18t18 42v440q0 23-18 41.5T820-200H140Zm0-60h680v-440H140v440Zm160-65h360v-60H300v60Zm-97-125h60v-60h-60v60Zm124 0h60v-60h-60v60Zm123 0h60v-60h-60v60Zm124 0h60v-60h-60v60Zm123 0h60v-60h-60v60ZM203-575h60v-60h-60v60Zm124 0h60v-60h-60v60Zm123 0h60v-60h-60v60Zm124 0h60v-60h-60v60Zm123 0h60v-60h-60v60ZM140-260v-440 440Z" />
  </svg>
);

const ClockGlyph = () => (
  <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
    <path d="m627-287 45-45-159-160v-201h-60v225l174 181ZM480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-82 31.5-155t86-127.5Q252-817 325-848.5T480-880q82 0 155 31.5t127.5 86Q817-708 848.5-635T880-480q0 82-31.5 155t-86 127.5Q708-143 635-111.5T480-80Zm0-400Zm0 340q140 0 240-100t100-240q0-140-100-240T480-820q-140 0-240 100T140-480q0 140 100 240t240 100Z" />
  </svg>
);

export interface TimePickerProps
  extends Omit<ComponentPropsWithRef<'div'>, 'defaultValue' | 'onChange' | 'role' | 'children'> {
  /** The time, on a 24-hour clock. Controlled when defined. */
  value?: TimeValue;
  /** @default 12:00 */
  defaultValue?: TimeValue;
  /** Called with each change: a turn of the dial, a typed digit, a press of AM or PM. */
  onValueChange?: (value: TimeValue) => void;
  /** Whether it shows AM and PM, or the hours 0 to 23. @default 12 */
  hourCycle?: HourCycle;
  /** A clock to turn, or text fields to type in. Controlled when defined. @default 'dial' */
  mode?: TimePickerMode;
  defaultMode?: TimePickerMode;
  onModeChange?: (mode: TimePickerMode) => void;
  /** Shows the button that switches between the clock and the text fields. @default true */
  showModeToggle?: boolean;
  /** Replaces the headline, which is "Select time" or "Enter time". */
  headline?: ReactNode;
  /**
   * `horizontal` puts the clock beside the time, for a short, wide window; `vertical` stacks them.
   * `auto` is `horizontal` when the window is wider than it is tall and under 540px high.
   * @default 'auto'
   */
  orientation?: TimePickerOrientation;
  /** Replaces any of the texts, e.g. to translate them. */
  labels?: Partial<TimePickerLabels>;
  /** Buttons at the end of the bottom row. */
  actions?: ReactNode;
  /** The id of the headline, for a container that is named by it. */
  headlineId?: string;
}

/**
 * A time picker: a clock to turn (hours, then minutes) or fields to type in, with AM and PM on a
 * 12-hour clock. It is the surface only; `TimePickerDialog` puts it in a modal with Cancel and
 * OK. The value is a 24-hour `{ hours, minutes }` whatever is shown:
 *
 * ```tsx
 * <TimePicker defaultValue={{ hours: 9, minutes: 30 }} onValueChange={setTime} />
 * ```
 *
 * The clock is a slider for the keyboard (arrow keys step, Enter moves on to the minutes) and for
 * assistive technology; the text fields are the other way in.
 */
export function TimePicker({
  value: valueProp,
  defaultValue = NOON,
  onValueChange,
  hourCycle = 12,
  mode: modeProp,
  defaultMode = 'dial',
  onModeChange,
  showModeToggle = true,
  headline,
  orientation = 'auto',
  labels: labelsProp,
  actions,
  headlineId,
  className,
  ref,
  ...rest
}: TimePickerProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const [value, setValue] = useControllableState<TimeValue>({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  const [mode, setMode] = useControllableState<TimePickerMode>({
    value: modeProp,
    defaultValue: defaultMode,
    onChange: onModeChange,
  });
  /** Which of the two the clock is turning. */
  const [unit, setUnit] = useState<TimeUnit>('hours');
  const ownHeadlineId = useId();
  const id = headlineId ?? ownHeadlineId;
  const landscape = useMediaQuery('(orientation: landscape) and (max-height: 540px)');
  const layout = orientation === 'auto' ? (landscape ? 'horizontal' : 'vertical') : orientation;
  const input = mode === 'input';
  const period = periodOf(value.hours);

  const setPeriod = (next: DayPeriod) => {
    if (next !== period) setValue({ ...value, hours: hourFrom12(hourOf12(value.hours), next) });
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: a <fieldset> brings a border, padding and a minimum width that a drawn surface would have to undo; role="group" has the same meaning.
    <div
      {...rest}
      ref={ref}
      role="group"
      aria-labelledby={id}
      className={cx(styles.root, tokens.root, input && tokens.input, className)}
      data-layout={layout}
      data-mode={mode}
      data-cycle={hourCycle}
    >
      <div id={id} className={styles.headline}>
        {headline ?? (input ? labels.inputHeadline : labels.headline)}
      </div>

      <div className={styles.time}>
        <div className={styles.units}>
          {input ? (
            <TimeFields
              value={value}
              hourCycle={hourCycle}
              labels={labels}
              onChange={setValue}
              key={hourCycle}
            />
          ) : (
            <>
              <UnitButton
                selected={unit === 'hours'}
                label={`${labels.hour} ${formatHour(value.hours, hourCycle)}`}
                onPress={() => setUnit('hours')}
              >
                {formatHour(value.hours, hourCycle)}
              </UnitButton>
              <span className={styles.separator} aria-hidden="true">
                :
              </span>
              <UnitButton
                selected={unit === 'minutes'}
                label={`${labels.minute} ${formatMinute(value.minutes)}`}
                onPress={() => setUnit('minutes')}
              >
                {formatMinute(value.minutes)}
              </UnitButton>
            </>
          )}
        </div>
        {hourCycle === 12 ? (
          <PeriodSelector period={period} labels={labels} onChange={setPeriod} />
        ) : null}
      </div>

      {input ? null : (
        <TimeDial
          unit={unit}
          value={value}
          hourCycle={hourCycle}
          label={unit === 'hours' ? labels.hour : labels.minute}
          onChange={setValue}
          onHourChosen={() => setUnit('minutes')}
        />
      )}

      <div className={styles.footer}>
        {showModeToggle ? (
          <IconButton
            aria-label={input ? labels.useClock : labels.useKeyboard}
            onClick={() => {
              setMode(input ? 'dial' : 'input');
              setUnit('hours');
            }}
          >
            {input ? <ClockGlyph /> : <KeyboardGlyph />}
          </IconButton>
        ) : null}
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </div>
  );
}

/** The hour or minute as a large button, which says what the clock turns. */
function UnitButton({
  selected,
  label,
  onPress,
  children,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  const { controlRef, surfaceRef } = useStateLayer<HTMLButtonElement>();
  return (
    <button
      ref={controlRef}
      type="button"
      className={styles.unit}
      aria-label={label}
      aria-pressed={selected}
      data-selected={selected ? '' : undefined}
      onClick={onPress}
    >
      <StateLayer ref={surfaceRef} />
      <span aria-hidden="true">{children}</span>
    </button>
  );
}

/** AM and PM, as two native radios in one outlined box. */
function PeriodSelector({
  period,
  labels,
  onChange,
}: {
  period: DayPeriod;
  labels: TimePickerLabels;
  onChange: (period: DayPeriod) => void;
}) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={labels.period} className={styles.period}>
      {(['am', 'pm'] as const).map((option) => (
        <PeriodOption
          key={option}
          name={name}
          checked={period === option}
          onSelect={() => onChange(option)}
        >
          {labels[option]}
        </PeriodOption>
      ))}
    </div>
  );
}

function PeriodOption({
  name,
  checked,
  onSelect,
  children,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  const { controlRef, surfaceRef } = useStateLayer<HTMLInputElement>();
  return (
    <label className={styles.option} data-selected={checked ? '' : undefined}>
      <input
        ref={controlRef}
        type="radio"
        name={name}
        className={styles.optionInput}
        checked={checked}
        onChange={onSelect}
      />
      <StateLayer ref={surfaceRef} />
      <span className={styles.optionLabel}>{children}</span>
    </label>
  );
}

/** Whether `text` is a whole hour or minute the clock allows. */
function parse(unit: TimeUnit, text: string, cycle: HourCycle): number | undefined {
  if (!/^\d{1,2}$/.test(text)) return undefined;
  const n = Number(text);
  if (unit === 'minutes') return n <= 59 ? n : undefined;
  return cycle === 12 ? (n >= 1 && n <= 12 ? n : undefined) : n <= 23 ? n : undefined;
}

/** The hour and minute as two text fields, for typing a time. */
function TimeFields({
  value,
  hourCycle,
  labels,
  onChange,
}: {
  value: TimeValue;
  hourCycle: HourCycle;
  labels: TimePickerLabels;
  onChange: (value: TimeValue) => void;
}) {
  const minuteField = useRef<HTMLInputElement>(null);
  return (
    <>
      <TimeField
        unit="hours"
        label={labels.hour}
        value={value}
        hourCycle={hourCycle}
        onChange={onChange}
        onComplete={() => minuteField.current?.focus()}
      />
      <span className={styles.separator} aria-hidden="true">
        :
      </span>
      <TimeField
        unit="minutes"
        label={labels.minute}
        value={value}
        hourCycle={hourCycle}
        onChange={onChange}
        inputRef={minuteField}
      />
    </>
  );
}

function TimeField({
  unit,
  label,
  value,
  hourCycle,
  onChange,
  onComplete,
  inputRef,
}: {
  unit: TimeUnit;
  label: string;
  value: TimeValue;
  hourCycle: HourCycle;
  onChange: (value: TimeValue) => void;
  /** The field has what it needs: the picker moves on to the next. */
  onComplete?: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const id = useId();
  const own = useRef<HTMLInputElement>(null);
  const mergedRef = useMergedRef(own, inputRef);
  /** What is typed while the field holds focus; it shows the value again once it does not. */
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const shown = unit === 'hours' ? formatHour(value.hours, hourCycle) : formatMinute(value.minutes);
  const invalid = draft !== undefined && parse(unit, draft, hourCycle) === undefined;

  /** Sets the unit, keeping the period of a 12-hour clock. */
  const commit = (n: number) => {
    if (unit === 'minutes') onChange({ ...value, minutes: n });
    else if (hourCycle === 12) onChange({ ...value, hours: hourFrom12(n, periodOf(value.hours)) });
    else onChange({ ...value, hours: n });
  };

  const step = (by: number) => {
    const size = unit === 'minutes' ? 60 : hourCycle === 12 ? 12 : 24;
    const base =
      unit === 'minutes' ? value.minutes : hourCycle === 12 ? hourOf12(value.hours) : value.hours;
    // A 12-hour clock counts 1 to 12, the others 0 up.
    const first = unit === 'hours' && hourCycle === 12 ? 1 : 0;
    commit(((base - first + by + size) % size) + first);
    setDraft(undefined);
  };

  return (
    <div className={styles.field}>
      <input
        ref={mergedRef}
        id={id}
        className={styles.fieldInput}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={2}
        value={draft ?? shown}
        aria-invalid={invalid || undefined}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={() => setDraft(undefined)}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const text = event.currentTarget.value.replace(/\D/g, '').slice(0, 2);
          setDraft(text);
          const n = parse(unit, text, hourCycle);
          if (n === undefined) return;
          commit(n);
          // Two digits, or one that cannot start a larger hour, are the whole of an hour.
          const firstLimit = hourCycle === 12 ? 1 : 2;
          if (unit === 'hours' && (text.length === 2 || n > firstLimit)) onComplete?.();
        }}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            step(event.key === 'ArrowUp' ? 1 : -1);
          }
        }}
      />
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
      </label>
    </div>
  );
}
