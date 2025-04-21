// src/components/ui/Card.jsx
import React from 'react';

/**
 * A responsive card component for dashboard content
 * 
 * @param {Object} props Component props
 * @param {React.ReactNode} props.children Card content
 * @param {string} props.title Card title
 * @param {string} props.className Additional CSS classes
 * @param {React.ReactNode} props.icon Optional icon to display
 * @param {string} props.footerText Optional footer text
 * @param {boolean} props.isLoading Optional loading state
 */
const Card = ({ 
    children, 
    title, 
    className = '', 
    icon, 
    footerText,
    isLoading = false
}) => {
    return (
        <div className={`
            bg-white rounded-xl shadow-card 
            p-3 sm:p-4 md:p-5 
            flex flex-col 
            h-full 
            border border-gray-100
            ${className}
            ${isLoading ? 'opacity-60' : ''}
        `}>
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                {icon && <div className="text-primary">{icon}</div>}
            </div>
            
            <div className="flex-grow">
                {children}
            </div>
            
            {footerText && (
                <div className="mt-3 pt-3 border-t text-sm text-gray-500">
                    {footerText}
                </div>
            )}
        </div>
    );
};

export default Card;
