import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { BaseThemeProvider } from '@tabby.ai/tabby-ui/core/BaseThemeProvider';
import { StylesO26Light } from '@tabby.ai/tabby-ui/O25/StyleWrapper/StylesO26Light';
import { TypographyO26 } from '@tabby.ai/tabby-ui/O25/typography/TypographyO26';
import { getKitThemeOptions } from '@tabby.ai/tabby-ui/theme';
import '@tabby.ai/tabby-ui/theme/fonts.css';

import { DirProvider } from './DirContext';
import { ThemeProvider } from './ThemeContext';
import App from './App';
import EditOverlay from './devtools/EditOverlay';

import './global.css';
import './tokens.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        {({ theme }) => (
          <DirProvider>
            {({ dir }) => (
              <BaseThemeProvider themeOptions={getKitThemeOptions(dir)} dir={dir}>
                {theme === 'o26' ? (
                  <StylesO26Light setClassOnBody={false}>
                    <TypographyO26 setClassOnBody={false}>
                      <App />
                    </TypographyO26>
                  </StylesO26Light>
                ) : (
                  <App />
                )}
                <EditOverlay />

              </BaseThemeProvider>
            )}
          </DirProvider>
        )}
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
