import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/card';
import { getAllSales, getAllEmployeesMonthlyPerformance, getAllTeamsMonthlyPerformance } from '@/services/salesService';
import { getAllTargets } from '@/services/targetService';
import { getAllOrders, getAllOrdersMonthlyPerformance, getAllEmployeesOrderPerformance } from '@/services/orderService';
import {
    BarChart, Bar, XAxis, YAxis, LineChart, Line, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

import { fadeIn, slideUp } from '@/utils/motionVariants';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Loader, DollarSign, Target, PieChart as PieChartIcon, ShoppingBag, Filter, Calendar } from 'lucide-react';
import ResponsiveGrid from '@/components/ui/ResponsiveGrid';
import Select from 'react-select';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#FF6347', '#FFD700', '#32CD32', '#4169E1', '#8A2BE2', '#FF4500'];

// Month names array for conversion
const monthNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// Generate current year
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1; // 1-12 range

// Month options with disabled status to be set dynamically
const monthOptions = [
    { value: 1, label: 'January', isDisabled: false },
    { value: 2, label: 'February', isDisabled: false },
    { value: 3, label: 'March', isDisabled: false },
    { value: 4, label: 'April', isDisabled: false },
    { value: 5, label: 'May', isDisabled: false },
    { value: 6, label: 'June', isDisabled: false },
    { value: 7, label: 'July', isDisabled: false },
    { value: 8, label: 'August', isDisabled: false },
    { value: 9, label: 'September', isDisabled: false },
    { value: 10, label: 'October', isDisabled: false },
    { value: 11, label: 'November', isDisabled: false },
    { value: 12, label: 'December', isDisabled: false }
];

// Define the default start and end years for filtering
const DEFAULT_START_YEAR = currentYear - 1;
const DEFAULT_END_YEAR = currentYear;

// Initial year options - will be dynamically updated
const initialYearOptions = [
    { value: currentYear, label: currentYear.toString(), isDisabled: false }
];

// Helper function to check if a date is in the future
const isFutureDate = (year, month) => {
    const now = new Date();
    const selectedDate = new Date(year, month - 1); // month is 1-12, but Date uses 0-11
    return selectedDate > now;
};

// Get available months based on selected year
const getAvailableMonths = (selectedYear) => {
    if (!selectedYear) return monthOptions;
    
    // Return all months without any restrictions
    return monthOptions;
};

