import { createContext, useContext, type ReactNode } from 'react';
import type { ChatService } from './contract';

const ServiceContext = createContext<ChatService | null>(null);

export function ServiceProvider({ service, children }: { service: ChatService; children: ReactNode }) {
  return <ServiceContext.Provider value={service}>{children}</ServiceContext.Provider>;
}

export function useService(): ChatService {
  const service = useContext(ServiceContext);
  if (!service) throw new Error('useService must be used inside <ServiceProvider>');
  return service;
}
