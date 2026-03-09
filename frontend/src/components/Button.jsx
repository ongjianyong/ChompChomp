import React from 'react';

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
    const baseClasses = 'inline-flex items-center justify-center px-6 py-3 border text-base font-medium rounded-md transition-colors duration-200 cursor-pointer';

    const variants = {
        primary: 'border-transparent text-brand-light bg-brand-dark hover:bg-black shadow-premium',
        outline: 'border-brand-dark text-brand-dark bg-transparent hover:bg-brand-dark hover:text-brand-light',
        secondary: 'border-transparent text-brand-dark bg-gray-100 hover:bg-gray-200',
    };

    return (
        <button
            className={`${baseClasses} ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