const AdminDashboard = () => {
    const [salesData, setSalesData] = useState([]);
    const [orderData, setOrderData] = useState([]);
    const [targetData, setTargetData] = useState([]);
    const [employeePerformance, setEmployeePerformance] = useState([]);
    const [employeeOrderPerformance, setEmployeeOrderPerformance] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalSales, setTotalSales] = useState(0);
    const [totalOrders, setTotalOrders] = useState(0);
    const [totalTarget, setTotalTarget] = useState(0);
    const [totalOrderTarget, setTotalOrderTarget] = useState(0);
    const [performance, setPerformance] = useState(0);
    const [orderPerformance, setOrderPerformance] = useState(0);
    const [orderMonthlyPerformance, setOrderMonthlyPerformance] = useState(0);
    const [yearOptions, setYearOptions] = useState(initialYearOptions);

    // Filter state
    const [startMonth, setStartMonth] = useState(null);
    const [startYear, setStartYear] = useState(null); // Will be set after data load
    const [endMonth, setEndMonth] = useState(null);
    const [endYear, setEndYear] = useState(null); // Will be set after data load
    const [filterType, setFilterType] = useState({ value: 'month-range', label: 'Month Range' });
    // Filter status message
    const [filterStatus, setFilterStatus] = useState("Showing All data till today");
    // Validation errors
    const [dateErrors, setDateErrors] = useState({
        startDate: '',
        endDate: '',
        range: ''
    });
    // Flag to control when to show errors
    const [showErrors, setShowErrors] = useState(false);

    // Filtered month options based on selected year
    const [availableStartMonths, setAvailableStartMonths] = useState(monthOptions);
    const [availableEndMonths, setAvailableEndMonths] = useState(monthOptions);
    
    // Update available months when years change
    useEffect(() => {
        if (startYear) {
            setAvailableStartMonths(getAvailableMonths(startYear));
        }
        if (endYear) {
            setAvailableEndMonths(getAvailableMonths(endYear));
        }
    }, [startYear, endYear]);

    useEffect(() => {
        // Initialize the dashboard
        const initializeDashboard = async () => {
            try {
                setLoading(true);
                
                // First determine available years
                console.log("Initializing dashboard - fetching available years...");
                await determineAvailableYears();
                
                // Then fetch dashboard data
                console.log("Fetching dashboard data with available year options...");
                await fetchDashboardData();
                
                // Update filter status
                updateFilterStatus();
            } catch (error) {
                console.error("Error initializing dashboard:", error);
                toast.error("Failed to initialize dashboard");
            } finally {
                setLoading(false);
            }
        };
        
        initializeDashboard();
    }, []);
    
    // Determine available years based on data
    const determineAvailableYears = async () => {
        try {
            console.log("Determining available years from data...");
            
            // Fetch all data to analyze available years
            const [allSales, allOrders, allTargets] = await Promise.all([
                getAllSales({}),
                getAllOrders({}),
                getAllTargets({})
            ]);
            
            // Get years from sales data
            const salesYears = Array.isArray(allSales) ? 
                [...new Set(allSales.map(sale => {
                    const date = new Date(sale.date || sale.createdAt);
                    return date.getFullYear();
                }).filter(Boolean))] : [];
                
            console.log("Years from sales:", salesYears);
            
            // Get years from orders data
            const orderYears = Array.isArray(allOrders) ? 
                [...new Set(allOrders.map(order => {
                    const date = new Date(order.date || order.createdAt);
                    return date.getFullYear();
                }).filter(Boolean))] : [];
                
            console.log("Years from orders:", orderYears);
            
            // Get years from targets data
            const targetYears = Array.isArray(allTargets) ? 
                [...new Set(allTargets.map(target => parseInt(String(target.year))).filter(Boolean))] : [];
                
            console.log("Years from targets:", targetYears);
            
            // Combine all years
            const allYears = [...new Set([...salesYears, ...orderYears, ...targetYears])];
            
            // Add current year if not already included
            if (!allYears.includes(currentYear)) {
                allYears.push(currentYear);
            }
            
            // Sort years in descending order
            allYears.sort((a, b) => b - a);
            
            console.log("All available years:", allYears);
            
            // Create year options
            const newYearOptions = allYears.map(year => ({
                value: year,
                label: year.toString(),
                isDisabled: false
            }));
            
            // Update year options state
            setYearOptions(newYearOptions);
            
            // Set default years
            if (newYearOptions.length > 0) {
                const defaultStartYearOption = newYearOptions.find(opt => opt.value === DEFAULT_START_YEAR) || newYearOptions[0];
                const defaultEndYearOption = newYearOptions.find(opt => opt.value === DEFAULT_END_YEAR) || newYearOptions[0];
                
                setStartYear(defaultStartYearOption);
                setEndYear(defaultEndYearOption);
            }
            
            return allYears;
        } catch (error) {
            console.error("Error determining available years:", error);
            toast.error("Failed to determine available years");
            
            // Fallback to current year and past 4 years
            const fallbackYears = Array.from({ length: 5 }, (_, i) => ({
                value: currentYear - i,
                label: (currentYear - i).toString(),
                isDisabled: false
            }));
            
            setYearOptions(fallbackYears);
            setStartYear(fallbackYears[0]);
            setEndYear(fallbackYears[0]);
            
            return [currentYear];
        }
    };
    
    // Validate silently but don't show errors yet
    useEffect(() => {
        validateDateRange();
        // Clear the show errors flag when selections change
        if (showErrors) {
            setShowErrors(false);
        }
    }, [startMonth, startYear, endMonth, endYear, filterType]);

    // Validation function for date ranges
    const validateDateRange = () => {
        const errors = {
            startDate: '',
            endDate: '',
            range: ''
        };

        // Month range validation
        if (filterType.value === 'month-range') {
            // Validate start date
            if (startYear && !startMonth) {
                errors.startDate = 'Please select a start month';
            }
            
            // Validate end date
            if (endYear && !endMonth) {
                errors.endDate = 'Please select an end month';
            }
            
            // Compare dates if both are complete
            if (startYear && startMonth && endYear && endMonth) {
                const startDate = new Date(startYear.value, startMonth.value - 1);
                const endDate = new Date(endYear.value, endMonth.value - 1);
                
                if (endDate < startDate) {
                    errors.range = 'End date cannot be earlier than start date';
                }
            }
        } 
        // Year range validation
        else if (filterType.value === 'year-range') {
            // Check if end year is earlier than start year
            if (startYear && endYear && endYear.value < startYear.value) {
                errors.endDate = 'End year cannot be earlier than start year';
            }
        }
        // Month only validation
        else if (filterType.value === 'month-only') {
            if (startYear && !startMonth) {
                errors.startDate = 'Please select a month';
            }
        }
        
        setDateErrors(errors);
        // Return true if no errors, false otherwise
        return !errors.startDate && !errors.endDate && !errors.range;
    };

    // Prepare filter params
    const getFilterParams = () => {
        let params = {};
        
        // If years aren't loaded yet, return empty params
        if (!startYear && !endYear) {
            return params;
        }
        
        if (!filterType || filterType.value === 'month-range') {
            // Case 1: If both From and To dates are provided
            if (startMonth && startYear && endMonth && endYear) {
                params = {
                    startMonth: startMonth.value,
                    startYear: startYear.value,
                    endMonth: endMonth.value,
                    endYear: endYear.value
                };
            } 
            // Case 2: If only From date is provided (specific month)
            else if (startMonth && startYear) {
                params = {
                    month: startMonth.value,
                    year: startYear.value
                };
            }
            // Case 3: If only To date is provided (all data up to that date)
            else if (endMonth && endYear) {
                // Use the earliest year from year options instead of hardcoded value
                const earliestYear = yearOptions.length > 0 
                    ? Math.min(...yearOptions.map(opt => opt.value))
                    : DEFAULT_START_YEAR;
                
                params = {
                    startMonth: 1, // January
                    startYear: earliestYear,
                    endMonth: endMonth.value,
                    endYear: endYear.value
                };
            }
            // Case 4: If only years are provided (show full year range)
            else if (startYear && endYear) {
                params = {
                    startMonth: 1, // January
                    startYear: startYear.value,
                    endMonth: 12, // December
                    endYear: endYear.value
                };
            }
        } else if (filterType.value === 'year-range') {
            // Year range - show data for full years
            if (startYear && endYear) {
                params = {
                    startMonth: 1, // January
                    startYear: startYear.value,
                    endMonth: 12, // December
                    endYear: endYear.value
                };
            }
        } else if (filterType.value === 'month-only') {
            // Month only - show data for a specific month
            if (startMonth && startYear) {
                params = {
                    month: startMonth.value,
                    year: startYear.value
                };
            } else if (startYear) {
                // If only year is selected, show the entire year
                params = {
                    startMonth: 1,
                    startYear: startYear.value,
                    endMonth: 12,
                    endYear: startYear.value
                };
            }
        }
        
        console.log("Generated filter params:", params);
        return params;
    };

    // Fetch Data from APIs
    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // First, determine available years
            await determineAvailableYears();
            
            // Now get filter parameters (may use the newly set year options)
            const filterParams = getFilterParams();
            
            // If no filters are applied, keep params empty to show all data
            if (Object.keys(filterParams).length === 0) {
                // Update status message to show all data
                setFilterStatus("Showing All data till today");
            }
            
            console.log("Applying filters to all API calls:", filterParams);
            
            try {
                // Pass filter params to API calls
                const [sales, orders, targets, orderPerformance, employeePerformanceData, employeeOrderPerformanceData] = 
                    await Promise.allSettled([
                        getAllSales(filterParams),
                        getAllOrders(filterParams),
                        getAllTargets(filterParams),
                        getAllOrdersMonthlyPerformance(filterParams),
                        getAllEmployeesMonthlyPerformance(filterParams),
                        getAllEmployeesOrderPerformance(filterParams)
                    ]);
                
                // Set data with proper error handling for each promise result
                const salesArray = sales.status === 'fulfilled' && Array.isArray(sales.value) ? sales.value : [];
                const ordersArray = orders.status === 'fulfilled' && Array.isArray(orders.value) ? orders.value : [];
                const targetsArray = targets.status === 'fulfilled' && Array.isArray(targets.value) ? targets.value : [];
                
                console.log("Received data:", {
                    sales: salesArray.length,
                    orders: ordersArray.length,
                    targets: targetsArray.length
                });
                
                // Debug target types distribution
                if (targetsArray.length > 0) {
                    const targetTypesCounts = {};
                    targetsArray.forEach(target => {
                        const type = (target.targetType || 'unknown').toLowerCase();
                        targetTypesCounts[type] = (targetTypesCounts[type] || 0) + 1;
                    });
                    console.log("Target types distribution:", targetTypesCounts);
                }
                
                setSalesData(salesArray);
                setOrderData(ordersArray);
                setTargetData(targetsArray);
                
                setOrderMonthlyPerformance(orderPerformance.status === 'fulfilled' ? orderPerformance.value : []);
                
                // Handle employee performance data with fallback for empty arrays
                const employeePerf = employeePerformanceData.status === 'fulfilled' ? employeePerformanceData.value : [];
                const employeeOrderPerf = employeeOrderPerformanceData.status === 'fulfilled' ? employeeOrderPerformanceData.value : [];
                
                console.log("Employee performance data received:", 
                    Array.isArray(employeePerf) ? `${employeePerf.length} records` : "not an array");
                console.log("Employee order performance data received:", 
                    Array.isArray(employeeOrderPerf) ? `${employeeOrderPerf.length} records` : "not an array");
                
                setEmployeePerformance(Array.isArray(employeePerf) ? employeePerf : []);
                setEmployeeOrderPerformance(Array.isArray(employeeOrderPerf) ? employeeOrderPerf : []);
                
                // Use sales, orders, and targets that are definitely arrays
                calculateMetrics(salesArray, ordersArray, targetsArray);
                
                console.log("Dashboard data updated with filters applied");
                
                return {
                    success: true,
                    employeeCount: Array.isArray(employeePerf) ? employeePerf.length : 0
                };
            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error('Error loading dashboard data. Please try again.');
                return { success: false, error };
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            toast.error('Failed to fetch dashboard data');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Update filter status text based on current selections
    const updateFilterStatus = () => {
        // Check if user has explicitly selected filter values
        const hasMonthRangeSelection = startMonth && startYear && endMonth && endYear;
        const hasYearRangeSelection = startYear && endYear && filterType.value === 'year-range';
        const hasMonthOnlySelection = startMonth && startYear && filterType.value === 'month-only';
        
        // If no explicit selections have been made, show default message
        if (!hasMonthRangeSelection && !hasYearRangeSelection && !hasMonthOnlySelection) {
            setFilterStatus("Showing All data till today");
            return;
        }
        
        // Otherwise, show specific filter status based on selections
        switch (filterType.value) {
            case 'month-range':
                if (startMonth && startYear && endMonth && endYear) {
                    setFilterStatus(`Showing from ${startMonth.label} ${startYear.value} to ${endMonth.label} ${endYear.value}`);
                } else if (startYear && endYear) {
                    setFilterStatus(`Showing from January ${startYear.value} to December ${endYear.value}`);
                } else {
                    setFilterStatus("Showing All data till today");
                }
                break;
                
            case 'year-range':
                if (startYear && endYear) {
                    setFilterStatus(`Showing from ${startYear.value} to ${endYear.value}`);
                } else {
                    setFilterStatus("Showing All data till today");
                }
                break;
                
            case 'month-only':
                if (startMonth && startYear) {
                    setFilterStatus(`Showing ${startMonth.label} ${startYear.value}`);
                } else if (startYear) {
                    setFilterStatus(`Showing all of ${startYear.value}`);
                } else {
                    setFilterStatus("Showing All data till today");
                }
                break;
                
            default:
                setFilterStatus("Showing All data till today");
        }
    };

    // Update handle to apply filters to respect validation
    const handleApplyFilters = () => {
        // Set flag to show errors
        setShowErrors(true);
        
        // This will trigger the backend filtering by calling APIs with filter parameters
        console.log("Applying filters manually...");
        
        // Validate based on filter type
        if (!validateDateRange()) {
            toast.error('Please fix date range errors before applying filters');
            return;
        }
        
        // Validate filter values based on selected type
        if (filterType.value === 'month-range' && !startYear && !endYear) {
            toast.warning('Please select at least a year range');
            return;
        } else if (filterType.value === 'year-range' && (!startYear || !endYear)) {
            toast.warning('Please select both from and to years');
            return;
        } else if (filterType.value === 'month-only' && !startYear) {
            toast.warning('Please select at least a year');
            return;
        }
        
        // Update filter status text
        updateFilterStatus();
        
        // Show loading state while fetching data
        setLoading(true);
        
        // Fetch with filter parameters
        fetchDashboardData()
            .then(() => {
                console.log("Filter applied successfully");
                toast.success("Data filtered successfully");
            })
            .catch(error => {
                console.error("Error applying filters:", error);
                toast.error("Error filtering data");
            })
            .finally(() => {
        setLoading(false);
            });
    };

    // Reset filters button click handler
    const handleResetFilters = async () => {
        // Show loading state
        setLoading(true);
        
        try {
            // First determine available years to ensure year options are updated
            await determineAvailableYears();
            
            // Reset to default filter type
            setFilterType({ value: 'month-range', label: 'Month Range' });
            
            // Clear all selections
            setStartMonth(null);
            setEndMonth(null);
            setStartYear(null);
            setEndYear(null);
            
            // Reset error display
            setShowErrors(false);
            setDateErrors({
                startDate: '',
                endDate: '',
                range: ''
            });
            
            // Update filter status
            setFilterStatus("Showing All data till today");
            
            // Use empty params to fetch all data without date restrictions
            const defaultParams = {};
            
            // Fetch with empty params to get all data
            await fetchDashboardDataWithParams(defaultParams);
            console.log("Filters reset successfully - showing all data till today");
        } catch (error) {
            console.error("Error resetting filters:", error);
            toast.error("Error resetting data");
        } finally {
            setLoading(false);
        }
    };
    
    // Fetch data with explicit params
    const fetchDashboardDataWithParams = async (params) => {
        try {
            console.log("Fetching dashboard data with params:", params);
            
            // Update available years first
            await determineAvailableYears();
            
            try {
                // Pass filter params to API calls
                const [sales, orders, targets, orderPerformance, employeePerformanceData, employeeOrderPerformanceData] = 
                    await Promise.allSettled([
                        getAllSales(params),
                        getAllOrders(params),
                        getAllTargets(params),
                        getAllOrdersMonthlyPerformance(params),
                        getAllEmployeesMonthlyPerformance(params),
                        getAllEmployeesOrderPerformance(params)
                    ]);
                
                // Set data with proper error handling for each promise result
                const salesArray = sales.status === 'fulfilled' && Array.isArray(sales.value) ? sales.value : [];
                const ordersArray = orders.status === 'fulfilled' && Array.isArray(orders.value) ? orders.value : [];
                const targetsArray = targets.status === 'fulfilled' && Array.isArray(targets.value) ? targets.value : [];
                
                console.log("Received data:", {
                    sales: salesArray.length,
                    orders: ordersArray.length,
                    targets: targetsArray.length
                });
                
                // Debug target types distribution
                if (targetsArray.length > 0) {
                    const targetTypesCounts = {};
                    targetsArray.forEach(target => {
                        const type = (target.targetType || 'unknown').toLowerCase();
                        targetTypesCounts[type] = (targetTypesCounts[type] || 0) + 1;
                    });
                    console.log("Target types distribution:", targetTypesCounts);
                }
                
                setSalesData(salesArray);
                setOrderData(ordersArray);
                setTargetData(targetsArray);
                
                setOrderMonthlyPerformance(orderPerformance.status === 'fulfilled' ? orderPerformance.value : []);
                
                // Handle employee performance data with fallback for empty arrays
                const employeePerf = employeePerformanceData.status === 'fulfilled' ? employeePerformanceData.value : [];
                const employeeOrderPerf = employeeOrderPerformanceData.status === 'fulfilled' ? employeeOrderPerformanceData.value : [];
                
                console.log("Employee performance data received:", 
                    Array.isArray(employeePerf) ? `${employeePerf.length} records` : "not an array");
                console.log("Employee order performance data received:", 
                    Array.isArray(employeeOrderPerf) ? `${employeeOrderPerf.length} records` : "not an array");
                
                setEmployeePerformance(Array.isArray(employeePerf) ? employeePerf : []);
                setEmployeeOrderPerformance(Array.isArray(employeeOrderPerf) ? employeeOrderPerf : []);
                
                // Use sales, orders, and targets that are definitely arrays
                calculateMetrics(salesArray, ordersArray, targetsArray);
                
                console.log("Dashboard data updated with reset filters");
                
                return {
                    success: true,
                    employeeCount: Array.isArray(employeePerf) ? employeePerf.length : 0
                };
            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error('Error loading dashboard data. Please try again.');
                return { success: false, error };
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            throw error;
        }
    };

    // Calculate Metrics for Cards
    const calculateMetrics = (sales, orders, targets) => {
        console.log("Calculating metrics from:", { 
            salesCount: sales.length, 
            ordersCount: orders.length, 
            targetsCount: targets.length 
        });
        
        // Calculate total sales amount
        const totalSalesAmount = sales.reduce((acc, sale) => {
            const amount = parseFloat(sale.salesAmount || sale.amount || 0);
            return acc + amount;
        }, 0);
        
        // Calculate total order amount
        const totalOrderAmount = orders.reduce((acc, order) => {
            const amount = parseFloat(order.orderAmount || order.amount || 0);
            return acc + amount;
        }, 0);
        
        // Log the raw totals
        console.log("Raw totals:", { totalSalesAmount, totalOrderAmount });
        
        // Filter targets by type, handling case sensitivity and variations
        const salesTargets = targets.filter(target => {
            const targetType = (target.targetType || '').toLowerCase();
            return targetType === 'sales' || targetType === 'sale';
        });
        
        const orderTargets = targets.filter(target => {
            const targetType = (target.targetType || '').toLowerCase();
            return targetType === 'orders' || targetType === 'order';
        });
        
        console.log("Filtered targets:", { 
            salesTargetsCount: salesTargets.length, 
            orderTargetsCount: orderTargets.length,
            salesTargetTypes: salesTargets.slice(0, 3).map(t => t.targetType),
            orderTargetTypes: orderTargets.slice(0, 3).map(t => t.targetType)
        });
        
        // Calculate total target amounts
        const totalTargetAmount = salesTargets.reduce((acc, target) => {
            const amount = parseFloat(target.targetAmount || target.amount || 0);
            return acc + amount;
        }, 0);
        
        const totalOrderTargetAmount = orderTargets.reduce((acc, target) => {
            const amount = parseFloat(target.targetAmount || target.amount || 0);
            return acc + amount;
        }, 0);
        
        // Calculate performance percentages with safety checks
        const performancePercentage = totalTargetAmount > 0
            ? Math.min((totalSalesAmount / totalTargetAmount) * 100, 100).toFixed(2)
            : 0;
            
        const orderPerformancePercentage = totalOrderTargetAmount > 0
            ? Math.min((totalOrderAmount / totalOrderTargetAmount) * 100, 100).toFixed(2)
            : 0;
        
        // Log the final calculated values
        console.log("Calculated metrics:", {
            totalSalesAmount,
            totalOrderAmount,
            totalTargetAmount,
            totalOrderTargetAmount,
            performancePercentage,
            orderPerformancePercentage
        });

        // Update state with calculated values
        setTotalSales(totalSalesAmount);
        setTotalOrders(totalOrderAmount);
        setTotalTarget(totalTargetAmount);
        setTotalOrderTarget(totalOrderTargetAmount);
        setPerformance(performancePercentage);
        setOrderPerformance(orderPerformancePercentage);
    };

    const employeePerformanceData = useMemo(() => {
        // Group data by employee name
        const groupedByEmployee = {};
        
        if (!employeePerformance || !Array.isArray(employeePerformance) || employeePerformance.length === 0) {
            console.warn("No valid employee performance data available");
            return [];
        }
        
        console.log("Processing employee performance data:", employeePerformance.length, "records");
        
        // Track employees we've already seen to avoid processing duplicates
        const processedEmployees = new Set();
        
        employeePerformance.forEach((data) => {
            if (!data) return;
            
            const name = data.employeeName || "Unknown";
            const employeeId = data.employeeId || data._id || name; // Use ID if available, otherwise name
            
            // Skip if missing critical data
            if (!name || name === "Unknown") {
                console.log("Skipping record with missing employee name");
                return;
            }
            
            // Parse numeric values safely
            const totalSalesAmount = parseFloat(data.totalSalesAmount || 0);
            const targetAmount = parseFloat(data.targetAmount || 0);
            let performanceValue = 0;
            
            // Parse performance percentage from string if available
            if (typeof data.performanceAmount === 'string' && data.performanceAmount.includes('%')) {
                performanceValue = parseFloat(data.performanceAmount.replace('%', ''));
            } else if (typeof data.performancePercentage === 'number') {
                performanceValue = data.performancePercentage;
            } else if (targetAmount > 0) {
                // Calculate if we have raw values but no percentage
                performanceValue = Math.min((totalSalesAmount / targetAmount) * 100, 100);
            }
            
            // Create a unique key for this employee
            const employeeKey = `${employeeId}-${name}`;
            
            // Skip if we've already processed this employee for this specific period
            if (processedEmployees.has(employeeKey)) {
                console.log(`Skipping duplicate data for employee: ${name}`);
                return;
            }
            
            processedEmployees.add(employeeKey);
            
            // Process the employee data
            if (!groupedByEmployee[name]) {
                groupedByEmployee[name] = {
                    name,
                    employeeId,
                    totalSalesAmount,
                    targetAmount,
                    performancePercentage: performanceValue
                };
            } else {
                // This shouldn't happen with our deduplication, but just in case
                console.warn(`Unexpected duplicate employee: ${name}`);
                // Don't add duplicate values
            }
        });
        
        // Convert the grouped object to an array and sort by totalSalesAmount (descending)
        const result = Object.values(groupedByEmployee)
            .sort((a, b) => b.totalSalesAmount - a.totalSalesAmount);
            
        console.log(`Processed ${result.length} employees for sales chart display`);
        return result;
    }, [employeePerformance]);
    
    // Determine if employee data is empty
    const hasEmployeeData = useMemo(() => {
        return employeePerformanceData.length > 0;
    }, [employeePerformanceData]);

    // Process order performance data
    const employeeOrderPerformanceData = useMemo(() => {
        // Group data by employee name
        const groupedByEmployee = {};
        
        if (!employeeOrderPerformance || !Array.isArray(employeeOrderPerformance) || employeeOrderPerformance.length === 0) {
            console.warn("No valid employee order performance data available");
            return [];
        }
        
        console.log("Processing employee order performance data:", employeeOrderPerformance.length, "records");
        
        // Track employees we've already seen to avoid processing duplicates
        const processedEmployees = new Set();
        
        employeeOrderPerformance.forEach((data) => {
            if (!data) return;
            
            const name = data.employeeName || "Unknown";
            const employeeId = data.employeeId || data._id || name; // Use ID if available, otherwise name
            
            // Skip if missing critical data
            if (!name || name === "Unknown") {
                console.log("Skipping record with missing employee name");
                return;
            }
            
            // Parse numeric values safely
            const totalOrderAmount = parseFloat(data.totalOrderAmount || 0);
            const targetAmount = parseFloat(data.targetAmount || 0);
            let performanceValue = 0;
            
            // Parse performance percentage from string if available
            if (typeof data.performanceAmount === 'string' && data.performanceAmount.includes('%')) {
                performanceValue = parseFloat(data.performanceAmount.replace('%', ''));
            } else if (typeof data.performancePercentage === 'number') {
                performanceValue = data.performancePercentage;
            } else if (targetAmount > 0) {
                // Calculate if we have raw values but no percentage
                performanceValue = Math.min((totalOrderAmount / targetAmount) * 100, 100);
            }
            
            // Create a unique key for this employee
            const employeeKey = `${employeeId}-${name}`;
            
            // Skip if we've already processed this employee for this specific period
            if (processedEmployees.has(employeeKey)) {
                console.log(`Skipping duplicate data for employee: ${name}`);
                return;
            }
            
            processedEmployees.add(employeeKey);
            
            // Process the employee data
            if (!groupedByEmployee[name]) {
                groupedByEmployee[name] = {
                    name,
                    employeeId,
                    totalOrderAmount,
                    targetAmount,
                    performancePercentage: performanceValue
                };
            } else {
                // This shouldn't happen with our deduplication, but just in case
                console.warn(`Unexpected duplicate employee: ${name}`);
                // Don't add duplicate values
            }
        });
        
        // Convert the grouped object to an array and sort by totalOrderAmount (descending)
        const result = Object.values(groupedByEmployee)
            .sort((a, b) => b.totalOrderAmount - a.totalOrderAmount);
            
        console.log(`Processed ${result.length} employees for order chart display`);
        return result;
    }, [employeeOrderPerformance]);
    
    // Determine if employee order data is empty
    const hasEmployeeOrderData = useMemo(() => {
        return employeeOrderPerformanceData.length > 0;
    }, [employeeOrderPerformanceData]);

    const handleFilterTypeChange = (newValue) => {
        setFilterType({ value: newValue, label: newValue.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) });
        
        // Reset date selections based on type but maintain current year
        if (newValue === 'month-only') {
            setStartMonth(null);
            setEndMonth(null);
            setEndYear(null);
            // Ensure startYear is set to current year
            if (!startYear) {
                setStartYear(yearOptions[0]);
            }
        } else if (newValue === 'year-range') {
            setStartMonth(null);
            setEndMonth(null);
            // Ensure both years are set to current year if not already set
            if (!startYear) {
                setStartYear(yearOptions[0]);
            }
            if (!endYear) {
                setEndYear(yearOptions[0]);
            }
        } else { // month-range
            setStartMonth(null);
            setEndMonth(null);
            // Ensure both years are set to current year if not already set
            if (!startYear) {
                setStartYear(yearOptions[0]);
            }
            if (!endYear) {
                setEndYear(yearOptions[0]);
            }
        }
        
        // Clear validation errors
        setDateErrors({
            startDate: '',
            endDate: '',
            range: ''
        });
        
        // Don't fetch data immediately on type change, wait for user to apply
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            className="p-8 bg-background min-h-screen"
        >
            <ToastContainer />

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
                    <Loader className="animate-spin text-primary" size={50} />
                </div>
            )}

            {/* Filter Section */}
            <motion.div variants={slideUp} className="bg-white p-6 shadow-card rounded-xl mb-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                        <Filter size={20} className="text-primary" />
                        {filterType.value === 'month-range' && 'Month Range Filter'}
                        {filterType.value === 'year-range' && 'Year Range Filter'}
                        {filterType.value === 'month-only' && 'Month Only Filter'}
                    </h2>
                    <div className="flex gap-2 flex-wrap">
                        <button 
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterType.value === 'month-range' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            onClick={() => handleFilterTypeChange('month-range')}
                        >
                            Month Range
                        </button>
                        <button 
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterType.value === 'year-range' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            onClick={() => handleFilterTypeChange('year-range')}
                        >
                            Year Range
                        </button>
                        <button 
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterType.value === 'month-only' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            onClick={() => handleFilterTypeChange('month-only')}
                        >
                            Month Only
                        </button>
                    </div>
                </div>

                {filterType?.value === 'month-range' && (
                    <div className="flex flex-wrap items-end gap-8 mb-4">
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700 mb-1">From</label>
                            <div className="flex items-center gap-3">
                                <Select
                                    options={availableStartMonths}
                                    value={startMonth}
                                    onChange={(value) => {
                                        setStartMonth(value);
                                        // Silently validate but don't show errors
                                        if (value && endMonth && endYear) {
                                            const startDate = new Date(startYear.value, value.value - 1);
                                            const endDate = new Date(endYear.value, endMonth.value - 1);
                                            if (endDate < startDate) {
                                                setDateErrors(prev => ({
                                                    ...prev,
                                                    range: 'End date cannot be earlier than start date'
                                                }));
                                            } else {
                                                setDateErrors(prev => ({
                                                    ...prev,
                                                    range: ''
                                                }));
                                            }
                                        }
                                    }}
                                    placeholder="Month"
                                    isClearable
                                    className="w-48"
                                />
                                <Select
                                    options={yearOptions}
                                    value={startYear}
                                    onChange={(value) => {
                                        setStartYear(value);
                                        // Silently validate but don't show errors
                                        if (value && startMonth && endMonth && endYear) {
                                            const startDate = new Date(value.value, startMonth.value - 1);
                                            const endDate = new Date(endYear.value, endMonth.value - 1);
                                            if (endDate < startDate) {
                                                setDateErrors(prev => ({
                                                    ...prev,
                                                    range: 'End date cannot be earlier than start date'
                                                }));
                                            } else {
                                                setDateErrors(prev => ({
                                                    ...prev,
                                                    range: ''
                                                }));
                                            }
                                        }
                                    }}
                                    placeholder="Year"
                                    className="w-28"
                                />
                            </div>
                            <div className="min-h-[20px]">
                                {showErrors && dateErrors.startDate && (
                                    <p className="text-red-500 text-xs mt-1">{dateErrors.startDate}</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700 mb-1">To</label>
                            <div className="flex items-center gap-3">
                                <Select
                                    options={availableEndMonths}
                                    value={endMonth}
                                    onChange={(value) => {
                                        setEndMonth(value);
                                        // Silently validate but don't show errors
                                        if (value && startMonth && startYear) {
                                            const startDate = new Date(startYear.value, startMonth.value - 1);
                                            const endDate = new Date(endYear.value, value.value - 1);
                                            if (endDate < startDate) {
                                                setDateErrors(prev => ({
                                                    ...prev,
                                                    range: 'End date cannot be earlier than start date'
                                                }));
                                            } else {
                                                setDateErrors(prev => ({
                                                    ...prev,
                                                    range: ''
                                                }));
                                            }
                                        }
                                    }}
                                    placeholder="Month"
                                    isClearable
                                    className="w-48"
                                />
                                <Select
                                    options={yearOptions}
                                    value={endYear}
                                    onChange={(value) => {
                                        setEndYear(value);
                                        // No future year validation needed
                                        setDateErrors(prev => ({
                                            ...prev,
                                            endDate: ''
                                        }));
                                    }}
                                    placeholder="Year"
                                    className="w-28"
                                />
                            </div>
                            <div className="min-h-[20px]">
                                {showErrors && dateErrors.endDate && (
                                    <p className="text-red-500 text-xs mt-1">{dateErrors.endDate}</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="ml-auto flex flex-col gap-3">
                            <div className="min-h-[20px] text-right">
                                {showErrors && dateErrors.range && (
                                    <p className="text-red-500 text-xs">{dateErrors.range}</p>
                                )}
                            </div>
                            <div className="flex gap-3 self-end">
                                <button 
                                    onClick={handleResetFilters} 
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
                                >
                                    Reset
                                </button>
                                <button 
                                    onClick={handleApplyFilters} 
                                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {filterType?.value === 'year-range' && (
                    <div className="flex flex-wrap items-end gap-8 mb-4">
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700 mb-1">From Year</label>
                            <Select
                                options={yearOptions}
                                value={startYear}
                                onChange={(value) => {
                                    setStartYear(value);
                                    
                                    // Check if selected year is in the future
                                    if (value && value.value > currentYear) {
                                        setDateErrors(prev => ({
                                            ...prev,
                                            startDate: 'Cannot select future years'
                                        }));
                                    } else {
                                        setDateErrors(prev => ({
                                            ...prev,
                                            startDate: ''
                                        }));
                                    }
                                }}
                                placeholder="Year"
                                className="w-28"
                            />
                            <div className="min-h-[20px]">
                                {showErrors && dateErrors.startDate && (
                                    <p className="text-red-500 text-xs mt-1">{dateErrors.startDate}</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700 mb-1">To Year</label>
                            <Select
                                options={yearOptions}
                                value={endYear}
                                onChange={(value) => {
                                    setEndYear(value);
                                    // No future year validation needed
                                    setDateErrors(prev => ({
                                        ...prev,
                                        endDate: ''
                                    }));
                                }}
                                placeholder="Year"
                                className="w-28"
                            />
                            <div className="min-h-[20px]">
                                {showErrors && dateErrors.endDate && (
                                    <p className="text-red-500 text-xs mt-1">{dateErrors.endDate}</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="ml-auto flex flex-col gap-3">
                            <div className="min-h-[20px] text-right">
                                {showErrors && dateErrors.range && (
                                    <p className="text-red-500 text-xs">{dateErrors.range}</p>
                                )}
                            </div>
                            <div className="flex gap-3 self-end">
                                <button 
                                    onClick={handleResetFilters} 
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
                                >
                                    Reset
                                </button>
                                <button 
                                    onClick={handleApplyFilters} 
                                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {filterType?.value === 'month-only' && (
                    <div className="flex flex-wrap items-end gap-8 mb-4">
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700 mb-1">Month</label>
                            <Select
                                options={availableStartMonths}
                                value={startMonth}
                                onChange={(value) => {
                                    setStartMonth(value);
                                    // Silently validate but don't show errors
                                    if (!value && startYear) {
                                        setDateErrors(prev => ({
                                            ...prev,
                                            startDate: 'Please select a month'
                                        }));
                                    } else {
                                        setDateErrors(prev => ({
                                            ...prev,
                                            startDate: ''
                                        }));
                                    }
                                }}
                                placeholder="Month"
                                isClearable
                                className="w-48"
                            />
                            <div className="min-h-[20px]">
                                {showErrors && dateErrors.startDate && (
                                    <p className="text-red-500 text-xs mt-1">{dateErrors.startDate}</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700 mb-1">Year</label>
                            <Select
                                options={yearOptions}
                                value={startYear}
                                onChange={(value) => {
                                    setStartYear(value);
                                    // Validate if month is selected
                                    if (value && !startMonth) {
                                        setDateErrors(prev => ({
                                            ...prev,
                                            startDate: 'Please select a month'
                                        }));
                                    } else {
                                        setDateErrors(prev => ({
                                            ...prev,
                                            startDate: ''
                                        }));
                                    }
                                }}
                                placeholder="Year"
                                className="w-28"
                            />
                            <div className="min-h-[20px]">
                                {showErrors && dateErrors.startDate && (
                                    <p className="text-red-500 text-xs mt-1">{dateErrors.startDate}</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="ml-auto flex flex-col gap-3">
                            <div className="min-h-[20px] text-right">
                                {showErrors && dateErrors.range && (
                                    <p className="text-red-500 text-xs">{dateErrors.range}</p>
                                )}
                            </div>
                            <div className="flex gap-3 self-end">
                                <button 
                                    onClick={handleResetFilters} 
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
                                >
                                    Reset
                                </button>
                                <button 
                                    onClick={handleApplyFilters} 
                                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
            
            {/* Filter Status Text */}
            <motion.div variants={slideUp} className="bg-white px-6 py-3 shadow-sm rounded-xl mb-8 flex items-center text-gray-700">
                <Calendar size={18} className="text-primary mr-2" />
                <p className="font-medium">{filterStatus}</p>
            </motion.div>

            <ResponsiveGrid xs={1} sm={1} md={2} lg={3} className="mb-8">
                <motion.div variants={slideUp}>
                    <Card 
                        title="Total Sales" 
                        icon={<DollarSign size={20} />}
                    >
                        <p className="text-2xl sm:text-3xl font-bold text-accent">
                            ₹{totalSales.toFixed(0).toLocaleString()}
                        </p>
                    </Card>
                </motion.div>
                
                <motion.div variants={slideUp}>
                    <Card 
                        title="Sales Target" 
                        icon={<Target size={20} />}
                    >
                        <p className="text-2xl sm:text-3xl font-bold text-primary">
                            ₹{totalTarget.toLocaleString()}
                        </p>
                    </Card>
                </motion.div>
                
                <motion.div variants={slideUp}>
                    <Card 
                        title="Sales Performance" 
                        icon={<PieChartIcon size={20} />}
                    >
                        <p className={`text-2xl sm:text-3xl font-bold ${totalSales >= totalTarget ? "text-green-500" : "text-yellow-500"}`}>
                            {totalTarget > 0 
                                ? (parseFloat(((totalSales / totalTarget) * 100).toFixed(2)) === 0 
                                    ? "0" 
                                    : ((totalSales / totalTarget) * 100).toFixed(2))
                                : "0"}%
                        </p>
                    </Card>
                </motion.div>
            </ResponsiveGrid>
            
            <ResponsiveGrid xs={1} sm={1} md={2} lg={3} className="mb-8">
                <motion.div variants={slideUp}>
                    <Card 
                        title="Total Orders" 
                        icon={<ShoppingBag size={20} />}
                    >
                        <p className="text-2xl sm:text-3xl font-bold text-accent">
                            ₹{totalOrders.toLocaleString()}
                        </p>
                    </Card>
                </motion.div>
                
                <motion.div variants={slideUp}>
                    <Card 
                        title="Orders Target" 
                        icon={<Target size={20} />}
                    >
                        <p className="text-2xl sm:text-3xl font-bold text-primary">
                            ₹{totalOrderTarget.toLocaleString()}
                        </p>
                    </Card>
                </motion.div>
                
                <motion.div variants={slideUp}>
                    <Card 
                        title="Order Performance" 
                        icon={<PieChartIcon size={20} />}
                    >
                        <p className={`text-2xl sm:text-3xl font-bold ${totalOrders >= totalOrderTarget ? "text-green-500" : "text-yellow-500"}`}>
                            {parseFloat(orderPerformance) === 0 ? "0" : orderPerformance}%
                        </p>
                    </Card>
                </motion.div>
            </ResponsiveGrid>
         
            <div className="mt-8">
                <motion.div variants={slideUp} className="bg-white p-6 shadow-card rounded-xl">
                    <h2 className="text-2xl font-semibold mb-4">
                        Sales Performance by Employee 
                        <span className="text-gray-500 text-lg ml-2 font-normal">({filterStatus.replace("Showing ", "")})</span>
                    </h2>
                    
                    {hasEmployeeData ? (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={employeePerformanceData} margin={{ left: 15, right: 15, top: 20, bottom: 5 }}>
                            <XAxis
                                dataKey="name"
                                angle={0}
                                textAnchor="middle"
                                interval={0}
                                tick={{ fontSize: 12 }}
                                height={60}
                                padding={{ left: 20, right: 20 }}
                            />
                            <YAxis 
                                width={85}
                                tickFormatter={(value) => {
                                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                                    return value;
                                }}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-white shadow-md p-3 rounded-md text-sm">
                                                <p className="font-bold mb-1">{data.name}</p>
                                                <p>
                                                    <span className="text-black">Total Sales:</span>{' '}
                                                    <span style={{ color: "#10B981" }} className="font-bold">
                                                        ₹{data.totalSalesAmount.toLocaleString()}
                                                    </span>
                                                </p>
                                                <p>
                                                    <span className="text-black">Sales Target:</span>{' '}
                                                    <span style={{ color: "#4F46E5" }} className="font-bold">
                                                        ₹{data.targetAmount.toLocaleString()}
                                                    </span>
                                                </p>
                                                <p>
                                                    <span className="text-black">Performance:</span>{' '}
                                                    <span className={`font-bold ${data.performancePercentage >= 100 ? 'text-green-600' : 'text-yellow-600'}`}>
                                                        {data.performancePercentage}%
                                                    </span>
                                                </p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend />
                            <Bar dataKey="totalSalesAmount" fill="#10B981" name="Total Sales" />
                            <Bar dataKey="targetAmount" fill="#4F46E5" name="Sales Target" />
                        </BarChart>
                    </ResponsiveContainer>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <PieChartIcon size={48} className="text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-700 mb-2">No Performance Data Available</h3>
                            <p className="text-gray-500 max-w-md">
                                There is no sales data or targets for employees in the selected time period. 
                                Try adjusting your filter criteria or adding sales/targets for employees.
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Orders Performance by Employee Chart */}
            <div className="mt-8">
                <motion.div variants={slideUp} className="bg-white p-6 shadow-card rounded-xl">
                    <h2 className="text-2xl font-semibold mb-4">
                        Orders Performance by Employee 
                        <span className="text-gray-500 text-lg ml-2 font-normal">({filterStatus.replace("Showing ", "")})</span>
                    </h2>
                    
                    {hasEmployeeOrderData ? (
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={employeeOrderPerformanceData} margin={{ left: 15, right: 15, top: 20, bottom: 5 }}>
                                <XAxis
                                    dataKey="name"
                                    angle={0}
                                    textAnchor="middle"
                                    interval={0}
                                    tick={{ fontSize: 12 }}
                                    height={60}
                                    padding={{ left: 20, right: 20 }}
                                />
                                <YAxis 
                                    width={85}
                                    tickFormatter={(value) => {
                                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                                        return value;
                                    }}
                                />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-white shadow-md p-3 rounded-md text-sm">
                                                    <p className="font-bold mb-1">{data.name}</p>
                                                    <p>
                                                        <span className="text-black">Total Orders:</span>{' '}
                                                        <span style={{ color: "#10B981" }} className="font-bold">
                                                            ₹{data.totalOrderAmount.toLocaleString()}
                                                        </span>
                                                    </p>
                                                    <p>
                                                        <span className="text-black">Orders Target:</span>{' '}
                                                        <span style={{ color: "#4F46E5" }} className="font-bold">
                                                            ₹{data.targetAmount.toLocaleString()}
                                                        </span>
                                                    </p>
                                                    <p>
                                                        <span className="text-black">Performance:</span>{' '}
                                                        <span className={`font-bold ${data.performancePercentage >= 100 ? 'text-green-600' : 'text-yellow-600'}`}>
                                                            {data.performancePercentage}%
                                                        </span>
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="totalOrderAmount" fill="#10B981" name="Total Orders" />
                                <Bar dataKey="targetAmount" fill="#4F46E5" name="Orders Target" />
                            </BarChart>
                    </ResponsiveContainer>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <PieChartIcon size={48} className="text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-700 mb-2">No Order Performance Data Available</h3>
                            <p className="text-gray-500 max-w-md">
                                There is no orders data or targets for employees in the selected time period. 
                                Try adjusting your filter criteria or adding orders/targets for employees.
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );
};

export default AdminDashboard;
