import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme } from '@mui/material/styles';

const ThemeContext = createContext();

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeProvider');
  }
  return context;
};

export const CustomThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('themeMode');
    return saved || 'light';
  });

  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'he';
  });

  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('fontSize');
    return saved ? parseInt(saved) : 14;
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('fontSize', fontSize.toString());
  }, [fontSize]);

  const theme = useMemo(() => {
    const isDark = mode === 'dark';
    
    return createTheme({
      direction: 'rtl',
      palette: {
        mode: mode === 'auto' ? 'light' : mode, // For now, auto defaults to light
        primary: {
          main: isDark ? '#90caf9' : '#1976d2',
          dark: isDark ? '#42a5f5' : '#1565c0',
          light: isDark ? '#e3f2fd' : '#42a5f5',
        },
        secondary: {
          main: isDark ? '#f48fb1' : '#dc004e',
          dark: isDark ? '#ad2d5a' : '#9a0036',
          light: isDark ? '#fce4ec' : '#e33371',
        },
        success: {
          main: isDark ? '#66bb6a' : '#2e7d32',
        },
        warning: {
          main: isDark ? '#ffa726' : '#ed6c02',
        },
        error: {
          main: isDark ? '#f44336' : '#d32f2f',
        },
        background: {
          default: isDark ? '#121212' : '#f5f5f5',
          paper: isDark ? '#1e1e1e' : '#ffffff',
        },
        text: {
          primary: isDark ? '#ffffff' : '#000000',
          secondary: isDark ? '#b0b0b0' : '#666666',
        },
      },
      typography: {
        fontFamily: language === 'he' ? '"Heebo", "Roboto", "Helvetica", "Arial", sans-serif' : '"Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: fontSize,
        h1: {
          fontSize: `${fontSize * 1.8}px`,
          fontWeight: 600,
        },
        h2: {
          fontSize: `${fontSize * 1.6}px`,
          fontWeight: 600,
        },
        h3: {
          fontSize: `${fontSize * 1.4}px`,
          fontWeight: 600,
        },
        h4: {
          fontSize: `${fontSize * 1.3}px`,
          fontWeight: 500,
        },
        h5: {
          fontSize: `${fontSize * 1.2}px`,
          fontWeight: 500,
        },
        h6: {
          fontSize: `${fontSize * 1.1}px`,
          fontWeight: 500,
        },
        body1: {
          fontSize: `${fontSize}px`,
          lineHeight: 1.5,
        },
        body2: {
          fontSize: `${fontSize * 0.875}px`,
          lineHeight: 1.43,
        },
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              borderRadius: 8,
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              ...(isDark && {
                backgroundImage: 'none',
              }),
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              boxShadow: isDark 
                ? '0 2px 8px rgba(255,255,255,0.1)' 
                : '0 2px 8px rgba(0,0,0,0.1)',
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
              color: isDark ? '#ffffff' : '#000000',
              boxShadow: isDark 
                ? '0 1px 3px rgba(255,255,255,0.12)' 
                : '0 1px 3px rgba(0,0,0,0.12)',
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              borderLeft: isDark ? '1px solid #333' : '1px solid #e0e0e0',
              backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
            },
          },
        },
      },
    });
  }, [mode, language, fontSize]);

  const toggleMode = () => {
    setMode(prevMode => {
      switch(prevMode) {
        case 'light': return 'dark';
        case 'dark': return 'auto';
        case 'auto': return 'light';
        default: return 'light';
      }
    });
  };

  const setThemeMode = (newMode) => {
    setMode(newMode);
  };

  const toggleLanguage = () => {
    setLanguage(prevLang => prevLang === 'he' ? 'en' : 'he');
  };

  const setThemeLanguage = (newLanguage) => {
    setLanguage(newLanguage);
  };

  const setThemeFontSize = (newSize) => {
    setFontSize(newSize);
  };

  const value = {
    theme,
    mode,
    language,
    fontSize,
    toggleMode,
    setThemeMode,
    toggleLanguage,
    setThemeLanguage,
    setThemeFontSize,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
