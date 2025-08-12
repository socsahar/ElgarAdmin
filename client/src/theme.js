import { createTheme } from '@mui/material/styles';
import { heIL } from '@mui/material/locale';

// Enhanced responsive breakpoints
const breakpoints = {
  values: {
    xs: 0,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
  },
};

const theme = createTheme({
  direction: 'rtl',
  breakpoints,
  palette: {
    primary: {
      main: '#1976d2',
      dark: '#1565c0',
      light: '#42a5f5',
    },
    secondary: {
      main: '#dc004e',
      dark: '#9a0036',
      light: '#e33371',
    },
    success: {
      main: '#2e7d32',
    },
    warning: {
      main: '#ed6c02',
    },
    error: {
      main: '#d32f2f',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Heebo", "Roboto", "Helvetica", "Arial", sans-serif',
    // Enhanced typography for mobile
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      '@media (max-width:600px)': {
        fontSize: '2rem',
      },
      '@media (max-width:400px)': {
        fontSize: '1.8rem',
      },
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      '@media (max-width:600px)': {
        fontSize: '1.75rem',
      },
      '@media (max-width:400px)': {
        fontSize: '1.5rem',
      },
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      '@media (max-width:600px)': {
        fontSize: '1.5rem',
      },
      '@media (max-width:400px)': {
        fontSize: '1.3rem',
      },
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      '@media (max-width:600px)': {
        fontSize: '1.25rem',
      },
      '@media (max-width:400px)': {
        fontSize: '1.1rem',
      },
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      '@media (max-width:600px)': {
        fontSize: '1.125rem',
      },
      '@media (max-width:400px)': {
        fontSize: '1rem',
      },
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      '@media (max-width:600px)': {
        fontSize: '0.95rem',
      },
      '@media (max-width:400px)': {
        fontSize: '0.9rem',
      },
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      '@media (max-width:600px)': {
        fontSize: '0.95rem',
        lineHeight: 1.4,
      },
      '@media (max-width:400px)': {
        fontSize: '0.9rem',
      },
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
      '@media (max-width:600px)': {
        fontSize: '0.85rem',
        lineHeight: 1.4,
      },
      '@media (max-width:400px)': {
        fontSize: '0.8rem',
      },
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      '@media (max-width:600px)': {
        fontSize: '1rem',
      },
    },
  },
  components: {
    // Enhanced component overrides for mobile
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
          '@media (max-width:600px)': {
            minHeight: 52,
            fontSize: '1rem',
            padding: '14px 28px',
            borderRadius: 16,
            margin: '8px 4px',
          },
          '@media (max-width:400px)': {
            minHeight: 48,
            fontSize: '0.95rem',
            padding: '12px 24px',
            margin: '6px 3px',
          },
        },
        contained: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          '@media (max-width:600px)': {
            borderRadius: 16,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          '@media (max-width:600px)': {
            borderRadius: 20,
            margin: '16px 8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          },
          '@media (max-width:400px)': {
            borderRadius: 16,
            margin: '12px 6px',
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            padding: '24px !important',
            '&:last-child': {
              paddingBottom: '24px !important',
            },
          },
          '@media (max-width:400px)': {
            padding: '20px !important',
            '&:last-child': {
              paddingBottom: '20px !important',
            },
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            margin: '12px 0',
          },
          '& .MuiInputBase-root': {
            '@media (max-width:600px)': {
              fontSize: '1rem', // Prevent zoom on iOS
              minHeight: 52,
              padding: '14px 16px',
            },
            '@media (max-width:400px)': {
              fontSize: '0.95rem',
              minHeight: 48,
              padding: '12px 14px',
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#000000',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          '@media (max-width:600px)': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            '& .MuiToolbar-root': {
              minHeight: 64,
              paddingLeft: 16,
              paddingRight: 16,
            },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderLeft: '1px solid #e0e0e0',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
          '@media (max-width:600px)': {
            borderRadius: '0 16px 16px 0',
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          marginBottom: 4,
          '&.Mui-selected': {
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
          },
          '@media (max-width:600px)': {
            minHeight: 56,
            borderRadius: 12,
            margin: '4px 8px',
            '&.Mui-selected': {
              borderRadius: 16,
            },
          },
          '@media (max-width:400px)': {
            minHeight: 52,
            margin: '3px 6px',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          '@media (max-width:600px)': {
            margin: 16,
            maxHeight: 'calc(100vh - 32px)',
            width: 'calc(100vw - 32px)',
            maxWidth: 'none',
            borderRadius: 20,
          },
          '@media (max-width:400px)': {
            margin: 12,
            maxHeight: 'calc(100vh - 24px)',
            width: 'calc(100vw - 24px)',
            borderRadius: 16,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          '@media (max-width:600px)': {
            fontSize: '0.85rem',
            height: 32,
            borderRadius: 20,
          },
          '@media (max-width:400px)': {
            fontSize: '0.8rem',
            height: 28,
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            width: 56,
            height: 56,
          },
          '@media (max-width:400px)': {
            width: 52,
            height: 52,
          },
        },
      },
    },
    // Enhanced table responsiveness
    MuiTable: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            '& .MuiTableCell-root': {
              padding: '8px 4px',
              fontSize: '0.875rem',
            },
            '& .MuiTableCell-head': {
              fontWeight: 600,
              backgroundColor: '#f5f5f5',
              fontSize: '0.85rem',
            },
          },
          '@media (max-width:400px)': {
            '& .MuiTableCell-root': {
              padding: '6px 2px',
              fontSize: '0.8rem',
            },
            '& .MuiTableCell-head': {
              fontSize: '0.8rem',
            },
          },
        },
      },
    },
    // Icon button improvements
    MuiIconButton: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            padding: 12,
          },
          '@media (max-width:400px)': {
            padding: 10,
          },
        },
      },
    },
    // Menu item improvements
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            minHeight: 48,
            fontSize: '1rem',
            paddingTop: 12,
            paddingBottom: 12,
          },
          '@media (max-width:400px)': {
            minHeight: 44,
            fontSize: '0.95rem',
            paddingTop: 10,
            paddingBottom: 10,
          },
        },
      },
    },
  },
}, heIL);

export default theme;
