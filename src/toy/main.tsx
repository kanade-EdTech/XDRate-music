import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { I18nProvider } from '../i18n/I18nProvider';
import '../styles/index.css';
import { ToyApp } from './ToyApp';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('The Toy application root is missing.');
}

createRoot(rootElement).render(
  <StrictMode>
    <I18nProvider>
      <ToyApp />
    </I18nProvider>
  </StrictMode>,
);
