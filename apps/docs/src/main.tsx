import './styles/layers.css';
import '@fontsource/roboto/latin-300.css';
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/latin-700.css';
import '@fontsource/roboto-mono/latin-400.css';
import '@fontsource/roboto-mono/latin-500.css';
import '@wisp-ui/react/theme.css';
import 'virtual:wisp-docs/themes.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/prose.css';
import './styles/code.css';
import './styles/components.css';
import './styles/home.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app.js';
import { installLinkHandler } from './router.js';

installLinkHandler();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
