export interface ColorPalette {
  brand: {
    primary: string;
    primaryHover: string;
    secondary: string;
    accent: string;
  };
  status: {
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
  dark: {
    bg: string;
    surface: string;
    border: string;
    textMuted: string;
    textMain: string;
  };
  light: {
    bg: string;
    surface: string;
    border: string;
    textMuted: string;
    textMain: string;
  };
}

export interface AppTheme {
  colors: ColorPalette;
  fontFamily: string;
}

export const colors: ColorPalette = {
  brand: {
    primary: '#58a6ff',       // Gather blue
    primaryHover: '#79b8ff',
    secondary: '#8b949e',     // Muted
    accent: '#3fb950',        // Gather green
  },
  status: {
    success: '#3fb950',
    warning: '#d29922',
    danger: '#f85149',
    info: '#58a6ff',
  },
  dark: {
    bg: '#0d1117',
    surface: '#161b22',
    border: '#30363d',
    textMuted: '#8b949e',
    textMain: '#e6edf3',
  },
  light: {
    bg: '#0d1117',
    surface: '#161b22',
    border: '#30363d',
    textMuted: '#8b949e',
    textMain: '#e6edf3',
  }
};

export const theme: AppTheme = {
  colors,
  fontFamily: 'DM Sans, Inter, system-ui, sans-serif',
};

export default theme;
