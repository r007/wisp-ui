import { IconButton } from '@wisp-ui/react/icon-button';
import { useEffect, useRef, useState } from 'react';
import { CheckIcon, CopyIcon } from './icons.js';

/**
 * Code that was highlighted at build time (so `html` is trusted: it is made from this repository's own
 * source), with a button that copies it.
 */
export function CodeBlock({ html, language = 'tsx' }: { html: string; language?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    const text = root.current?.querySelector('code')?.textContent ?? '';
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Without permission to the clipboard there is nothing to report but the missing tick.
    }
  };

  return (
    <div className="codeblock" data-language={language} ref={root}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <IconButton
        className="copy-button"
        variant="standard"
        size="xsmall"
        aria-label={copied ? 'Copied' : 'Copy code'}
        data-copied={copied ? '' : undefined}
        onClick={copy}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </IconButton>
      <span className="visually-hidden" role="status">
        {copied ? 'Copied to the clipboard' : ''}
      </span>
    </div>
  );
}
