import { createContext } from 'react';

/** What a `ButtonGroup` tells the buttons inside it. */
export interface ButtonGroupContextValue {
  /** The size the buttons default to, so a group is sized once. */
  size: 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
  /** Connected groups share their corners, which the buttons draw. */
  connected: boolean;
}

export const ButtonGroupContext = createContext<ButtonGroupContextValue | null>(null);
