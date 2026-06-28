"use client";

import { createContext, type ReactNode, useContext, useRef, useSyncExternalStore } from "react";
import type { FrontendDataSource, FrontendState } from "../lib/frontend-data";
import { MockFrontendDataSource } from "../lib/mock-data-source";

const DataContext = createContext<FrontendDataSource | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const source = useRef<FrontendDataSource | null>(null);
  if (!source.current) source.current = new MockFrontendDataSource(typeof window === "undefined" ? undefined : window.localStorage);
  return <DataContext.Provider value={source.current}>{children}</DataContext.Provider>;
}

export function useData(): [FrontendState, FrontendDataSource] {
  const source = useContext(DataContext);
  if (!source) throw new Error("DataProvider is missing.");
  const state = useSyncExternalStore(source.subscribe, source.getState, source.getState);
  return [state, source];
}
