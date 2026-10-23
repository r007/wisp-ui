import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../button/button.js';
import { FlightIcon, SearchIcon } from '../stories/icons.js';
import { Autocomplete, AutocompleteOption } from './autocomplete.js';

const meta = {
  title: 'Components/Autocomplete',
  component: Autocomplete,
  args: { label: 'Country', children: null },
  argTypes: {
    variant: { control: 'inline-radio', options: ['filled', 'outlined'] },
    value: { control: false },
    defaultValue: { control: false },
    inputValue: { control: false },
    defaultInputValue: { control: false },
    filter: { control: false },
    leadingIcon: { control: false },
    children: { control: false },
    ref: { control: false },
  },
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: 320, minBlockSize: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Autocomplete>;

export default meta;
type Story = StoryObj<typeof meta>;

const COUNTRIES = [
  ['au', 'Australia'],
  ['at', 'Austria'],
  ['be', 'Belgium'],
  ['br', 'Brazil'],
  ['ca', 'Canada'],
  ['cl', 'Chile'],
  ['cz', 'Czechia'],
  ['dk', 'Denmark'],
  ['fi', 'Finland'],
  ['fr', 'France'],
  ['de', 'Germany'],
  ['gr', 'Greece'],
  ['is', 'Iceland'],
  ['ie', 'Ireland'],
  ['it', 'Italy'],
  ['jp', 'Japan'],
  ['nl', 'Netherlands'],
  ['nz', 'New Zealand'],
  ['no', 'Norway'],
  ['pt', 'Portugal'],
  ['es', 'Spain'],
  ['se', 'Sweden'],
  ['ch', 'Switzerland'],
  ['gb', 'United Kingdom'],
  ['us', 'United States'],
] as const;

const countries = COUNTRIES.map(([value, name]) => (
  <AutocompleteOption key={value} value={value}>
    {name}
  </AutocompleteOption>
));

/** Typing narrows the options to those that contain it, ignoring case and accents. */
export const Filled: Story = { args: { children: countries } };

export const Outlined: Story = {
  args: { variant: 'outlined', defaultValue: 'nz', children: countries },
};

export const WithSupportingTextAndError: Story = {
  args: {
    variant: 'outlined',
    supportingText: 'Where the parcel is going',
    error: true,
    errorText: 'Choose a country we ship to',
    children: countries,
  },
};

export const WithLeadingIcon: Story = {
  args: { label: 'Destination', leadingIcon: <SearchIcon />, children: countries },
};

/** With `freeSolo` the text itself can be the value: Enter or leaving the field commits it. */
export const FreeSolo: Story = {
  args: {
    label: 'Where from?',
    freeSolo: true,
    supportingText: 'Pick an airport or type any place',
    children: (
      <>
        <AutocompleteOption value="Heathrow" leading={<FlightIcon />}>
          Heathrow
        </AutocompleteOption>
        <AutocompleteOption value="Gatwick" leading={<FlightIcon />}>
          Gatwick
        </AutocompleteOption>
        <AutocompleteOption value="Schiphol" leading={<FlightIcon />}>
          Schiphol
        </AutocompleteOption>
        <AutocompleteOption value="Charles de Gaulle" leading={<FlightIcon />}>
          Charles de Gaulle
        </AutocompleteOption>
      </>
    ),
  },
};

/** An option can be turned off, and the arrow keys skip it. */
export const WithDisabledOption: Story = {
  args: {
    children: (
      <>
        <AutocompleteOption value="a">Alpha</AutocompleteOption>
        <AutocompleteOption value="b" disabled>
          Bravo (sold out)
        </AutocompleteOption>
        <AutocompleteOption value="c">Charlie</AutocompleteOption>
      </>
    ),
  },
};

/**
 * Suggestions fetched as the user types: `filter={false}` offers whatever options it is given,
 * and `loading` says more are on their way.
 */
export const Async: Story = {
  render: (args) => {
    const [text, setText] = useState('');
    const [results, setResults] = useState<(typeof COUNTRIES)[number][]>([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
      if (text.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      const timer = setTimeout(() => {
        setResults(COUNTRIES.filter(([, name]) => name.toLowerCase().includes(text.toLowerCase())));
        setLoading(false);
      }, 600);
      return () => clearTimeout(timer);
    }, [text]);
    return (
      <Autocomplete
        {...args}
        label="Search countries"
        filter={false}
        loading={loading}
        emptyText={text.length < 2 ? 'Type at least two letters' : 'No results'}
        onInputValueChange={(next, reason) => reason === 'input' && setText(next)}
      >
        {results.map(([value, name]) => (
          <AutocompleteOption key={value} value={value}>
            {name}
          </AutocompleteOption>
        ))}
      </Autocomplete>
    );
  },
};

/** Controlled: the chosen value can be set from anywhere, and the field follows. */
export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | null>('fr');
    return (
      <div className="sb-column" style={{ inlineSize: '100%' }}>
        <Autocomplete {...args} value={value} onValueChange={setValue}>
          {countries}
        </Autocomplete>
        <div className="sb-row">
          <Button variant="outlined" onClick={() => setValue('jp')}>
            Choose Japan
          </Button>
          <Button variant="outlined" onClick={() => setValue(null)}>
            Clear
          </Button>
        </div>
        <output>Value: {value ?? 'none'}</output>
      </div>
    );
  },
};

export const FilledInteraction: Story = {
  tags: ['!dev', '!autodocs'],
  args: { children: countries },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const field = canvas.getByRole('combobox', { name: 'Country' });
    await userEvent.click(field);
    await userEvent.keyboard('ger');
    await waitFor(() => expect(field).toHaveAttribute('aria-expanded', 'true'));
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect(field).toHaveValue('Germany');
  },
};
