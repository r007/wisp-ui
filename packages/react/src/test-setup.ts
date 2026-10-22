// Computed-style assertions need the real system tokens.
import '@wisp-ui/tokens/theme.css';
import { afterEach } from 'vitest';
import { userEvent } from 'vitest/browser';

// The pointer stays where the last test left it, and would hover whatever the next test
// renders there: a field mid-way through its hover transition reads the wrong colour. So a
// test that moved the pointer parks it in a corner afterwards; a test that needs a hover does
// it itself.
let moved = false;
document.addEventListener('mousemove', () => {
  moved = true;
});

afterEach(async () => {
  if (!moved) return;
  await userEvent.hover(document.documentElement, {
    force: true,
    position: { x: innerWidth - 2, y: innerHeight - 2 },
  });
  moved = false;
});
