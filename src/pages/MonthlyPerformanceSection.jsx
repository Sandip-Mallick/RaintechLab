import React from 'react';
import { motion } from 'framer-motion';
import { fadeIn } from '@/utils/motionVariants';
import MonthlyPerformanceChart from './MonthlyPerformanceChart';

const MonthlyPerformanceSection = ({ performanceData, title = 'Monthly Performance', hideYearSelector = false }) => {
    // Check if we have valid performance data
    const hasData = Array.isArray(performanceData) && performanceData.length > 0;
    
    // Calculate if data has actual or target values
    const hasActualValues = hasData && performanceData.some(item => 
        (item.totalSalesAmount > 0 || item.totalAmount > 0 || item.actualValue > 0 || item.actual > 0));
        
    const hasTargetValues = hasData && performanceData.some(item => 
        (item.targetAmount > 0 || item.totalTarget > 0 || item.targetValue > 0 || item.target > 0));

    console.log(`[${title}] Data validation - hasData: ${hasData}, hasActualValues: ${hasActualValues}, hasTargetValues: ${hasTargetValues}`);
    
    if (hasData && hasTargetValues) {
        console.log(`[${title}] Target values detected in performance data:`, 
            performanceData
                .filter(item => item.targetAmount > 0 || item.totalTarget > 0 || item.targetValue > 0 || item.target > 0)
                .map(item => ({ month: item.month, target: item.targetAmount || item.totalTarget || item.targetValue || item.target }))
        );
    }

    return (
        <div>
            {!hasData && (
                <div className="bg-white p-6 rounded shadow text-center">
                    <p className="text-gray-500">No performance data available.</p>
                </div>
            )}
            
            {hasData && !hasActualValues && !hasTargetValues && (
                <div className="bg-white p-6 rounded shadow text-center">
                    <p className="text-gray-500">No target or actual data available for the selected period.</p>
                </div>
            )}
            
            {hasData && (hasActualValues || hasTargetValues) && (
                <MonthlyPerformanceChart 
                    performanceData={performanceData} 
                    title={title}
                    hideYearSelector={hideYearSelector}
                />
            )}
        </div>
    );
};

export default MonthlyPerformanceSection;
