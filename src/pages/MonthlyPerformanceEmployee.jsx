import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/card';
import ResponsiveGrid from '@/components/ui/ResponsiveGrid';
import { fadeIn, slideUp } from '@/utils/motionVariants';

const monthNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const MonthlyPerformanceEmployee = ({ employeeData = [] }) => {
    const [showAll, setShowAll] = useState(false);

    // Make sure employeeData is an array
    const dataArray = Array.isArray(employeeData) ? employeeData : [];

    // If no data, show a message
    if (dataArray.length === 0) {
        return (
            <div className="text-center py-6">
                <p className="text-gray-500">No employee performance data available.</p>
            </div>
        );
    }

    // Show only the top 3 employees by default
    const visibleEmployees = showAll ? dataArray : dataArray.slice(0, 3);

    return (
        <div>
            <h2 className="text-2xl font-semibold mb-4">Employee Performance</h2>
            <ResponsiveGrid xs={1} sm={1} md={2} lg={3}>
                {visibleEmployees.map((employeeData, index) => (
                    <motion.div key={index} variants={slideUp}>
                        <Card 
                            title={employeeData.name || `Employee ${index + 1}`}
                            footerText={employeeData.performanceAmount || "N/A"}
                        >
                            <div className="space-y-2">
                                <p className="text-lg text-gray-600">
                                    Sales: ₹ {(employeeData.TotalSales || employeeData.totalSalesAmount || 0).toLocaleString()}
                                </p>
                                <p className="text-lg text-gray-600">
                                    Target: ₹ {(employeeData.targetAmount || 0).toLocaleString()}
                                </p>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </ResponsiveGrid>

            {/* Show More / Show Less Button */}
            {dataArray.length > 3 && (
                <div className="mt-4 text-center">
                    <button
                        className="text-primary font-semibold underline cursor-pointer"
                        onClick={() => setShowAll(!showAll)}
                    >
                        {showAll ? "Show Less" : "See More"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default MonthlyPerformanceEmployee;
