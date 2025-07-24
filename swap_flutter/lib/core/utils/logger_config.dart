import 'dart:io';
import 'package:logger/logger.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;

/// Logger Configuration
/// 
/// Centralized logging configuration with different output strategies
/// for development and production environments.
class LoggerConfig {
  static Logger? _instance;
  
  /// Get configured logger instance
  static Logger get instance {
    _instance ??= _createLogger();
    return _instance!;
  }

  /// Create logger with appropriate configuration
  static Logger _createLogger() {
    const isProduction = bool.fromEnvironment('dart.vm.product');
    
    return Logger(
      filter: isProduction ? ProductionFilter() : DevelopmentFilter(),
      printer: isProduction ? ProductionPrinter() : DevelopmentPrinter(),
      output: isProduction ? FileOutput() : ConsoleOutput(),
      level: isProduction ? Level.warning : Level.debug,
    );
  }

  /// Initialize logger with file output (for production)
  static Future<void> initialize() async {
    if (const bool.fromEnvironment('dart.vm.product')) {
      await FileOutput._initialize();
    }
  }

  /// Clear log files (for maintenance)
  static Future<void> clearLogs() async {
    await FileOutput._clearLogs();
  }

  /// Get log files for sharing/debugging
  static Future<List<File>> getLogFiles() async {
    return await FileOutput._getLogFiles();
  }
}

/// Development Filter - allows all levels in debug mode
class DevelopmentFilter extends LogFilter {
  @override
  bool shouldLog(LogEvent event) {
    return true;
  }
}

/// Production Filter - only warnings and errors
class ProductionFilter extends LogFilter {
  @override
  bool shouldLog(LogEvent event) {
    return event.level.index >= Level.warning.index;
  }
}

/// Development Printer - colorful console output
class DevelopmentPrinter extends PrettyPrinter {
  DevelopmentPrinter() : super(
    methodCount: 2,
    errorMethodCount: 8,
    lineLength: 120,
    colors: true,
    printEmojis: true,
    printTime: true,
    noBoxingByDefault: false,
  );
}

/// Production Printer - minimal structured output
class ProductionPrinter extends LogPrinter {
  @override
  List<String> log(LogEvent event) {
    final timestamp = DateTime.now().toIso8601String();
    final level = event.level.name.toUpperCase();
    final message = event.message;
    final error = event.error?.toString() ?? '';
    
    String logLine = '[$timestamp] $level: $message';
    if (error.isNotEmpty) {
      logLine += ' | Error: $error';
    }
    
    return [logLine];
  }
}

/// File Output - writes logs to file (production)
class FileOutput extends LogOutput {
  static File? _logFile;
  static const int _maxFileSize = 5 * 1024 * 1024; // 5MB
  static const int _maxFiles = 5;

  static Future<void> _initialize() async {
    try {
      final directory = await getApplicationDocumentsDirectory();
      final logsDir = Directory(path.join(directory.path, 'logs'));
      
      if (!await logsDir.exists()) {
        await logsDir.create(recursive: true);
      }
      
      final timestamp = DateTime.now().toIso8601String().split('T')[0];
      _logFile = File(path.join(logsDir.path, 'app_$timestamp.log'));
      
      // Rotate logs if necessary
      await _rotateLogsIfNeeded();
    } catch (e) {
      // Fallback to console if file creation fails
      print('Failed to initialize file logging: $e');
    }
  }

  static Future<void> _rotateLogsIfNeeded() async {
    if (_logFile == null || !await _logFile!.exists()) return;
    
    final fileSize = await _logFile!.length();
    if (fileSize > _maxFileSize) {
      // Create new log file with timestamp
      final directory = _logFile!.parent;
      final timestamp = DateTime.now().millisecondsSinceEpoch.toString();
      _logFile = File(path.join(directory.path, 'app_$timestamp.log'));
      
      // Clean up old files
      await _cleanupOldLogs();
    }
  }

  static Future<void> _cleanupOldLogs() async {
    try {
      final directory = await getApplicationDocumentsDirectory();
      final logsDir = Directory(path.join(directory.path, 'logs'));
      
      if (!await logsDir.exists()) return;
      
      final logFiles = await logsDir
          .list()
          .where((entity) => entity is File && entity.path.endsWith('.log'))
          .cast<File>()
          .toList();
      
      if (logFiles.length > _maxFiles) {
        // Sort by modification date and remove oldest files
        logFiles.sort((a, b) => a.lastModifiedSync().compareTo(b.lastModifiedSync()));
        
        for (int i = 0; i < logFiles.length - _maxFiles; i++) {
          await logFiles[i].delete();
        }
      }
    } catch (e) {
      print('Failed to clean up old logs: $e');
    }
  }

  static Future<void> _clearLogs() async {
    try {
      final directory = await getApplicationDocumentsDirectory();
      final logsDir = Directory(path.join(directory.path, 'logs'));
      
      if (await logsDir.exists()) {
        await logsDir.delete(recursive: true);
      }
    } catch (e) {
      print('Failed to clear logs: $e');
    }
  }

  static Future<List<File>> _getLogFiles() async {
    try {
      final directory = await getApplicationDocumentsDirectory();
      final logsDir = Directory(path.join(directory.path, 'logs'));
      
      if (!await logsDir.exists()) return [];
      
      return await logsDir
          .list()
          .where((entity) => entity is File && entity.path.endsWith('.log'))
          .cast<File>()
          .toList();
    } catch (e) {
      print('Failed to get log files: $e');
      return [];
    }
  }

  @override
  void output(OutputEvent event) {
    if (_logFile != null) {
      _writeToFile(event);
    } else {
      // Fallback to console
      for (final line in event.lines) {
        print(line);
      }
    }
  }

  void _writeToFile(OutputEvent event) {
    try {
      final logContent = event.lines.join('\n') + '\n';
      _logFile!.writeAsStringSync(logContent, mode: FileMode.append);
    } catch (e) {
      // Fallback to console if file write fails
      for (final line in event.lines) {
        print(line);
      }
    }
  }
}

/// Logging Extensions for common use cases
extension LoggerExtensions on Logger {
  /// Log API request
  void logApiRequest(String method, String url, Map<String, dynamic>? data) {
    d('API Request: $method $url${data != null ? ' | Data: $data' : ''}');
  }

  /// Log API response
  void logApiResponse(String method, String url, int statusCode, dynamic data) {
    d('API Response: $method $url | Status: $statusCode${data != null ? ' | Data: $data' : ''}');
  }

  /// Log user action
  void logUserAction(String action, Map<String, dynamic>? context) {
    i('User Action: $action${context != null ? ' | Context: $context' : ''}');
  }

  /// Log performance metric
  void logPerformance(String operation, Duration duration, {Map<String, dynamic>? metadata}) {
    d('Performance: $operation took ${duration.inMilliseconds}ms${metadata != null ? ' | Metadata: $metadata' : ''}');
  }

  /// Log security event
  void logSecurity(String event, {String? userId, Map<String, dynamic>? details}) {
    w('Security Event: $event${userId != null ? ' | User: $userId' : ''}${details != null ? ' | Details: $details' : ''}');
  }

  /// Log database operation
  void logDatabase(String operation, String table, {Map<String, dynamic>? query}) {
    d('Database: $operation on $table${query != null ? ' | Query: $query' : ''}');
  }
}