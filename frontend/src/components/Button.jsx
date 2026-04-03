import React from 'react';

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
    const baseClasses = 'inline-flex items-center justify-center px-6 py-3 border text-base font-semibold rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.97]';

    const variants = {
        primary: 'border-transparent text-white bg-orange-500 hover:bg-orange-600 hover:-translate-y-0.5',
        outline: 'border-orange-500 text-orange-500 bg-transparent hover:bg-orange-500 hover:text-white hover:-translate-y-0.5',
        secondary: 'border-transparent text-slate-700 bg-slate-100 hover:bg-slate-200 hover:-translate-y-0.5',
    };

    const shadowMap = {
        primary: { boxShadow: '0 8px 20px rgba(234, 88, 12, 0.25)' },
        outline: {},
        secondary: {},
    };

    return (
        <button
            className={`${baseClasses} ${variants[variant]} ${className}`}
            style={shadowMap[variant]}
            onMouseEnter={(e) => {
                if (variant === 'primary') {
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(234, 88, 12, 0.35)';
                }
            }}
            onMouseLeave={(e) => {
                if (variant === 'primary') {
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(234, 88, 12, 0.25)';
                }
            }}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
