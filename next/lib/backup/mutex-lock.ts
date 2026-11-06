/**
 * Concurrency Execution Mutex Lock
 * Ensures only a single backup or restore operation runs at any given time.
 */

let isOperationRunning = false;
let currentOperationType: "backup" | "restore" | null = null;
let currentOperationStartedAt: Date | null = null;

const LOCK_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes safety timeout

export function acquireLock(operation: "backup" | "restore"): boolean {
  const now = Date.now();

  // If a lock has been held for longer than timeout, clear it automatically
  if (isOperationRunning && currentOperationStartedAt) {
    if (now - currentOperationStartedAt.getTime() > LOCK_TIMEOUT_MS) {
      console.warn(`[MutexLock] Operation "${currentOperationType}" timed out after 15 minutes. Releasing lock.`);
      releaseLock();
    }
  }

  if (isOperationRunning) {
    return false;
  }

  isOperationRunning = true;
  currentOperationType = operation;
  currentOperationStartedAt = new Date();
  return true;
}

export function releaseLock(): void {
  isOperationRunning = false;
  currentOperationType = null;
  currentOperationStartedAt = null;
}

export function isLocked(): boolean {
  if (isOperationRunning && currentOperationStartedAt) {
    if (Date.now() - currentOperationStartedAt.getTime() > LOCK_TIMEOUT_MS) {
      releaseLock();
      return false;
    }
  }
  return isOperationRunning;
}

export function getCurrentLockInfo(): {
  isLocked: boolean;
  operation: "backup" | "restore" | null;
  startedAt: Date | null;
} {
  return {
    isLocked: isLocked(),
    operation: currentOperationType,
    startedAt: currentOperationStartedAt,
  };
}
