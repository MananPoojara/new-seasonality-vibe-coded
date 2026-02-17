import { createPortal } from "react-dom";
import { AlertCircle, X, Copy } from "lucide-react";
import { useEffect } from "react";

interface ErrorPopoverProps {
  anchorRect: DOMRect;
  error: string;
  onClose: () => void;
}

export function ErrorPopover({ anchorRect, error, onClose }: ErrorPopoverProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('[data-error-popover]')) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleCopyError = async () => {
    try {
      await navigator.clipboard.writeText(error);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = error;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  // Calculate position to keep popover on screen
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const popoverWidth = 520;
  const popoverHeight = 200; // Approximate height
  
  let left = anchorRect.right - popoverWidth;
  let top = anchorRect.bottom + 8;
  
  // Adjust if popover would go off screen
  if (left < 16) {
    left = 16;
  }
  if (left + popoverWidth > viewportWidth - 16) {
    left = viewportWidth - popoverWidth - 16;
  }
  
  if (top + popoverHeight > viewportHeight - 16) {
    top = anchorRect.top - popoverHeight - 8;
  }

  return createPortal(
    <div
      className="fixed z-[9999]"
      style={{
        top: top,
        left: left,
      }}
      data-error-popover
    >
      <div className="w-[520px] max-w-[90vw] rounded-xl bg-white shadow-2xl border border-slate-200 animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-rose-100 p-2">
                <AlertCircle className="h-4 w-4 text-rose-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  File Processing Error
                </p>
                <p className="text-[11px] text-slate-500">
                  Something went wrong while processing this file
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 hover:bg-slate-100 transition-colors"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          {/* Error Content */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 max-h-32 overflow-y-auto">
            <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap break-words">
              {error}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCopyError}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              <Copy className="h-3 w-3" />
              Copy error
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}