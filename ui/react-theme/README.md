# Swap Payment System React Theme

This directory contains the theme system for Swap Payment System that works across both web and React Native applications. The theme is designed to provide consistent styling and a unified visual language.

## Theme Structure

The theme is organized into the following components:

- **colors.ts**: Color palette including brand colors, grayscale, and component-specific colors
- **typography.ts**: Typography system with font families, sizes, weights, and predefined text styles
- **spacing.ts**: Spacing scale and component-specific spacing values
- **borderRadius.ts**: Border radius values for various UI elements
- **shadows.ts**: Shadow definitions for both web and React Native
- **index.ts**: Main export file that provides a unified theme object

## Usage

### Installation

First, install any necessary dependencies:

```bash
# For web (React)
npm install styled-components

# For React Native
npm install styled-components
```

### Importing the Theme

You can import the entire theme or specific parts:

```typescript
// Import the entire theme
import theme from 'path/to/react-theme';

// OR import specific parts
import { colors, spacing } from 'path/to/react-theme';
```

### Usage with Styled Components (Web)

```tsx
import styled from 'styled-components';
import { colors, spacing, borderRadius } from 'path/to/react-theme';

const Button = styled.button`
  background-color: ${colors.brand.primary};
  color: ${colors.text.inverse};
  padding: ${spacing.component.buttonPadding}px;
  border-radius: ${borderRadius.component.button}px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  
  &:hover {
    background-color: ${colors.brand.primaryDark};
  }
`;
```

### Usage with React Native

```tsx
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, borderRadius, getShadow } from 'path/to/react-theme';

const styles = StyleSheet.create({
  container: {
    padding: spacing.component.containerPadding,
    backgroundColor: colors.background.primary,
  },
  button: {
    backgroundColor: colors.brand.primary,
    padding: spacing.component.buttonPadding,
    borderRadius: borderRadius.component.button,
    ...getShadow('button'), // Automatically uses the correct shadow style for the platform
  },
  buttonText: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
});

const MyComponent = () => (
  <View style={styles.container}>
    <TouchableOpacity style={styles.button}>
      <Text style={styles.buttonText}>Press Me</Text>
    </TouchableOpacity>
  </View>
);
```

### Using with React Context (Web and React Native)

You can provide the theme through context for easier access in your components:

```tsx
import { createContext, useContext, ReactNode } from 'react';
import theme, { Theme } from 'path/to/react-theme';

const ThemeContext = createContext<Theme>(theme);

export const ThemeProvider = ({ children }: { children: ReactNode }) => (
  <ThemeContext.Provider value={theme}>
    {children}
  </ThemeContext.Provider>
);

export const useTheme = () => useContext(ThemeContext);
```

Then in your components:

```tsx
import { useTheme } from 'path/to/ThemeProvider';

const MyComponent = () => {
  const theme = useTheme();
  
  return (
    <View style={{ backgroundColor: theme.colors.background.primary }}>
      {/* Component content */}
    </View>
  );
};
```

## Design Tokens

### Colors

The color system includes:

- Brand colors (primary, secondary, etc.)
- Grayscale palette
- Background colors
- Text colors
- Component-specific colors

### Typography

The typography system includes:

- Font families for web and native platforms
- Font sizes ranging from xs to 5xl
- Font weights (normal, medium, semibold, bold)
- Pre-defined text styles for headers, body text, and special text elements

### Spacing

The spacing system is based on a 4-pixel base unit and includes:

- Consistent spacing scale (xs to 4xl)
- Component-specific spacing values
- Screen padding and margins
- Layout grid system

### Border Radius

Border radius values include:

- Scale from xs to full (circle)
- Component-specific border radiuses
- Special case radiuses for chat bubbles and other UI elements

### Shadows

The shadow system provides:

- Web shadows (CSS box-shadow)
- React Native shadows (using shadowOffset, shadowOpacity, etc.)
- Component-specific shadow presets

## Extending the Theme

To extend or customize the theme, simply modify the relevant TypeScript files. The modular structure makes it easy to update specific parts of the theme without affecting others.

## Platform-Specific Adaptations

Some parts of the theme (like shadows and font families) have platform-specific implementations. The theme includes helper functions like `getShadow()` to automatically use the correct styles for the current platform. 