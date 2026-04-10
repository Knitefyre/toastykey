import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium rounded-[10px] ' +
    'transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[#09090B] ' +
    'active:scale-[0.97] ' +
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ' +
    'cursor-pointer select-none';

  const variants = {
    primary:
      'bg-accent-green/90 hover:bg-accent-green text-[#09090B] font-semibold ' +
      'shadow-[0_0_0_1px_rgba(52,211,153,0.3)]',
    secondary:
      'bg-white/[0.06] hover:bg-white/[0.1] text-white/80 hover:text-white/90 ' +
      'border border-white/[0.08] hover:border-white/[0.14]',
    ghost:
      'bg-transparent hover:bg-white/[0.05] text-white/50 hover:text-white/80',
    danger:
      'bg-accent-red/15 hover:bg-accent-red/25 text-accent-red ' +
      'border border-accent-red/20 hover:border-accent-red/40',
    warning:
      'bg-accent-amber/15 hover:bg-accent-amber/25 text-accent-amber ' +
      'border border-accent-amber/20 hover:border-accent-amber/40',
  };

  const sizes = {
    sm:  'px-3 py-1.5 text-[12px] gap-1.5',
    md:  'px-4 py-2 text-[13px] gap-2',
    lg:  'px-5 py-2.5 text-[14px] gap-2',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant] ?? variants.secondary} ${sizes[size] ?? sizes.md} ${className}`}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
};

export default Button;
