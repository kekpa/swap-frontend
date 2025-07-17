import { Platform } from 'react-native';

interface CrashReport {
  timestamp: string;
  type: 'javascript_error' | 'unhandled_promise_rejection' | 'react_error';
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  platform: string;
  context?: any;
}

class CrashLogger {
  private static instance: CrashLogger;
  private crashReports: CrashReport[] = [];
  private maxReports = 10; // Keep last 10 crash reports

  public static getInstance(): CrashLogger {
    if (!CrashLogger.instance) {
      CrashLogger.instance = new CrashLogger();
    }
    return CrashLogger.instance;
  }

  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers() {
    // Store original console.error to prevent infinite loops
    const originalConsoleError = console.error;
    let isLoggingCrash = false; // Prevent recursive calls
    
    console.error = (...args) => {
      // Call original console.error first
      originalConsoleError.apply(console, args);
      
      // Prevent infinite loops when logCrash calls console.error
      if (isLoggingCrash) return;
      
      // Check if this looks like a crash
      const errorMessage = args.join(' ');
      if (this.isCrashError(errorMessage)) {
        isLoggingCrash = true;
        try {
          this.logCrashSilently({
            timestamp: new Date().toISOString(),
            type: 'javascript_error',
            error: {
              name: 'JavaScript Error',
              message: errorMessage,
              stack: new Error().stack,
            },
            platform: Platform.OS,
            context: { args },
          });
        } finally {
          isLoggingCrash = false;
        }
      }
    };

    // Handle unhandled promise rejections
    if (global.addEventListener) {
      global.addEventListener('unhandledrejection', (event) => {
        this.logCrash({
          timestamp: new Date().toISOString(),
          type: 'unhandled_promise_rejection',
          error: {
            name: 'Unhandled Promise Rejection',
            message: event.reason?.message || String(event.reason),
            stack: event.reason?.stack,
          },
          platform: Platform.OS,
          context: { reason: event.reason },
        });
      });
    }

    // Note: React Native ErrorUtils handling would go here
    // Skipping for now to avoid TypeScript complexity
  }

  private isCrashError(message: string): boolean {
    const crashKeywords = [
      'crash',
      'fatal',
      'segmentation fault',
      'memory access',
      'null pointer',
      'undefined is not an object',
      'cannot read property',
      'network request failed',
      'timeout',
      'abort',
    ];

    const lowerMessage = message.toLowerCase();
    return crashKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  public logCrash(crashReport: CrashReport) {
    console.group('🚨 CRASH DETECTED');
    console.error('Timestamp:', crashReport.timestamp);
    console.error('Type:', crashReport.type);
    console.error('Platform:', crashReport.platform);
    console.error('Error Name:', crashReport.error.name);
    console.error('Error Message:', crashReport.error.message);
    if (crashReport.error.stack) {
      console.error('Stack Trace:', crashReport.error.stack);
    }
    if (crashReport.context) {
      console.error('Context:', crashReport.context);
    }
    console.groupEnd();

    this.storeCrashReport(crashReport);
  }

  // Silent version that doesn't use console.error to prevent infinite loops
  private logCrashSilently(crashReport: CrashReport) {
    // Use console.warn instead of console.error to avoid triggering our override
    console.warn('🚨 CRASH DETECTED (Silent):', {
      timestamp: crashReport.timestamp,
      type: crashReport.type,
      platform: crashReport.platform,
      error: crashReport.error,
      context: crashReport.context
    });

    this.storeCrashReport(crashReport);
  }

  private storeCrashReport(crashReport: CrashReport) {
    // Store crash report
    this.crashReports.push(crashReport);
    
    // Keep only last N reports
    if (this.crashReports.length > this.maxReports) {
      this.crashReports = this.crashReports.slice(-this.maxReports);
    }

    // You could send this to a crash reporting service here
    // Example: this.sendToRemoteLogging(crashReport);
  }

  public logMapCrash(error: Error, context: any) {
    this.logCrash({
      timestamp: new Date().toISOString(),
      type: 'react_error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      platform: Platform.OS,
      context: {
        component: 'MapScreen',
        ...context,
      },
    });
  }

  public getCrashReports(): CrashReport[] {
    return [...this.crashReports];
  }

  public clearCrashReports() {
    this.crashReports = [];
    console.log('🗑️ Cleared all crash reports');
  }

  public printCrashSummary() {
    console.group('📊 CRASH SUMMARY');
    console.log(`Total crashes recorded: ${this.crashReports.length}`);
    
    if (this.crashReports.length > 0) {
      console.log('Recent crashes:');
      this.crashReports.slice(-5).forEach((report, index) => {
        console.log(`${index + 1}. ${report.timestamp} - ${report.error.name}: ${report.error.message}`);
      });
    }
    console.groupEnd();
  }

  private async sendToRemoteLogging(crashReport: CrashReport) {
    // Implement remote logging here if needed
    // Example: send to Sentry, LogRocket, or custom endpoint
    try {
      // await analytics.track('app_crash', crashReport);
      console.log('📡 Would send crash report to remote logging service');
    } catch (error) {
      console.error('Failed to send crash report to remote service:', error);
    }
  }
}

// Export singleton instance
export const crashLogger = CrashLogger.getInstance();

// Convenience functions
export const logMapCrash = (error: Error, context: any) => {
  crashLogger.logMapCrash(error, context);
};

export const getCrashReports = () => {
  return crashLogger.getCrashReports();
};

export const clearCrashReports = () => {
  crashLogger.clearCrashReports();
};

export const printCrashSummary = () => {
  crashLogger.printCrashSummary();
}; 