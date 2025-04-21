// src/pages/EmployeeDashboard.js
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/card';
import ResponsiveGrid from '@/components/ui/ResponsiveGrid';
import { getEmployeePerformance, getMonthlyEmployeePerformance, getEmployeeSales } from '@/services/salesService';
import { getEmployeeOrders, getEmployeeOrderPerformance, getMonthlyOrderPerformance } from '@/services/orderService';
import {
    BarChart, Bar, XAxis, YAxis, LineChart, Line, PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Loader, DollarSign, Target, PieChart as PieChartIcon, Plus, RotateCcw, Filter } from 'lucide-react';
import { slideUp, fadeIn } from '@/utils/motionVariants';
import { getAssignedTargets } from '@/services/targetService';
import MonthlyPerformanceSection from './MonthlyPerformanceSection';
import { getUserProfile } from '@/services/apiService';
import Button from '@/components/ui/Button';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#FF6347', '#FFD700', '#32CD32', '#4169E1', '#8A2BE2', '#FF4500'];

// Month names array for conversion
const monthNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const EmployeeDashboard = () => {
    const [performance, setPerformance] = useState({ totalSalesAmount: 0, totalSalesQty: 0 });
    const [orderPerformance, setOrderPerformance] = useState({ totalAmount: 0, totalOrderQty: 0 });
    const [monthlyPerformance, setMonthlyPerformance] = useState([]);
    const [monthlyOrderPerformance, setMonthlyOrderPerformance] = useState([]);
    const [loading, setLoading] = useState(false);
    const [target, setTarget] = useState(0);
    const [orderTarget, setOrderTarget] = useState(0);
    const [userProfile, setUserProfile] = useState(null);
    const [permissions, setPermissions] = useState(null);
    const [showSalesData, setShowSalesData] = useState(false);
    const [showOrdersData, setShowOrdersData] = useState(false);
    const [debugInfo, setDebugInfo] = useState({});
    const [salesListData, setSalesListData] = useState([]);
    const [selectedYear, setSelectedYear] = useState("");
    const [appliedYear, setAppliedYear] = useState(null);
    const [availableYears, setAvailableYears] = useState([]);
    const [showAllData, setShowAllData] = useState(true);
    const [hasFilteredData, setHasFilteredData] = useState(false);

    useEffect(() => {
        fetchUserProfile();
    }, []);

    // Fetch user profile and get data for the first time
    useEffect(() => {
        if (userProfile && userProfile.permissions) {
            setPermissions(userProfile.permissions);
            fetchAllDataAndDetermineYears();
        }
    }, [userProfile]);

    // Function to fetch all data and determine available years
    const fetchAllDataAndDetermineYears = async () => {
        try {
            setLoading(true);
            
            // Get user profile and permissions
            const userProfile = await getUserProfile();
            const hasSalesPermission = userProfile?.permissions?.includes('sales') || userProfile?.role === 'admin';
            const hasOrdersPermission = userProfile?.permissions?.includes('orders') || userProfile?.role === 'admin';
            
            console.log("Fetching all data to determine available years");
            
            // Fetch targets
            const targets = await getAssignedTargets();
            
            // Get available years from targets
            const targetYears = Array.isArray(targets) ? 
                [...new Set(targets.map(target => parseInt(String(target.year))).filter(Boolean))] : [];
            
            console.log("Years from targets:", targetYears);
            
            // Get sales data if permitted
            let salesYears = [];
            if (hasSalesPermission) {
                const sales = await getEmployeeSales();
                salesYears = Array.isArray(sales) ? 
                    [...new Set(sales.map(sale => {
                        const date = new Date(sale.date || sale.createdAt);
                        return date.getFullYear();
                    }).filter(Boolean))] : [];
                    
                console.log("Years from sales:", salesYears);
            }
            
            // Get orders data if permitted
            let orderYears = [];
            if (hasOrdersPermission) {
                const orders = await getEmployeeOrders();
                orderYears = Array.isArray(orders) ? 
                    [...new Set(orders.map(order => {
                        const date = new Date(order.date || order.createdAt);
                        return date.getFullYear();
                    }).filter(Boolean))] : [];
                    
                console.log("Years from orders:", orderYears);
            }
            
            // Combine all years
            const allYears = [...new Set([...targetYears, ...salesYears, ...orderYears])];
            
            // Add current year if not already included
            const currentYear = new Date().getFullYear();
            if (!allYears.includes(currentYear)) {
                allYears.push(currentYear);
            }
            
            // Sort years in descending order
            allYears.sort((a, b) => b - a);
            
            console.log("All available years:", allYears);
            
            // Update available years and default to current year
            setAvailableYears(allYears);
            setSelectedYear(currentYear.toString());
            
            // Fetch initial data - show all data by default
            setShowAllData(true);
            setHasFilteredData(false);
            setAppliedYear(null);
            fetchPerformanceData(null, true);
            
            setLoading(false);
        } catch (error) {
            console.error("Error initializing data:", error);
            toast.error("Failed to initialize dashboard data");
            setLoading(false);
        }
    };

    // Handle year change
    const handleYearChange = (e) => {
        const newYear = e.target.value;
        console.log(`Selected year changed to: ${newYear}`);
        setSelectedYear(newYear);
    };

    // Apply the selected year filter
    const handleApplyFilter = () => {
        if (!selectedYear) {
            toast.info('Please select a year first');
            return;
        }
        
        const yearToApply = parseInt(String(selectedYear));
        console.log(`Applying filter for year: ${yearToApply}`);
        setAppliedYear(yearToApply);
        setShowAllData(false);
        setHasFilteredData(true);
        
        // Pass the year explicitly and set allData to false
        // Force refetch of all data including targets
        fetchPerformanceData(yearToApply, false, true);
        toast.success(`Filtered data for year ${yearToApply}`);
    };

    // Handle reset (show all data)
    const handleReset = () => {
        setSelectedYear("");
        setAppliedYear(null);
        setShowAllData(true);
        setHasFilteredData(false);
        
        // Pass null for year and true for allData
        // Force refetch of all data including targets
        fetchPerformanceData(null, true, true);
        toast.info('Showing all data');
    };

    // Fetch user profile to get permissions
    const fetchUserProfile = async () => {
        try {
            const userProfile = await getUserProfile();
            console.log('User profile:', userProfile);
            setUserProfile(userProfile);
            
            // Set permissions flags
            const hasSales = userProfile?.permissions?.includes('sales') || 
                              userProfile?.permissions === 'Sales' || 
                              userProfile?.permissions === 'Sales & Orders' || 
                              userProfile?.permissions === 'All Permissions' || 
                              userProfile?.role === 'admin';
                              
            const hasOrders = userProfile?.permissions?.includes('orders') || 
                               userProfile?.permissions === 'Orders' || 
                               userProfile?.permissions === 'Sales & Orders' || 
                               userProfile?.permissions === 'All Permissions' || 
                               userProfile?.role === 'admin';
                               
            console.log(`Setting permission flags - Sales: ${hasSales}, Orders: ${hasOrders}`);
            setShowSalesData(hasSales);
            setShowOrdersData(hasOrders);
            
        } catch (error) {
            console.error('Error fetching user profile:', error);
            if (error.status === 401) {
                console.error('Authentication error:', error);
            }
        }
    };

    // Fetch Employee Performance Data - Improved handling of targets and performance data
    const fetchPerformanceData = async (year = null, allData = false, forceRefetch = false) => {
        try {
            setLoading(true);
            let debugData = {};
            
            // If no year provided, use the selected year
            const filterYear = allData ? null : (year || appliedYear);
            console.log(`Fetching performance data for ${allData ? 'all years' : `year ${filterYear}`}`);
            
            // Get user profile
            const userProfile = await getUserProfile();
            console.log("User profile data:", userProfile);
            debugData.userProfile = userProfile;
            
            // Determine permissions - check all possible permission formats
            const hasSalesPermission = userProfile?.permissions?.includes('sales') || 
                                      userProfile?.permissions === 'Sales' || 
                                      userProfile?.permissions === 'Sales & Orders' || 
                                      userProfile?.permissions === 'All Permissions' ||
                                      userProfile?.role === 'admin';
                                      
            const hasOrdersPermission = userProfile?.permissions?.includes('orders') || 
                                       userProfile?.permissions === 'Orders' || 
                                       userProfile?.permissions === 'Sales & Orders' || 
                                       userProfile?.permissions === 'All Permissions' ||
                                       userProfile?.role === 'admin';
            
            console.log("Permissions:", userProfile?.permissions);
            console.log("Has sales permission:", hasSalesPermission);
            console.log("Has orders permission:", hasOrdersPermission);
            debugData.permissions = {
                raw: userProfile?.permissions,
                hasSales: hasSalesPermission,
                hasOrders: hasOrdersPermission
            };
            
            // Set permission state for UI visibility
            setShowSalesData(hasSalesPermission);
            setShowOrdersData(hasOrdersPermission);
            
            // Get assigned targets first - pass the filter year to the API
            console.log(`Fetching assigned targets for ${filterYear ? 'year ' + filterYear : 'all years'}`);
            let targets = [];
            try {
                // Pass the filterYear directly to getAssignedTargets if it's available
                targets = await getAssignedTargets(filterYear);
                console.log(`All targets for ${filterYear ? 'year ' + filterYear : 'all years'}:`, targets);
                debugData.targets = {
                    count: targets.length,
                    data: targets
                };
                
                // Force a small delay to ensure targets are processed before sales/orders data
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (targetError) {
                console.error("Error fetching targets:", targetError);
                targets = [];
                toast.error('Failed to load targets data');
                debugData.targetError = targetError.message;
            }
            
            // Process targets data - ensure correctly normalized
            const normalizedTargets = Array.isArray(targets) ? targets.map(target => {
                // Normalize target types to match the standard used in targetService
                let targetType = (target.targetType || 'sale').toLowerCase();
                
                // Standardize to 'sale' and 'order' as in targetService
                if (targetType === 'sales') targetType = 'sale';
                if (targetType === 'orders') targetType = 'order';
                
                console.log(`Normalizing target: Original type=${target.targetType}, Normalized type=${targetType}`);
                
                return {
                ...target,
                    targetType: targetType,
                    // Ensure numeric fields
                    targetAmount: parseFloat(target.targetAmount || 0),
                    targetQty: parseFloat(target.targetQty || 0),
                    month: parseInt(target.month || 1),
                    year: parseInt(target.year || new Date().getFullYear())
                };
            }) : [];
            
            // Create a Set to track processed target IDs and avoid duplicates
            const processedTargetIds = new Set();
            
            // Deduplicate targets
            const uniqueTargets = normalizedTargets.filter(target => {
                const targetId = target._id?.toString();
                if (!targetId) return true; // Keep targets without IDs
                
                if (processedTargetIds.has(targetId)) {
                    return false;
                }
                
                processedTargetIds.add(targetId);
                return true;
            });
            
            // Filter targets by year if not showing all data
            const filteredTargets = allData ? uniqueTargets : uniqueTargets.filter(target => {
                const targetYear = parseInt(String(target.year));
                const filterYearInt = parseInt(String(filterYear));
                return !filterYear || targetYear === filterYearInt;
            });
            
            console.log(`Unique targets: ${uniqueTargets.length}, Filtered by year: ${filteredTargets.length}, Filter year: ${filterYear}`);
            
            // Verify count of order targets specifically
            const orderTargetsCount = filteredTargets.filter(t => 
                t.targetType?.toLowerCase() === 'order' || 
                t.targetType?.toLowerCase() === 'orders'
            ).length;
            
            console.log(`Number of ORDER targets after filtering: ${orderTargetsCount}`);
            
            // Process sales data if user has sales permission
            if (hasSalesPermission) {
                try {
                    // 1. Get actual sales data for the employee - the service function already filters by year
                    const actualSales = await getEmployeeSales(filterYear);
                    console.log(`Employee's actual sales data ${filterYear ? 'for year ' + filterYear : 'for all time'}:`, actualSales);
                    
                    // Use the data directly as returned by the service function - it's already filtered
                    const filteredSales = actualSales;
                    console.log(`Using ${filteredSales.length} sales ${filterYear ? 'for year ' + filterYear : 'for all time'}`);
                    
                    // Transform sales data for monthly performance chart
                    const monthlySalesMap = {};
                    // Use filterYear if provided, otherwise use current year for the chart structure
                    const yearToUse = filterYear || new Date().getFullYear();
                    
                    // Create monthly sales data with default values (all months)
                    for (let month = 1; month <= 12; month++) {
                        monthlySalesMap[month] = {
                            month: month,
                            year: yearToUse,
                            totalSalesAmount: 0,
                            totalSales: 0,
                            targetAmount: 0,
                            totalTarget: 0,
                            performance: 0,
                            performanceAmount: "0%",
                            name: monthNames[month], // Add month name for chart
                            actual: 0, // Explicit field needed by chart
                            target: 0,  // Explicit field needed by chart
                            actualValue: 0, // Explicit field for compatibility
                            targetValue: 0  // Explicit field for compatibility
                        };
                    }
                    
                    // Aggregate actual sales by month
                    if (Array.isArray(filteredSales) && filteredSales.length > 0) {
                        filteredSales.forEach(sale => {
                            // Determine sale month and year
                            const saleDate = new Date(sale.date || sale.createdAt);
                            const month = saleDate.getMonth() + 1; // 1-12
                            const year = saleDate.getFullYear();
                            
                            // Only process sales for selected year or all years if showing all data
                            if (allData || !filterYear || year === parseInt(String(yearToUse))) {
                                // Create entry if it doesn't exist (fallback, should already exist)
                                if (!monthlySalesMap[month]) {
                                    monthlySalesMap[month] = {
                                        month: month,
                                        year: yearToUse,
                                        totalSalesAmount: 0,
                                        totalSales: 0,
                                        targetAmount: 0,
                                        totalTarget: 0,
                                        performance: 0,
                                        performanceAmount: "0%",
                                        name: monthNames[month],
                                        actual: 0,
                                        target: 0,
                                        actualValue: 0,
                                        targetValue: 0
                                    };
                                }
                                
                                // Add sale amount - ensure it's a number
                                const saleAmount = parseFloat(sale.salesAmount || sale.amount || 0);
                                monthlySalesMap[month].totalSalesAmount += saleAmount;
                                monthlySalesMap[month].totalSales += saleAmount;
                                monthlySalesMap[month].actual += saleAmount; // For chart
                                monthlySalesMap[month].actualValue = monthlySalesMap[month].totalSalesAmount; // For compatibility
                            }
                        });
                    }
                    
                    // Add target data to monthly sales
                    const salesTargets = filteredTargets.filter(target => {
                        const targetType = (target.targetType || '').toLowerCase();
                        return targetType === 'sale' || targetType === 'sales';
                    });
                    console.log(`Sales targets after filtering: ${salesTargets.length} for year ${yearToUse}`);
                    
                    if (salesTargets.length === 0) {
                        console.log(`No sales targets found for year ${yearToUse}`);
                    }
                    
                    salesTargets.forEach(target => {
                        const month = parseInt(String(target.month || '0'));
                        const year = parseInt(String(target.year || '0'));
                        
                        // Process targets regardless of year - we already filtered them by year earlier
                        if (month && month >= 1 && month <= 12) {
                            const targetAmount = parseFloat(target.targetAmount || target.amount || 0);
                            
                            // Log target data for debugging
                            console.log(`Adding sales target for ${year}-${month}: ${targetAmount}`);
                            
                            // Add target to monthly data
                            if (monthlySalesMap[month]) {
                                monthlySalesMap[month].targetAmount = targetAmount;
                                monthlySalesMap[month].totalTarget = targetAmount;
                                monthlySalesMap[month].target = targetAmount; // For chart
                                monthlySalesMap[month].targetValue = targetAmount; // For compatibility
                    
                                // Calculate performance percentage
                                if (targetAmount > 0) {
                                    const performance = Math.round((monthlySalesMap[month].totalSalesAmount / targetAmount) * 100);
                                    monthlySalesMap[month].performance = performance;
                                    monthlySalesMap[month].performanceAmount = `${performance}%`;
                                }
                            }
                        }
                    });
                    
                    // Convert map to array for chart
                    const formattedMonthlySales = Object.values(monthlySalesMap);
                    console.log("Formatted monthly sales data:", formattedMonthlySales);
                    
                    // Verify data has target values for at least some months
                    const monthsWithTargets = formattedMonthlySales.filter(m => m.target > 0).length;
                    console.log(`Months with sales targets: ${monthsWithTargets} out of 12`);
                    
                    // Update state with monthly sales data
                    setMonthlyPerformance(formattedMonthlySales);
                    
                    // Calculate total sales performance
                    const totalSalesAmount = filteredSales.reduce((sum, item) => {
                        const amount = parseFloat(item.salesAmount || item.amount || 0);
                        console.log(`Sale: ${item.id}, Date: ${item.date}, Amount: ${amount}`);
                        return sum + amount;
                    }, 0);
                    
                    console.log(`Total calculated sales amount for ${filterYear ? 'year ' + filterYear : 'all time'}: ${totalSalesAmount}`);
                    
                    setPerformance({
                        totalSalesAmount: totalSalesAmount,
                        totalSalesQty: filteredSales.length
                    });
                    
                    // Set sales list data
                    setSalesListData(filteredSales);
                    
                    // Calculate total sales target - sum all monthly targets to match the reporting period
                    // This ensures consistency between monthly data and summary data
                    const salesTargetAmount = formattedMonthlySales.reduce((sum, month) => {
                        return sum + parseFloat(month.targetAmount || 0);
                    }, 0);
                    setTarget(salesTargetAmount);
                    
                } catch (error) {
                    console.error("Error fetching sales data:", error);
                    toast.error('Failed to load sales performance data');
                    // Set default values
                    setPerformance({
                        totalSalesAmount: 0,
                        totalSalesQty: 0
                    });
                    setMonthlyPerformance([]);
                    setSalesListData([]);
                }
            }
            
            // Process orders data if user has orders permission
            if (hasOrdersPermission) {
                try {
                    // 1. Get actual orders data for the employee - the service function already filters by year
                    const actualOrders = await getEmployeeOrders(filterYear);
                    console.log(`Employee's actual orders data ${filterYear ? 'for year ' + filterYear : 'for all time'}:`, actualOrders);
                    
                    // Use the data directly as returned by the service function - it's already filtered
                    const filteredOrders = actualOrders;
                    console.log(`Using ${filteredOrders.length} orders ${filterYear ? 'for year ' + filterYear : 'for all time'}`);
                    
                    // Transform orders data for monthly performance chart
                    const monthlyOrdersMap = {};
                    // Use the same year variable for consistency
                    const yearToUse = filterYear || new Date().getFullYear();
                    
                    // Create monthly orders data with default values (all months)
                    for (let month = 1; month <= 12; month++) {
                        monthlyOrdersMap[month] = {
                            month: month,
                            year: yearToUse,
                            totalAmount: 0,
                            orderAmount: 0,
                            totalSalesAmount: 0, // For chart compatibility
                            totalSales: 0,      // For chart compatibility
                            targetAmount: 0,
                            totalTarget: 0,
                            performance: 0,
                            performanceAmount: "0%",
                            name: monthNames[month], // Add month name for chart
                            actual: 0, // Explicit field needed by chart
                            target: 0, // Explicit field needed by chart
                            actualValue: 0, // Explicit field for compatibility
                            targetValue: 0  // Explicit field for compatibility
                        };
                    }
                    
                    // Aggregate actual orders by month
                    if (Array.isArray(filteredOrders) && filteredOrders.length > 0) {
                        filteredOrders.forEach(order => {
                            // Determine order month and year
                            const orderDate = new Date(order.date || order.createdAt);
                            const month = orderDate.getMonth() + 1; // 1-12
                            const year = orderDate.getFullYear();
                            
                            // Only process orders for selected year or all years if showing all data
                            if (allData || !filterYear || year === parseInt(String(yearToUse))) {
                                // Create entry if it doesn't exist (fallback, should already exist)
                                if (!monthlyOrdersMap[month]) {
                                    monthlyOrdersMap[month] = {
                                        month: month,
                                        year: yearToUse,
                                        totalAmount: 0,
                                        orderAmount: 0,
                                        totalSalesAmount: 0, // For chart compatibility
                                        totalSales: 0,      // For chart compatibility
                                        targetAmount: 0,
                                        totalTarget: 0,
                                        performance: 0,
                                        performanceAmount: "0%",
                                        name: monthNames[month],
                                        actual: 0,
                                        target: 0,
                                        actualValue: 0,
                                        targetValue: 0
                                    };
                                }
                                
                                // Add order amount - ensure it's a number
                                const orderAmount = parseFloat(order.orderAmount || order.amount || 0);
                                monthlyOrdersMap[month].totalAmount += orderAmount;
                                monthlyOrdersMap[month].orderAmount += orderAmount;
                                // Make sure we set all possible field names for the charts to recognize
                                monthlyOrdersMap[month].totalSalesAmount += orderAmount;
                                monthlyOrdersMap[month].totalSales += orderAmount;
                                monthlyOrdersMap[month].actual += orderAmount; // For chart
                                monthlyOrdersMap[month].actualValue = monthlyOrdersMap[month].totalAmount; // For compatibility
                            }
                        });
                    }
                    
                    // Add target data to monthly orders
                    const orderTargets = filteredTargets.filter(target => {
                        const targetType = (target.targetType || '').toLowerCase();
                        return targetType === 'order' || targetType === 'orders';
                    });
                    console.log(`Order targets after filtering: ${orderTargets.length} for year ${yearToUse}`);
                    
                    // Log each order target for debugging purposes
                    if (orderTargets.length > 0) {
                        console.log("Order targets details:");
                        orderTargets.forEach((target, idx) => {
                            console.log(`Order target ${idx+1}: Month=${target.month}, Year=${target.year}, Amount=${target.targetAmount}, Type=${target.targetType}`);
                        });
                    } else {
                        console.log(`No order targets found for year ${yearToUse}`);
                    }
                    
                    orderTargets.forEach(target => {
                        const month = parseInt(String(target.month || '0'));
                        const year = parseInt(String(target.year || '0'));
                        
                        // Process targets regardless of year - we already filtered them by year earlier
                        if (month && month >= 1 && month <= 12) {
                            const targetAmount = parseFloat(target.targetAmount || target.amount || 0);
                            
                            // Log target data for debugging
                            console.log(`Adding order target for ${year}-${month}: ${targetAmount}`);
                            
                            // Add target to monthly data
                            if (monthlyOrdersMap[month]) {
                                monthlyOrdersMap[month].targetAmount = targetAmount;
                                monthlyOrdersMap[month].totalTarget = targetAmount;
                                monthlyOrdersMap[month].target = targetAmount; // For chart
                                monthlyOrdersMap[month].targetValue = targetAmount; // For compatibility
                    
                                // Calculate performance percentage
                                if (targetAmount > 0) {
                                    const performance = Math.round((monthlyOrdersMap[month].totalAmount / targetAmount) * 100);
                                    monthlyOrdersMap[month].performance = performance;
                                    monthlyOrdersMap[month].performanceAmount = `${performance}%`;
                                }
                            }
                        }
                    });
                    
                    // Convert map to array for chart
                    const formattedMonthlyOrders = Object.values(monthlyOrdersMap);
                    console.log("Formatted monthly order data:", formattedMonthlyOrders);
                    
                    // Verify data has target values for at least some months
                    const monthsWithTargets = formattedMonthlyOrders.filter(m => m.target > 0).length;
                    console.log(`Months with order targets: ${monthsWithTargets} out of 12`);
                    
                    // Update state with monthly order data
                    setMonthlyOrderPerformance(formattedMonthlyOrders);
                    
                    // Calculate total order performance
                    const totalOrderAmount = filteredOrders.reduce((sum, item) => {
                        const amount = parseFloat(item.orderAmount || item.amount || 0);
                        console.log(`Order: ${item.id}, Date: ${item.date}, Amount: ${amount}`);
                        return sum + amount;
                    }, 0);
                    
                    console.log(`Total calculated order amount for ${filterYear ? 'year ' + filterYear : 'all time'}: ${totalOrderAmount}`);
                    
                    setOrderPerformance({
                        totalAmount: totalOrderAmount,
                        totalOrderQty: filteredOrders.length
                    });
                    
                    // Calculate total order target - sum all monthly targets to match the reporting period
                    // This ensures consistency between monthly data and summary data
                    const orderTargetAmount = formattedMonthlyOrders.reduce((sum, month) => {
                        return sum + parseFloat(month.targetAmount || 0);
                    }, 0);
                    setOrderTarget(orderTargetAmount);
                    
                } catch (error) {
                    console.error("Error fetching orders data:", error);
                    toast.error('Failed to load order performance data');
                    
                    // Set default values when error occurs
                    setOrderPerformance({
                        totalAmount: 0,
                        totalOrderQty: 0
                    });
                    setMonthlyOrderPerformance([]);
                }
            }
            
            setDebugInfo(debugData);
            
        } catch (error) {
            console.error("Error fetching performance data:", error);
            console.error("Error details:", error.response ? error.response.data : error.message);
            setDebugInfo(prev => ({...prev, mainError: error.message}));
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const donutChartData = monthlyPerformance.map((data) => ({
        name: `Month ${data.month}`,
        value: data.totalSalesAmount,
    }));

    // Determine if the user has sales or orders permissions
    const hasSalesPermission = permissions === 'Sales' || permissions === 'Sales & Orders' || permissions === 'All Permissions';
    const hasOrdersPermission = permissions === 'Orders' || permissions === 'Sales & Orders' || permissions === 'All Permissions';

    return (
        <motion.div initial="hidden" animate="visible" className="p-8 bg-background min-h-screen">
            <ToastContainer />

            {/* Dashboard header with year filter and reset button */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-primary">Employee Dashboard</h1>
                
                <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                        <select
                            value={selectedYear}
                            onChange={handleYearChange}
                            className="border border-gray-300 rounded-md p-2 text-sm"
                        >
                            <option value="">Select Year</option>
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                        
                        <Button 
                            onClick={handleApplyFilter} 
                            className="px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-md flex items-center"
                        >
                            <Filter size={16} className="mr-1" />
                            Apply
                        </Button>
                        
                        <Button 
                            onClick={handleReset} 
                            className="bg-gray-100 text-gray-700 hover:bg-gray-200 py-2 px-4 rounded-md"
                            disabled={!hasFilteredData}
                        >
                            Reset
                        </Button>
                    </div>
                </div>
            </div>

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
                    <Loader className="animate-spin text-primary" size={50} />
                </div>
            )}

            {/* Data period indicator */}
            <div className="mb-4 text-center">
                <p className="text-gray-600">
                    {showAllData 
                        ? "Showing all-time data up to today" 
                        : `Showing data for year ${appliedYear}`
                    }
                </p>
            </div>

            {/* Cards for Sales Metrics - Only show if user has Sales permission */}
            {showSalesData && (
                <>
                    <motion.h2 variants={fadeIn} className="text-2xl font-semibold mb-4 text-primary">
                        Sales Performance
                    </motion.h2>
                    <ResponsiveGrid xs={1} sm={1} md={2} lg={3} className="mb-8">
                        <motion.div variants={slideUp}>
                            <Card 
                                title="Total Sales" 
                                icon={<DollarSign size={20} />}
                            >
                                <p className="text-2xl sm:text-3xl font-bold text-accent">
                                    ₹{(performance?.totalSalesAmount || 0).toLocaleString()}
                                </p>
                            </Card>
                        </motion.div>
                        
                        <motion.div variants={slideUp}>
                            <Card 
                                title="Target Sales" 
                                icon={<Target size={20} />}
                            >
                                <p className="text-2xl sm:text-3xl font-bold text-primary">
                                    ₹{(target || 0).toLocaleString()}
                                </p>
                                {/* Display message if no sales targets are found */}
                                {target === 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        No sales targets assigned
                                    </p>
                                )}
                            </Card>
                        </motion.div>
                        
                        <motion.div variants={slideUp}>
                            <Card 
                                title="Sales Performance" 
                                icon={<PieChartIcon size={20} />}
                            >
                                <p className={`text-2xl sm:text-3xl font-bold ${(performance?.totalSalesAmount || 0) >= (target || 0) ? "text-green-500" : "text-yellow-500"}`}>
                                    {performance?.totalSalesAmount && target ? 
                                        ((performance.totalSalesAmount / target) * 100).toFixed(2) + "%" : 
                                        "0.00%"
                                    }
                                </p>
                            </Card>
                        </motion.div>
                    </ResponsiveGrid>
                </>
            )}

            {/* Cards for Order Metrics - Only show if user has Orders permission */}
            {showOrdersData && (
                <>
                    <motion.h2 variants={fadeIn} className="text-2xl font-semibold mb-4 text-primary">
                        Order Performance
                    </motion.h2>
                    <ResponsiveGrid xs={1} sm={1} md={2} lg={3} className="mb-8">
                        <motion.div variants={slideUp}>
                            <Card 
                                title="Total Orders" 
                                icon={<DollarSign size={20} />}
                            >
                                <p className="text-2xl sm:text-3xl font-bold text-accent">
                                    ₹{(orderPerformance?.totalAmount || 0).toLocaleString()}
                                </p>
                            </Card>
                        </motion.div>
                        
                        <motion.div variants={slideUp}>
                            <Card 
                                title="Target Orders" 
                                icon={<Target size={20} />}
                            >
                                <p className="text-2xl sm:text-3xl font-bold text-primary">
                                    ₹{(orderTarget || 0).toLocaleString()}
                                </p>
                                {/* Display message if no order targets are found */}
                                {orderTarget === 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        No order targets assigned
                                    </p>
                                )}
                            </Card>
                        </motion.div>
                        
                        <motion.div variants={slideUp}>
                            <Card 
                                title="Orders Performance" 
                                icon={<PieChartIcon size={20} />}
                            >
                                <p className={`text-2xl sm:text-3xl font-bold ${
                                    (orderPerformance?.totalAmount || 0) >= (orderTarget || 0) ? "text-green-500" : "text-yellow-500"
                                }`}>
                                    {orderPerformance?.totalAmount && orderTarget ? 
                                        ((orderPerformance.totalAmount / orderTarget) * 100).toFixed(2) + "%" : 
                                        "0.00%"
                                    }
                                </p>
                            </Card>
                        </motion.div>
                    </ResponsiveGrid>
                </>
            )}

            {/* Show message if user has no permissions - only after loading is complete */}
            {!loading && !showSalesData && !showOrdersData && (
                <motion.div variants={fadeIn} className="text-center py-12">
                    <p className="text-xl text-gray-500">You don't have permission to view sales or order data.</p>
                    <p className="text-md text-gray-400 mt-2">Please contact your administrator for access.</p>
                </motion.div>
            )}

            {/* Show Monthly Performance Chart - Only if user has either permission */}
            {(showSalesData || showOrdersData) && (
                <motion.section variants={fadeIn} className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4 text-primary">Monthly Performance</h2>
                    <div className="bg-white rounded-lg shadow-card p-4 md:p-6">
                        {/* Show message when no year is selected and all data is being shown */}
                        {showAllData && (
                            <div className="text-center py-8">
                                <p className="text-xl text-gray-500">Please select a year and click Apply to view monthly performance data in the bar charts.</p>
                            </div>
                        )}
                        
                        {/* Display sales chart first if user has sales permission */}
                        {showSalesData && appliedYear && !showAllData && (
                            <div className="mb-8">
                                <h3 className="text-lg font-medium mb-2 text-gray-700">Sales Data for {appliedYear}</h3>
                                <MonthlyPerformanceSection 
                                    performanceData={monthlyPerformance} 
                                    title="Sales Performance"
                                    hideYearSelector={true} // Hide the chart's year selector since we have one at the dashboard level
                                />
                            </div>
                        )}
                        
                        {/* Display informational message for sales if all data is showing */}
                        {showSalesData && showAllData && (
                            <div className="mb-8">
                                <div className="bg-blue-50 p-4 rounded-md text-center">
                                    <p className="text-blue-600">Select a year to show the Sales performance data in the bar chart.</p>
                                </div>
                            </div>
                        )}
                        
                        {/* Display orders chart below sales if user has orders permission */}
                        {showOrdersData && appliedYear && !showAllData && (
                            <div className={showSalesData ? "mt-10" : ""}>
                                <h3 className="text-lg font-medium mb-2 text-gray-700">Order Data for {appliedYear}</h3>
                                <MonthlyPerformanceSection 
                                    performanceData={monthlyOrderPerformance} 
                                    title="Order Performance"
                                    hideYearSelector={true} // Hide the chart's year selector since we have one at the dashboard level
                                />
                            </div>
                        )}
                        
                        {/* Display informational message for orders if all data is showing */}
                        {showOrdersData && showAllData && (
                            <div className={showSalesData ? "mt-10" : ""}>
                                <div className="bg-blue-50 p-4 rounded-md text-center">
                                    <p className="text-blue-600">Select a year to show the Order performance data in the bar chart.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.section>
            )}
        </motion.div>
    );
};

export default EmployeeDashboard;
