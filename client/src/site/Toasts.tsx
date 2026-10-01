import { AnimatePresence, m } from "framer-motion";
import { CircleCheck } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { EASE } from "./motion";

type Toast = { id: number; text: string };

const ToastContext = createContext<(text: string) => void>(() => {});

/** Shows a short confirmation at the bottom of the window. */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);
  const timers = useRef(new Set<number>());

  const show = useCallback((text: string) => {
    const id = next.current++;
    setToasts(list =>
      [...list.filter(toast => toast.text !== text), { id, text }].slice(-3)
    );
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      setToasts(list => list.filter(toast => toast.id !== id));
    }, 3600);
    timers.current.add(timer);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(timer => window.clearTimeout(timer));
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map(toast => (
            <m.p
              key={toast.id}
              layout
              className="toast"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <CircleCheck size={18} />
              {toast.text}
            </m.p>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
