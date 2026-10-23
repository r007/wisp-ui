'use client';

import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import styles from './time-picker.module.css';
import { type HourCycle, hourOf12, type TimeUnit, type TimeValue } from './time-value.js';

/** How far in from the dial's edge the labels of the outer ring sit, and the gap between rings. */
const DIAL_PADDING = 28;
const RING_STEP = 28;

/** The shortest way round from one angle to another, in degrees (-180 to 180). */
const shortest = (from: number, to: number) => ((((to - from) % 360) + 540) % 360) - 180;

const pad2 = (n: number) => String(n).padStart(2, '0');

export interface TimeDialProps {
  unit: TimeUnit;
  value: TimeValue;
  hourCycle: HourCycle;
  /** Called as the pointer or keys change the value. */
  onChange: (value: TimeValue) => void;
  /** The pointer chose an hour and was lifted: the picker moves on to the minutes. */
  onHourChosen: () => void;
  /** Names the dial for assistive technology: "Hour" or "Minute". */
  label: string;
}

/** One label on the ring: where it is (0 to 11, clockwise from the top), what it says. */
interface DialLabel {
  slot: number;
  text: string;
  inner: boolean;
  selected: boolean;
}

function buildLabels({
  unit,
  value,
  hourCycle,
}: Pick<TimeDialProps, 'unit' | 'value' | 'hourCycle'>) {
  const labels: DialLabel[] = [];
  for (let slot = 0; slot < 12; slot++) {
    if (unit === 'minutes') {
      labels.push({
        slot,
        text: pad2(slot * 5),
        inner: false,
        selected: value.minutes === slot * 5,
      });
    } else if (hourCycle === 12) {
      const hour = slot === 0 ? 12 : slot;
      labels.push({
        slot,
        text: String(hour),
        inner: false,
        selected: hourOf12(value.hours) === hour,
      });
    } else {
      // The outer ring is 0 to 11 (0 as "00"), the inner one 12 to 23.
      labels.push({ slot, text: pad2(slot), inner: false, selected: value.hours === slot });
      labels.push({
        slot,
        text: String(slot + 12),
        inner: true,
        selected: value.hours === slot + 12,
      });
    }
  }
  return labels;
}

/** The angle of the handle for a value, in degrees clockwise from the top, and which ring. */
function handleFor({
  unit,
  value,
  hourCycle,
}: Pick<TimeDialProps, 'unit' | 'value' | 'hourCycle'>) {
  if (unit === 'minutes') return { angle: value.minutes * 6, inner: false };
  return { angle: (value.hours % 12) * 30, inner: hourCycle === 24 && value.hours >= 12 };
}

/**
 * The clock face: a ring of numbers with a handle that follows the pointer. It is a slider for
 * the keyboard and assistive technology (arrow keys step by one), and a dial for a pointer:
 * pressing or dragging picks the nearest hour or minute, an hour lifts on to the minutes, and
 * minutes settle on the nearest five when the pointer is lifted.
 */
