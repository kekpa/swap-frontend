// Created: Database type definitions for SQLite - 2025-05-22
// Renamed from database.ts to db-interfaces.ts for clarity

import * as SQLite from 'expo-sqlite';

/**
 * Transaction interface for SQLite transactions
 */
export interface Transaction {
  execute(sql: string, params?: SQLite.SQLiteBindValue[]): Promise<SQLite.SQLiteRunResult>;
}

/**
 * Database interface for SQLite database operations
 */
export interface Database {
  transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T>;
  execAsync(sql: string): Promise<SQLite.SQLiteRunResult>;
  runAsync(sql: string, params?: SQLite.SQLiteBindValue[]): Promise<SQLite.SQLiteRunResult>;
  getAllAsync<T = any>(sql: string, params?: SQLite.SQLiteBindValue[]): Promise<T[]>;
  getFirstAsync<T = any>(sql: string, params?: SQLite.SQLiteBindValue[]): Promise<T | null>;
} 