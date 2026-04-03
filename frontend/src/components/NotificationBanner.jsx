import React, { useState, useEffect } from 'react';

const NotificationBanner = ({ message, type = 'info', duration = 5000 }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, duration);
        return () => clearTimeout(timer);
    }, [duration]);

    if (!isVisible) return null;

    return (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md animate-slide-down">
            <div className="bg-brand-dark text-white px-6 py-4 rounded-xl shadow-premium flex items-center justify-between">
                <div className="flex items-center">
                    <span className="h-2 w-2 bg-orange-400 rounded-full animate-pulse mr-3"></span>
                    <p className="font-sans font-medium text-sm">{message}</p>
                </div>
                <button onClick={() => setIsVisible(false)} className="text-gray-400 hover:text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default NotificationBanner;
