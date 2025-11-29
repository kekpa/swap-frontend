/**
 * Jest Global Setup
 *
 * This file runs before all tests and sets up the test environment.
 * Critical for TanStack Query mutations to work properly in tests.
 */

// Configure TanStack Query's onlineManager for tests
// This is required because Jest runs in Node.js where navigator.onLine doesn't exist
import { onlineManager } from '@tanstack/react-query';

// Disable the event listener to prevent TanStack Query from checking navigator.onLine
// This must be called before setOnline to ensure the value is respected
onlineManager.setEventListener(() => () => {});

// Set the online status to true so mutations with networkMode: 'online' will execute
onlineManager.setOnline(true);