export function TimeDial({ unit, value, hourCycle, onChange, onHourChosen, label }: TimeDialProps) {
  const dial = useRef<HTMLDivElement>(null);
  const dragging = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const target = handleFor({ unit, value, hourCycle });

  // The handle turns the short way round (11 to 12 is a step, not a lap), so its angle is kept
  // as a running total rather than 0 to 360.
  const [rotation, setRotation] = useState(target.angle);
  useLayoutEffect(() => {
    setRotation((current) => current + shortest(current, target.angle));
  }, [target.angle]);

  const labels = buildLabels({ unit, value, hourCycle });
  const onLabel = labels.some((l) => l.selected);

  /** The value under a pointer. `snap` rounds minutes to five, as when it is lifted. */
  const valueAt = (event: PointerEvent<HTMLDivElement>, snap: boolean): TimeValue => {
    const box = (dial.current as HTMLDivElement).getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    // Clockwise from the top.
    const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    if (unit === 'minutes') {
      let minutes = Math.round(angle / 6) % 60;
      if (snap) minutes = (Math.round(minutes / 5) * 5) % 60;
      return { ...value, minutes };
    }
    const slot = Math.round(angle / 30) % 12;
    if (hourCycle === 12) {
      return { ...value, hours: slot + (value.hours >= 12 ? 12 : 0) };
    }
    // The inner ring starts halfway between the two rings' labels.
    const outerRadius = box.width / 2 - DIAL_PADDING;
    const inner = Math.hypot(dx, dy) < outerRadius - RING_STEP / 2;
    return { ...value, hours: slot + (inner ? 12 : 0) };
  };

  const move = (event: PointerEvent<HTMLDivElement>, snap = false) => {
    const next = valueAt(event, snap);
    if (next.hours !== value.hours || next.minutes !== value.minutes) onChange(next);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    dial.current?.focus({ preventScroll: true });
    dragging.current = event.pointerId;
    setIsDragging(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A pointer that has already gone has nothing to capture.
    }
    move(event);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current === event.pointerId) move(event);
  };

  const finish = (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    if (dragging.current !== event.pointerId) return;
    dragging.current = null;
    setIsDragging(false);
    if (cancelled) return;
    if (unit === 'minutes') move(event, true);
    else {
      move(event);
      onHourChosen();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
    if (unit === 'hours' && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onHourChosen();
      return;
    }
    let next: TimeValue | undefined;
    if (unit === 'minutes') {
      if (step) next = { ...value, minutes: (value.minutes + step + 60) % 60 };
      else if (event.key === 'Home') next = { ...value, minutes: 0 };
      else if (event.key === 'End') next = { ...value, minutes: 59 };
    } else if (hourCycle === 12) {
      // Round the twelve hours of the period the time is in, without changing the period.
      const period = value.hours >= 12 ? 12 : 0;
      const inPeriod = value.hours % 12;
      if (step) next = { ...value, hours: period + ((inPeriod + step + 12) % 12) };
      else if (event.key === 'Home') next = { ...value, hours: period + 1 };
      else if (event.key === 'End') next = { ...value, hours: period };
    } else if (step) next = { ...value, hours: (value.hours + step + 24) % 24 };
    else if (event.key === 'Home') next = { ...value, hours: 0 };
    else if (event.key === 'End') next = { ...value, hours: 23 };
    if (!next) return;
    event.preventDefault();
    onChange(next);
  };

  const hours12 = hourOf12(value.hours);
  const [min, max, now] =
    unit === 'minutes'
      ? [0, 59, value.minutes]
      : hourCycle === 12
        ? [1, 12, hours12]
        : [0, 23, value.hours];

  return (
    <div
      ref={dial}
      className={styles.dial}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-orientation="horizontal"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={now}
      aria-valuetext={unit === 'minutes' ? pad2(now) : String(now)}
      data-unit={unit}
      data-dragging={isDragging ? '' : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => finish(event, false)}
      onPointerCancel={(event) => finish(event, true)}
      onKeyDown={onKeyDown}
    >
      {/* The handle sits under the numbers, so the one it is on shows through in its own colour. */}
      <div
        className={styles.selector}
        data-slot="selector"
        data-ring={target.inner ? 'inner' : 'outer'}
        style={{ '--_angle': `${rotation}deg` } as CSSProperties}
        aria-hidden="true"
      >
        <span className={styles.track} />
        <span className={styles.handle} data-slot="handle">
          {onLabel ? null : <span className={styles.mark} />}
        </span>
      </div>
      <span className={styles.centre} aria-hidden="true" />
      <div className={styles.numbers} data-unit={unit} aria-hidden="true">
        {labels.map((l) => (
          <span
            key={`${unit}-${l.inner ? 'i' : 'o'}${l.slot}`}
            className={styles.number}
            data-slot="number"
            data-ring={l.inner ? 'inner' : 'outer'}
            data-selected={l.selected ? '' : undefined}
            style={{ '--_slot': l.slot } as CSSProperties}
          >
            {l.text}
          </span>
        ))}
      </div>
    </div>
  );
}
