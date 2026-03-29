import { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from "react";

interface CustomerSession {
  active: boolean;
  customerName: string;
  startedAt: string | null;
}

interface CustomerSessionContextType extends CustomerSession {
  startSession: (name: string) => void;
  endSession: () => void;
}

const STORAGE_KEY = "genera3d_customer_session";
const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours

const defaultSession: CustomerSession = { active: false, customerName: "", startedAt: null };

const CustomerSessionContext = createContext<CustomerSessionContextType>({
  ...defaultSession,
  startSession: () => {},
  endSession: () => {},
});

export const CustomerSessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<CustomerSession>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return defaultSession;
      const parsed = JSON.parse(stored) as CustomerSession;
      // Auto-expire after SESSION_EXPIRY_MS
      if (parsed.active && parsed.startedAt) {
        const elapsed = Date.now() - new Date(parsed.startedAt).getTime();
        if (elapsed > SESSION_EXPIRY_MS) {
          localStorage.removeItem(STORAGE_KEY);
          return defaultSession;
        }
      }
      return parsed;
    } catch {
      return defaultSession;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // QuotaExceededError or restricted storage — non-critical
    }
  }, [session]);

  const startSession = useCallback((name: string) => {
    setSession({ active: true, customerName: name, startedAt: new Date().toISOString() });
  }, []);

  const endSession = useCallback(() => {
    setSession(defaultSession);
  }, []);

  const value = useMemo(() => ({
    ...session,
    startSession,
    endSession,
  }), [session, startSession, endSession]);

  return (
    <CustomerSessionContext.Provider value={value}>
      {children}
    </CustomerSessionContext.Provider>
  );
};

export const useCustomerSession = () => useContext(CustomerSessionContext);
