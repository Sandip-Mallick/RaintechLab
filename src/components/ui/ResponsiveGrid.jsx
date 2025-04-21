import React from 'react';

/**
 * A responsive grid component that adjusts columns based on screen size.
 * Uses Tailwind CSS responsive classes for better compatibility.
 * 
 * @param {Object} props Component props
 * @param {React.ReactNode} props.children Child components to render in the grid
 * @param {string} props.className Additional CSS classes
 * @param {number} props.xs Columns for extra small screens (<640px) - default 1
 * @param {number} props.sm Columns for small screens (≥640px) - default 2
 * @param {number} props.md Columns for medium screens (≥768px) - default 2
 * @param {number} props.lg Columns for large screens (≥1024px) - default 3
 * @param {number} props.xl Columns for extra large screens (≥1280px) - default 4
 * @param {number} props.xxl Columns for 2XL screens (≥1536px) - default 4
 */
const ResponsiveGrid = ({ 
    children, 
    className = '',
    xs = 1,
    sm = 2, 
    md = 2, 
    lg = 3, 
    xl = 4, 
    xxl = 4
}) => {
    // Map column counts to Tailwind's grid-cols classes
    const getGridColsClass = (size, cols) => {
        if (cols === 1) return `${size}:grid-cols-1`;
        if (cols === 2) return `${size}:grid-cols-2`;
        if (cols === 3) return `${size}:grid-cols-3`;
        if (cols === 4) return `${size}:grid-cols-4`;
        if (cols === 5) return `${size}:grid-cols-5`;
        if (cols === 6) return `${size}:grid-cols-6`;
        if (cols === 7) return `${size}:grid-cols-7`;
        if (cols === 8) return `${size}:grid-cols-8`;
        if (cols === 9) return `${size}:grid-cols-9`;
        if (cols === 12) return `${size}:grid-cols-12`;
        return `${size}:grid-cols-${cols}`;
    };

    // Combine classes for responsive grid
    const gridClasses = `
        grid 
        grid-cols-${xs} 
        ${getGridColsClass('sm', sm)}
        ${getGridColsClass('md', md)}
        ${getGridColsClass('lg', lg)}
        ${getGridColsClass('xl', xl)}
        ${getGridColsClass('2xl', xxl)}
        gap-4 sm:gap-5 md:gap-6
        ${className}
    `;

    return (
        <div className={gridClasses.trim()}>
            {children}
        </div>
    );
};

export default ResponsiveGrid; 