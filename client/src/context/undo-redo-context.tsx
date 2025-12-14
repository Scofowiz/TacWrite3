import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

const MAX_HISTORY = 50;

export interface HistoryMeta {
  source?: string;
  cursorPosition?: number;
  selectionStart?: number;
  selectionEnd?: number;
  originalSelection?: string | null;
  timestamp?: number;
}

export type ContentUpdateMeta = Omit<HistoryMeta, "timestamp">;

export interface HistorySnapshot {
  value: string;
  meta?: HistoryMeta;
}

interface UndoRedoContextValue {
  recordChange: (state: string, meta?: ContentUpdateMeta) => void;
  undo: (currentState: string) => HistorySnapshot | null;
  redo: (currentState: string) => HistorySnapshot | null;
  reset: () => void;
  setCurrentMeta: (meta?: ContentUpdateMeta | null) => void;
  canUndo: boolean;
  canRedo: boolean;
  peekUndo: () => HistorySnapshot | null;
  peekRedo: () => HistorySnapshot | null;
  currentMeta?: HistoryMeta;
}

const UndoRedoContext = createContext<UndoRedoContextValue | null>(null);

export const UndoRedoProvider = ({ children }: { children: ReactNode }) => {
  const undoStackRef = useRef<HistorySnapshot[]>([]);
  const redoStackRef = useRef<HistorySnapshot[]>([]);
  const currentMetaRef = useRef<HistoryMeta | undefined>(undefined);
  const [version, setVersion] = useState(0);

  const emit = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  const recordChange = useCallback((state: string, meta?: ContentUpdateMeta) => {
    if (state === undefined || state === null) return;

    const snapshot: HistorySnapshot = {
      value: state,
      meta: meta ? { ...meta, timestamp: Date.now() } : { timestamp: Date.now() },
    };

    undoStackRef.current = [...undoStackRef.current.slice(-(MAX_HISTORY - 1)), snapshot];
    redoStackRef.current = [];
    emit();
  }, [emit]);

  const setCurrentMeta = useCallback((meta?: ContentUpdateMeta | null) => {
    if (!meta) {
      currentMetaRef.current = undefined;
    } else {
      currentMetaRef.current = { ...meta, timestamp: Date.now() };
    }
    emit();
  }, [emit]);

  const undo = useCallback((currentState: string) => {
    if (undoStackRef.current.length === 0) return null;
    const previous = undoStackRef.current[undoStackRef.current.length - 1];
    undoStackRef.current = undoStackRef.current.slice(0, -1);

    const redoSnapshot: HistorySnapshot = {
      value: currentState,
      meta: currentMetaRef.current
        ? { ...currentMetaRef.current, timestamp: Date.now() }
        : { timestamp: Date.now(), source: "undo" },
    };

    redoStackRef.current = [redoSnapshot, ...redoStackRef.current].slice(0, MAX_HISTORY);
    currentMetaRef.current = previous.meta;
    emit();
    return previous;
  }, [emit]);

  const redo = useCallback((currentState: string) => {
    if (redoStackRef.current.length === 0) return null;
    const [next, ...remaining] = redoStackRef.current;
    redoStackRef.current = remaining;

    const undoSnapshot: HistorySnapshot = {
      value: currentState,
      meta: currentMetaRef.current
        ? { ...currentMetaRef.current, timestamp: Date.now() }
        : { timestamp: Date.now(), source: "redo" },
    };

    undoStackRef.current = [...undoStackRef.current, undoSnapshot].slice(-MAX_HISTORY);
    currentMetaRef.current = next.meta;
    emit();
    return next;
  }, [emit]);

  const reset = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    currentMetaRef.current = undefined;
    emit();
  }, [emit]);

  const peekUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return null;
    return undoStackRef.current[undoStackRef.current.length - 1];
  }, []);

  const peekRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return null;
    return redoStackRef.current[0];
  }, []);

  const value = useMemo<UndoRedoContextValue>(() => ({
    recordChange,
    undo,
    redo,
    reset,
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
    peekUndo,
    peekRedo,
    setCurrentMeta,
    currentMeta: currentMetaRef.current,
  }), [recordChange, undo, redo, reset, peekUndo, peekRedo, version, setCurrentMeta]);

  return (
    <UndoRedoContext.Provider value={value}>
      {children}
    </UndoRedoContext.Provider>
  );
};

export const useUndoRedo = () => {
  const context = useContext(UndoRedoContext);
  if (!context) {
    throw new Error("useUndoRedo must be used within an UndoRedoProvider");
  }
  return context;
};
