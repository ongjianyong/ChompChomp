import React from 'react';

const Card = ({ children, className = '' }) => {
    return (
        <div className={`card-premium ${className}`}>
            {children}
        </div>
    );
};

export default Card;
