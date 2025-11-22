import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#ec4899', // Pink
      light: '#f472b6',
      dark: '#be185d',
    },
    secondary: {
      main: '#8b5cf6', // Purple
      light: '#a78bfa',
      dark: '#7c3aed',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
    },
  },
  typography: {
    fontFamily: [
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      '"Noto Sans Thai"',
      'Roboto',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '9999px',
          textTransform: 'none',
          fontWeight: 600,
          padding: '12px 24px',
        },
        contained: {
          background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
          boxShadow: '0 4px 20px rgba(236, 72, 153, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #be185d 0%, #7c3aed 100%)',
            boxShadow: '0 6px 25px rgba(236, 72, 153, 0.4)',
          },
        },
        outlined: {
          borderColor: '#d1d5db',
          color: '#374151',
          '&:hover': {
            borderColor: '#9ca3af',
            backgroundColor: '#f9fafb',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '9999px',
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            '& fieldset': {
              borderColor: '#d1d5db',
            },
            '&:hover fieldset': {
              borderColor: '#ec4899',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#ec4899',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
        },
      },
    },
  },
});