import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  const widthClass = size === 'sm' ? 'sm:max-w-md' : size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-xl';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-start sm:justify-center bg-slate-950/50 backdrop-blur-md sm:p-4 sm:pt-10 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`flex w-full ${widthClass} max-h-[92vh] sm:max-h-[88vh] flex-col rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-[color:var(--border-strong)] animate-slide-up overflow-hidden`}
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        {/* Mobile grabber */}
        <div className="sm:hidden mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
        {title && (
          <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 sm:px-5 py-3 shrink-0">
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            <button className="btn-ghost p-1.5" onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto calendar-scroll overscroll-contain">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-[color:var(--border)] bg-slate-50/60 dark:bg-white/[0.02] backdrop-blur-sm">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
