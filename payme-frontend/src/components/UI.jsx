import { cn } from '../lib/utils';

export function Button({ children, variant = 'primary', size = 'md', className, ...props }) {
    const variants = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        outline: 'btn-outline',
        ghost: 'btn-ghost'
    };

    const sizeClasses = size === 'sm' ? 'btn-sm' : '';

    return (
        <button className={cn(variants[variant], sizeClasses, className)} {...props}>
            {children}
        </button>
    );
}

export function Card({ children, className, ...props }) {
    return (
        <div className={cn('card', className)} {...props}>
            {children}
        </div>
    );
}

export function Input({ className, ...props }) {
    return (
        <input className={cn('input', className)} {...props} />
    );
}
