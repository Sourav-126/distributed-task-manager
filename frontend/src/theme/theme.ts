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
    primary: '#1d4ed8',       // Royal Blue
    primaryHover: '#1e40af',  // Navy Blue
    secondary: '#475569',    // Slate
    accent: '#d97706',       // Amber
  },
  status: {
    success: '#15803d',
    warning: '#b45309',
    danger: '#b91c1c',
    info: '#0369a1',
  },
  dark: {
    bg: '#090d16',
    surface: '#151f32',
    border: '#1e293b',
    textMuted: '#94a3b8',
    textMain: '#f8fafc',
  },
  light: {
    bg: '#f8fafc',
    surface: '#ffffff',
    border: '#cbd5e1',
    textMuted: '#475569',
    textMain: '#0f172a',
  }
};

export const theme: AppTheme = {
  colors,
  fontFamily: 'Inter, system-ui, sans-serif',
};

export default theme;
