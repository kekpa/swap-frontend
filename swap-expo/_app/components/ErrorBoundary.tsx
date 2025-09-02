import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorTime: Date | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorTime: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorTime: new Date(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error with detailed information
    const crashReport = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      userAgent: 'React Native App',
      appState: 'active',
    };

    console.error('🚨 [ErrorBoundary] App crashed:', crashReport);
    
    // Log to console with detailed formatting
    console.group('🚨 CRASH REPORT');
    console.error('Time:', crashReport.timestamp);
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Error Stack:', error.stack);
    console.groupEnd();

    // Update state with error info
    this.setState({
      error,
      errorInfo,
      errorTime: new Date(),
    });

    // Call the onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // You could send this to a crash reporting service here
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleRestart = () => {
    console.log('🔄 [ErrorBoundary] Attempting app restart...');
    // Note: ErrorRecovery restart functionality may not be available in all environments
    try {
      // Error recovery functionality removed - using simple reset instead
      console.log('Restarting app by resetting error boundary...');
      // For now, just reset the error boundary
      this.handleReset();
    } catch (error) {
      console.log('Error recovery not available, resetting boundary instead');
      this.handleReset();
    }
  };

  handleReset = () => {
    console.log('🔄 [ErrorBoundary] Resetting error boundary...');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorTime: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI with detailed information
      return (
        <View style={styles.container}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
            <Text style={styles.title}>🚨 App Crashed</Text>
            <Text style={styles.subtitle}>
              Time: {this.state.errorTime?.toLocaleString()}
            </Text>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Error Details:</Text>
              <Text style={styles.errorText}>
                {this.state.error?.name}: {this.state.error?.message}
              </Text>
            </View>

            {this.state.errorInfo?.componentStack && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Component Stack:</Text>
                <Text style={styles.stackText}>
                  {this.state.errorInfo.componentStack}
                </Text>
              </View>
            )}

            {this.state.error?.stack && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Error Stack:</Text>
                <Text style={styles.stackText}>
                  {this.state.error.stack}
                </Text>
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
                <Text style={styles.buttonText}>Restart App</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    fontFamily: 'monospace',
  },
  stackText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  button: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    minWidth: 120,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 