import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/card';
import { fadeIn } from '@/utils/motionVariants';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import { API_URL } from '@/config/env';
import { getAssignedTargets } from '@/services/targetService';

// Month names array for conversion
const monthNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const MonthlyPerformanceChart = ({ performanceData, title = "Monthly Performance", hideYearSelector = false }) => {
    const [selectedYear, setSelectedYear] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [availableYears, setAvailableYears] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [realData, setRealData] = useState([]);
    const [targetData, setTargetData] = useState([]);
    
    // Initialize available years when component loads
    useEffect(() => {
        // Extract year from the first data point if available
        if (Array.isArray(performanceData) && performanceData.length > 0) {
            const dataYear = performanceData[0].year;
            if (dataYear && !isNaN(parseInt(dataYear))) {
                const year = parseInt(dataYear);
                console.log(`[${title}] Setting initial year from data: ${year}`);
                setSelectedYear(year);
                return;
            }
        }
        
        // Fallback to current year
        const currentYear = new Date().getFullYear();
        console.log(`[${title}] Setting initial year to current year: ${currentYear}`);
        setSelectedYear(currentYear);
    }, [performanceData, title]);
    
    // Fetch and store targets separately
    useEffect(() => {
        const fetchTargets = async () => {
            try {
                console.log(`[${title}] Starting to fetch targets...`);
                // Extract year from performanceData to fetch targets for the correct year
                let yearToFetch = null;
                if (Array.isArray(performanceData) && performanceData.length > 0) {
                    yearToFetch = performanceData[0].year;
                    if (yearToFetch) {
                        console.log(`[${title}] Fetching targets for year from data: ${yearToFetch}`);
                    }
                }
                
                const targets = await getAssignedTargets(yearToFetch);
                console.log(`[${title}] Fetched all targets for year ${yearToFetch || 'all'}:`, targets);
                
                if (Array.isArray(targets) && targets.length > 0) {
                    // Ensure all target years are properly parsed as integers
                    const parsedTargets = targets.map(target => ({
                        ...target,
                        year: parseInt(target.year || new Date().getFullYear()),
                        month: parseInt(target.month || 1)
                    }));
                    
                    // For sales chart, filter only sales targets
                    // For orders chart, filter only order targets
                    const relevantTargets = parsedTargets.filter(target => {
                        const targetType = (target.targetType || '').toLowerCase();
                        
                        if (title.toLowerCase().includes('sale')) {
                            const isSalesTarget = targetType === 'sale' || targetType === 'sales';
                            console.log(`[${title}] Target ${target._id || 'unknown'} type=${targetType}, isSalesTarget=${isSalesTarget}`);
                            return isSalesTarget;
                        } else {
                            const isOrderTarget = targetType === 'order' || targetType === 'orders';
                            console.log(`[${title}] Target ${target._id || 'unknown'} type=${targetType}, isOrderTarget=${isOrderTarget}`);
                            return isOrderTarget;
                        }
                    });
                    
                    console.log(`[${title}] Filtered relevant targets (${relevantTargets.length}):`, relevantTargets);
                    
                    if (relevantTargets.length === 0) {
                        // If no relevant targets found, try to be more lenient with filtering
                        console.log(`[${title}] No ${title.includes('Sales') ? 'sales' : 'orders'} targets found, checking all targets...`);
                        
                        // Try showing all targets for debugging
                        console.log(`[${title}] All available targets:`, targets);
                        
                        // As a fallback, try extracting targets from performance data
                        const fallbackTargets = extractTargetsFromPerformanceData();
                        if (fallbackTargets.length > 0) {
                            console.log(`[${title}] Using fallback targets from performance data:`, fallbackTargets);
                            setTargetData(fallbackTargets);
                            return;
                        }
                    }
                    
                    // Log the years available in the targets
                    const targetYears = [...new Set(relevantTargets.map(t => t.year))].sort();
                    console.log(`[${title}] Target years available:`, targetYears);
                    
                    setTargetData(relevantTargets);
                } else {
                    console.log(`[${title}] No targets found from API, trying fallback...`);
                    
                    // As a fallback, try extracting targets from performance data
                    const fallbackTargets = extractTargetsFromPerformanceData();
                    if (fallbackTargets.length > 0) {
                        console.log(`[${title}] Using fallback targets from performance data:`, fallbackTargets);
                        setTargetData(fallbackTargets);
                        return;
                    }
                }
            } catch (error) {
                console.error(`[${title}] Error fetching targets:`, error);
                
                // As a fallback, try extracting targets from performance data
                const fallbackTargets = extractTargetsFromPerformanceData();
                if (fallbackTargets.length > 0) {
                    console.log(`[${title}] Using fallback targets from performance data after error:`, fallbackTargets);
                    setTargetData(fallbackTargets);
                }
            }
        };
        
        fetchTargets();
    }, [title, performanceData]);
    
    // Helper to extract targets from performance data as fallback
    const extractTargetsFromPerformanceData = () => {
        if (!Array.isArray(performanceData) || performanceData.length === 0) {
            return [];
        }
        
        // Extract target information from performance data
        return performanceData.map(item => {
            // Ensure month and year are properly parsed
            const month = parseInt(item.month || new Date().getMonth() + 1);
            const year = parseInt(item.year || new Date().getFullYear());
            
            // Extract target values from relevant fields
            const targetAmount = parseFloat(
                item.totalTarget !== undefined ? item.totalTarget :
                item.targetAmount !== undefined ? item.targetAmount :
                item.targetValue !== undefined ? item.targetValue :
                item.target !== undefined ? item.target : 0
            );
            
            return {
                _id: `fallback-${month}-${year}`,
                month: month,
                year: year,
                targetAmount: targetAmount,
                // Infer target type from chart title
                targetType: title.toLowerCase().includes('sale') ? 'sale' : 'order'
            };
        });
    };
    
    // Log the incoming data for debugging
    useEffect(() => {
        // This effect should run whenever the performanceData changes
        console.log(`[${title}] Received new performance data with ${performanceData?.length || 0} items`);
        
        if (Array.isArray(performanceData) && performanceData.length > 0) {
            // Log the year from the data
            const years = [...new Set(performanceData.map(item => parseInt(String(item.year))))];
            console.log(`[${title}] Years in the data: ${years.join(', ')}`);
            
            // Automatically set the selected year based on the first item in the data
            // This ensures the chart always shows data for the year that was filtered in the parent component
            const dataYear = parseInt(String(performanceData[0].year));
            if (dataYear && !isNaN(dataYear)) {
                console.log(`[${title}] Auto-selecting year from data: ${dataYear}`);
                setSelectedYear(dataYear);
            }
        }
    }, [performanceData, title]);
    
    // Process the incoming performance data
    useEffect(() => {
        // Skip if no data
        if (!Array.isArray(performanceData) || performanceData.length === 0) {
            console.log(`[${title}] No performance data to process`);
            
            // Instead of returning, create empty data points for all months of current year
            const currentYear = selectedYear || new Date().getFullYear();
            const emptyData = Array.from({ length: 12 }, (_, i) => ({
                month: i + 1,
                year: currentYear,
                actualValue: 0,
                targetValue: 0,
                totalSalesAmount: 0,
                totalSales: 0,
                totalAmount: 0,
                totalTarget: 0,
                targetAmount: 0
            }));
            
            console.log(`[${title}] Created empty data points for ${currentYear}:`, emptyData);
            setRealData(emptyData);
            return;
        }
        
        console.log(`[${title}] Processing performance data with ${performanceData.length} items`);
        
        // Log the first few items for debugging
        const sampleData = performanceData.slice(0, 3);
        console.log(`[${title}] Data sample:`, sampleData);
        
        // Check if target data exists in the performance data
        const hasTargets = performanceData.some(item => 
            item.targetAmount > 0 || item.totalTarget > 0 || item.targetValue > 0 || item.target > 0);
        console.log(`[${title}] Performance data has targets: ${hasTargets}`);
        
        // Process and normalize the data
        const processedData = performanceData.map(item => {
            // Extract and ensure month and year are numbers
            const month = item.month ? parseInt(String(item.month)) : new Date().getMonth() + 1;
            const year = item.year ? parseInt(String(item.year)) : new Date().getFullYear();
            
            // Extract actual value - standardize access
            let actualValue = 0;
            let targetValue = 0;
            
            // Determine data type based on title to prioritize correct fields
            if (title.toLowerCase().includes('sale')) {
                // For Sales Chart - check all possible field names in order of priority
                if (item.totalSalesAmount !== undefined) {
                    actualValue = parseFloat(item.totalSalesAmount || 0);
                }
                else if (item.totalSales !== undefined) {
                    actualValue = parseFloat(item.totalSales || 0);
                }
                else if (item.salesAmount !== undefined) {
                    actualValue = parseFloat(item.salesAmount || 0);
                }
                else if (item.sales !== undefined) {
                    actualValue = parseFloat(item.sales || 0);
                }
                else if (item.amount !== undefined) {
                    actualValue = parseFloat(item.amount || 0);
                }
                else if (item.actualValue !== undefined) {
                    actualValue = parseFloat(item.actualValue || 0);
                }
                else if (item.actual !== undefined) {
                    actualValue = parseFloat(item.actual || 0);
                }
            } else {
                // For Orders Chart - check all possible field names in order of priority
                if (item.totalAmount !== undefined) {
                    actualValue = parseFloat(item.totalAmount || 0);
                }
                else if (item.orderAmount !== undefined) {
                    actualValue = parseFloat(item.orderAmount || 0);
                }
                else if (item.totalSalesAmount !== undefined) {
                    actualValue = parseFloat(item.totalSalesAmount || 0);
                }
                else if (item.totalSales !== undefined) {
                    actualValue = parseFloat(item.totalSales || 0);
                }
                else if (item.amount !== undefined) {
                    actualValue = parseFloat(item.amount || 0);
                }
                else if (item.actualValue !== undefined) {
                    actualValue = parseFloat(item.actualValue || 0);
                }
                else if (item.actual !== undefined) {
                    actualValue = parseFloat(item.actual || 0);
                }
            }
            
            // Extract target value from all possible field names
            if (item.targetAmount !== undefined) {
                targetValue = parseFloat(item.targetAmount || 0);
            }
            else if (item.totalTarget !== undefined) {
                targetValue = parseFloat(item.totalTarget || 0);
            }
            else if (item.target !== undefined) {
                targetValue = parseFloat(item.target || 0);
            }
            else if (item.targetValue !== undefined) {
                targetValue = parseFloat(item.targetValue || 0);
            }
            
            // Log the extracted values
            if (actualValue > 0 || targetValue > 0) {
                console.log(`[${title}] Month ${month} data: actual=${actualValue}, target=${targetValue}, year=${year}`);
            }
            
            return {
                month,
                year,
                // Store the values we'll use for the chart
                actualValue,
                targetValue,
                actual: actualValue, // Make sure we have the 'actual' field
                target: targetValue, // Make sure we have the 'target' field
                // Make sure all standard fields are set for compatibility
                totalSalesAmount: actualValue,
                totalSales: actualValue,
                totalAmount: actualValue,
                totalTarget: targetValue,
                targetAmount: targetValue,
                // Keep original fields too
                ...item
            };
        });
        
        console.log(`[${title}] Processed all ${processedData.length} data points for chart`);
        
        // Log information about targets in processed data
        const processedHasTargets = processedData.some(item => item.targetValue > 0 || item.target > 0);
        console.log(`[${title}] Processed data has targets: ${processedHasTargets}`);
        if (processedHasTargets) {
            const targetsData = processedData.filter(item => item.targetValue > 0 || item.target > 0)
                .map(item => ({ month: item.month, targetValue: item.targetValue, target: item.target }));
            console.log(`[${title}] Target values found:`, targetsData);
        }
        
        setRealData(processedData);
    }, [performanceData, title, selectedYear]);
    
    // Extract unique years from the data and update availableYears
    useEffect(() => {
        if (Array.isArray(realData) && realData.length > 0) {
            // Extract years from performance data
            const performanceYears = [...new Set(realData.map(item => parseInt(String(item.year))).filter(Boolean))];
            
            // Extract years from target data
            const targetYears = Array.isArray(targetData) && targetData.length > 0 
                ? [...new Set(targetData.map(item => parseInt(String(item.year))).filter(Boolean))]
                : [];
                
            // Combine all years
            const dataYears = [...new Set([...performanceYears, ...targetYears])];
            
            const currentYear = new Date().getFullYear();
            
            // Add current year and surrounding years if not already included
            const allYears = [...new Set([...dataYears, currentYear - 1, currentYear, currentYear + 1])].sort((a, b) => b - a);
            
            console.log(`[${title}] Available years from performance data:`, performanceYears);
            console.log(`[${title}] Available years from targets:`, targetYears);
            console.log(`[${title}] Combined available years:`, allYears);
            
            setAvailableYears(allYears);
            
            // Set selected year if not already set to a valid year
            if (!selectedYear || !allYears.includes(selectedYear)) {
                // Default to current year or first year in data if current year not available
                const defaultYear = allYears.includes(currentYear) ? currentYear : allYears[0];
                console.log(`[${title}] Setting default year to ${defaultYear}`);
                setSelectedYear(defaultYear);
            }
        }
    }, [realData, targetData, selectedYear]);
    
    // Prepare chart data for selected year
    useEffect(() => {
        if (!selectedYear) return;
        
        console.log(`[${title}] Preparing chart data for year:`, selectedYear);
        
        // Create array for all 12 months with default values
        const monthlyData = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            name: monthNames[i + 1],
            actual: 0,
            target: 0
        }));
        
        // Filter data for selected year - ensure proper type conversion for comparison
        const yearData = realData.filter(item => {
            // Ensure both values are treated as numbers for comparison
            const itemYear = parseInt(String(item.year || '0'));
            const selectedYearInt = parseInt(String(selectedYear || '0'));
            return itemYear === selectedYearInt;
        });
        
        console.log(`[${title}] Filtered performance data for year ${selectedYear}:`, yearData.length, "items");
        
        // Fill in actual data for each month - use the standardized actualValue field
        yearData.forEach(item => {
            const month = parseInt(String(item.month || '0'));
            if (month && month >= 1 && month <= 12) {
                const monthIndex = month - 1;
                
                // Try both field naming conventions for maximum compatibility
                let actualValue = 0;
                if (item.actual !== undefined && item.actual !== null) {
                    actualValue = parseFloat(item.actual || 0);
                } else if (item.actualValue !== undefined && item.actualValue !== null) {
                    actualValue = parseFloat(item.actualValue || 0);
                } else if (item.totalSalesAmount !== undefined && item.totalSalesAmount !== null) {
                    actualValue = parseFloat(item.totalSalesAmount || 0);
                } else if (item.totalAmount !== undefined && item.totalAmount !== null) {
                    actualValue = parseFloat(item.totalAmount || 0);
                }
                
                // Try both field naming conventions for target
                let targetValue = 0;
                if (item.target !== undefined && item.target !== null) {
                    targetValue = parseFloat(item.target || 0);
                } else if (item.targetValue !== undefined && item.targetValue !== null) {
                    targetValue = parseFloat(item.targetValue || 0);
                } else if (item.targetAmount !== undefined && item.targetAmount !== null) {
                    targetValue = parseFloat(item.targetAmount || 0);
                } else if (item.totalTarget !== undefined && item.totalTarget !== null) {
                    targetValue = parseFloat(item.totalTarget || 0);
                }
                
                if (actualValue > 0 || targetValue > 0) {
                    console.log(`[${title}] Setting month ${month} data: actual=${actualValue}, target=${targetValue}`);
                }
                
                // Update month data
                monthlyData[monthIndex] = {
                    ...monthlyData[monthIndex],
                    actual: actualValue,
                    target: targetValue
                };
            }
        });
        
        // Check if we have any target data in the monthly data
        const hasTargetData = monthlyData.some(item => item.target > 0);
        console.log(`[${title}] Chart data has targets: ${hasTargetData}`);
        
        // Log the target values for debugging
        if (hasTargetData) {
            const targetsData = monthlyData
                .filter(item => item.target > 0)
                .map(item => ({ month: item.month, name: item.name, target: item.target }));
            console.log(`[${title}] Target values in chart data:`, targetsData);
        } else {
            console.log(`[${title}] No targets found in chart data for year ${selectedYear}`);
            
            // Now, try to fill in the target data from the separately fetched targets
            if (Array.isArray(targetData) && targetData.length > 0) {
                console.log(`[${title}] Attempting to use separately fetched targets (${targetData.length} items) for year ${selectedYear}`);
                
                // Ensure proper type conversion when filtering by year
                const yearTargets = targetData.filter(target => {
                    // Ensure both values are treated as numbers for comparison
                    const targetYear = parseInt(String(target.year || '0'));
                    const selectedYearInt = parseInt(String(selectedYear || '0'));
                    return targetYear === selectedYearInt;
                });
                
                console.log(`[${title}] Filtered targets for year ${selectedYear}: ${yearTargets.length} targets`);
                
                // Check if we found any targets for the selected year
                if (yearTargets.length === 0) {
                    console.log(`[${title}] No targets found for year ${selectedYear} in the targetData`);
                } else {
                    yearTargets.forEach(target => {
                        const month = parseInt(String(target.month || '0'));
                        if (month && month >= 1 && month <= 12) {
                            const monthIndex = month - 1;
                            
                            // Get target amount - try all possible field names
                            const targetValue = parseFloat(
                                target.targetAmount !== undefined ? target.targetAmount :
                                target.amount !== undefined ? target.amount :
                                target.target !== undefined ? target.target : 0
                            );
                            
                            console.log(`[${title}] Setting target for Month ${month}: Target=${targetValue}`);
                            
                            // Only update if we have a valid target value
                            if (targetValue > 0) {
                                monthlyData[monthIndex] = {
                                    ...monthlyData[monthIndex],
                                    target: targetValue
                                };
                            }
                        }
                    });
                    
                    // Check if we successfully added targets
                    const nowHasTargets = monthlyData.some(item => item.target > 0);
                    if (nowHasTargets) {
                        console.log(`[${title}] Successfully added targets from targetData`);
                    }
                }
            }
        }
        
        // Log final chart data for debugging
        console.log(`[${title}] Final chart data (all 12 months):`, monthlyData);
        
        // Set the chart data
        setChartData(monthlyData);
    }, [realData, targetData, selectedYear, title]);
    
    // Custom tooltip for the chart
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            // Actual value may be in first or second position depending on which bar is hovered
            const actualPayload = payload.find(p => p.dataKey === 'actual');
            const targetPayload = payload.find(p => p.dataKey === 'target');
            
            const actualValue = actualPayload?.value || 0;
            const targetValue = targetPayload?.value || 0;
            
            // Calculate performance percentage
            const performancePercent = targetValue > 0 
                ? Math.round((actualValue / targetValue) * 100) 
                : 0;
            
            // Determine color based on performance
            const performanceColor = 
                performancePercent >= 100 ? "#22c55e" :  // Green for ≥100%
                performancePercent >= 80 ? "#3ebe85" :   // Light green for ≥80%
                performancePercent >= 50 ? "#f59e0b" :   // Yellow for ≥50%
                "#ef4444";                               // Red for <50%
            
            // Check if it's a sales or orders chart
            const isSalesChart = title.toLowerCase().includes('sale');
            
            return (
                <div className="bg-white p-3 shadow-md rounded-md border border-gray-200">
                    <p className="font-semibold text-gray-900 mb-1">{label}</p>
                    
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">
                            {isSalesChart ? 'Total Sales:' : 'Total Orders:'}
                        </span>
                        <span className="font-semibold text-[#3ebe85]">
                            ₹{actualValue.toLocaleString()}
                        </span>
                    </div>
                    
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">{isSalesChart ? 'Target Sales:' : 'Target Orders:'}</span>
                        <span className="font-semibold text-[#584de5]">
                            ₹{targetValue.toLocaleString()}
                        </span>
                    </div>
                    
                    {targetValue > 0 && (
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                            <span className="text-sm text-gray-600">Performance:</span>
                            <span className="font-semibold" style={{ color: performanceColor }}>
                                {performancePercent}%
                            </span>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div variants={fadeIn} className="w-full">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">
                    {title.includes('(') ? (
                        <>
                            {title.split('(')[0]}
                            <span className="text-gray-600 font-normal">
                                ({title.split('(')[1]}
                            </span>
                        </>
                    ) : (
                        title
                    )}
                </h2>
                
                {/* Only render the year selector if not hidden */}
                {!hideYearSelector && (
                    <div className="flex items-center">
                        <label htmlFor={`yearSelect-${title}`} className="mr-2 text-gray-600">Year:</label>
                        <select
                            id={`yearSelect-${title}`}
                            value={selectedYear || ''}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="border border-gray-300 rounded-md p-2 text-sm"
                        >
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
            
            <Card className="p-0 overflow-hidden">
                <div className="p-4 pb-0">
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                                dataKey="name" 
                                interval={0}
                                angle={-45}
                                textAnchor="end"
                                height={50}
                                tick={{fontSize: 12}}
                            />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar 
                                dataKey="actual" 
                                name={title.toLowerCase().includes('sale') ? 'Total Sales' : 'Total Orders'} 
                                fill="#3ebe85" 
                                radius={[4, 4, 0, 0]} 
                                isAnimationActive={true}
                                animationDuration={1000}
                            />
                            <Bar 
                                dataKey="target" 
                                name={title.toLowerCase().includes('sale') ? 'Target Sales' : 'Target Orders'} 
                                fill="#584de5" 
                                radius={[4, 4, 0, 0]} 
                                isAnimationActive={true}
                                animationDuration={1000}
                                animationBegin={300}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </motion.div>
    );
};

export default MonthlyPerformanceChart; 