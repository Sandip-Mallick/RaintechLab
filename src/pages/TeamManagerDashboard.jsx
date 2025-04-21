import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/card';
import ResponsiveGrid from '@/components/ui/ResponsiveGrid';
import { getTeamMembersSalesPerformance } from '@/services/salesService';
import { getTeamMembersOrderPerformance } from '@/services/orderService';
import {
    BarChart, Bar, XAxis, YAxis, LineChart, Line, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Loader, DollarSign, Target, ShoppingBag, BarChart as BarChartIcon, Filter, Calendar, FilterIcon, PieChart, Package } from 'lucide-react';
import { slideUp, fadeIn } from '@/utils/motionVariants';
import { getUserProfile, getTeamMembers } from '@/services/apiService';
import Select from 'react-select';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import MonthlyPerformanceSection from './MonthlyPerformanceSection';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#FF6347', '#FFD700', '#32CD32', '#4169E1', '#8A2BE2', '#FF4500'];

// Month names array for conversion
const monthNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// Generate current year and previous years
const currentYear = new Date().getFullYear();

const TeamManagerDashboard = () => {
    const [teamSalesPerformance, setTeamSalesPerformance] = useState([]);
    const [teamOrderPerformance, setTeamOrderPerformance] = useState([]);
    const [monthlySalesPerformance, setMonthlySalesPerformance] = useState([]);
    const [monthlyOrderPerformance, setMonthlyOrderPerformance] = useState([]);
    const [loading, setLoading] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [permissions, setPermissions] = useState(null);
    const [showSalesData, setShowSalesData] = useState(false);
    const [showOrdersData, setShowOrdersData] = useState(false);
    const [reportType, setReportType] = useState('sales'); // 'sales' or 'orders'
    const [dataTypeFilter, setDataTypeFilter] = useState('all');

    // Updated filter state to match admin dashboard
    const [filterType, setFilterType] = useState({ value: 'month-range', label: 'Month Range' });
    
    // Generate Options for Select components
    const yearOptions = Array.from({ length: 5 }, (_, i) => ({ 
        value: currentYear - i, 
        label: (currentYear - i).toString() 
    }));
    
    // Month/Year selections with React-Select format - with defaults set
    const [startMonth, setStartMonth] = useState(null);
    const [startYear, setStartYear] = useState(yearOptions[0]); // Default to current year
    const [endMonth, setEndMonth] = useState(null);
    const [endYear, setEndYear] = useState(yearOptions[0]); // Default to current year
    
    // For validation
    const [dateErrors, setDateErrors] = useState({
        startDate: '',
        endDate: '',
        range: ''
    });
    const [showErrors, setShowErrors] = useState(false);
    const [filterStatus, setFilterStatus] = useState("Showing All data till today");

    const monthOptions = Array.from({ length: 12 }, (_, i) => ({ 
        value: i + 1, 
        label: monthNames[i + 1] 
    }));
    
    // Function to check if a date is in the future
    const isFutureDate = (year, month) => {
        const now = new Date();
        const checkDate = new Date(year, month - 1);
        return checkDate > now;
    };
    
    // Function to get available months based on selected year
    const getAvailableMonths = (selectedYear) => {
        if (!selectedYear) return monthOptions;
        
        if (selectedYear.value === currentYear) {
            const currentMonth = new Date().getMonth() + 1; // 1-indexed
            return monthOptions.filter(month => month.value <= currentMonth);
        }
        
        return monthOptions;
    };
    
    const availableStartMonths = startYear ? getAvailableMonths(startYear) : monthOptions;
    const availableEndMonths = endYear ? getAvailableMonths(endYear) : monthOptions;

    // New state for team type selection
    const [teamTypes, setTeamTypes] = useState([]);
    const [selectedTeamType, setSelectedTeamType] = useState(null);
    
    // Data table columns with Employee Name as first column for sales team
    const salesTeamColumns = [];
    
    // Data table columns with Employee Name as first column for orders team
    const ordersTeamColumns = [];

    const filterTypeOptions = [
        { value: 'month-range', label: 'Month Range' },
        { value: 'year-range', label: 'Year Range' },
        { value: 'month-only', label: 'Month Only' },
    ];

    const dataTypeOptions = [
        { value: 'all', label: 'All Data' },
        { value: 'sales', label: 'Sales Only' },
        { value: 'orders', label: 'Orders Only' },
    ];

    // Add state variables to store calculated metrics
    const [salesMetrics, setSalesMetrics] = useState({ totalSales: 0, totalSalesTarget: 0, salesPerformance: 0, totalQuantity: 0 });
    const [orderMetrics, setOrderMetrics] = useState({ totalOrders: 0, totalOrderTarget: 0, orderPerformance: 0, totalQuantity: 0 });

    // Add useEffect hook to update metrics when team performance data changes
    useEffect(() => {
        if (teamSalesPerformance && teamSalesPerformance.length > 0) {
            const metrics = calculateSalesMetrics();
            setSalesMetrics(metrics);
            console.log("Updated sales metrics:", metrics);
        }
    }, [teamSalesPerformance]);

    useEffect(() => {
        if (teamOrderPerformance && teamOrderPerformance.length > 0) {
            const metrics = calculateOrderMetrics();
            setOrderMetrics(metrics);
            console.log("Updated order metrics:", metrics);
        }
    }, [teamOrderPerformance]);

    useEffect(() => {
        fetchUserProfile();
    }, []);

    useEffect(() => {
        if (userProfile && userProfile.permissions) {
            setPermissions(userProfile.permissions);
            // Fetch all data on initial load without date parameters
            fetchTeamPerformanceData({});
        }
    }, [userProfile]);

    // Fetch user profile to get permissions
    const fetchUserProfile = async () => {
        try {
            const profileData = await getUserProfile();
            console.log("Fetched user profile:", profileData);
            setUserProfile(profileData);
            
            // Check if manager handles multiple team types
            const hasSalesPermission = profileData?.permissions === 'Sales' || 
                                      profileData?.permissions === 'Sales & Orders' || 
                                      profileData?.permissions === 'All Permissions';
                                      
            const hasOrdersPermission = profileData?.permissions === 'Orders' || 
                                       profileData?.permissions === 'Sales & Orders' || 
                                       profileData?.permissions === 'All Permissions';
            
            // Build team type options
            const teamTypeOptions = [];
            if (hasSalesPermission) {
                teamTypeOptions.push({ value: 'sales', label: 'Sales Team' });
            }
            if (hasOrdersPermission) {
                teamTypeOptions.push({ value: 'orders', label: 'Orders Team' });
            }
            
            setTeamTypes(teamTypeOptions);
            
            // Set default selected team type
            if (teamTypeOptions.length > 0) {
                setSelectedTeamType(teamTypeOptions[0]);
            }
            
        } catch (error) {
            console.error("Error fetching user profile:", error);
            toast.error('Failed to load user profile');
        }
    };

    // Fetch Team Performance Data with team type parameter
    const fetchTeamPerformanceData = async (params = {}) => {
        try {
            setLoading(true);
            
            console.log("Starting to fetch team performance data with params:", params);
            
            // Get user profile
            const userProfile = await getUserProfile();
            
            // Determine permissions
            const hasSalesPermission = userProfile?.permissions === 'Sales' || 
                                      userProfile?.permissions === 'Sales & Orders' || 
                                      userProfile?.permissions === 'All Permissions';
                                      
            const hasOrdersPermission = userProfile?.permissions === 'Orders' || 
                                       userProfile?.permissions === 'Sales & Orders' || 
                                       userProfile?.permissions === 'All Permissions';
            
            console.log("Permissions:", userProfile?.permissions);
            
            // Ensure year parameters are numbers
            if (params.year) params.year = Number(params.year);
            if (params.startYear) params.startYear = Number(params.startYear);
            if (params.endYear) params.endYear = Number(params.endYear);
            if (params.month) params.month = Number(params.month);
            if (params.startMonth) params.startMonth = Number(params.startMonth);
            if (params.endMonth) params.endMonth = Number(params.endMonth);
            
            // Add debug information for tracking
            params.debugSource = 'TeamManagerDashboard';
            params.timestamp = new Date().toISOString();
            
            console.log("Final params being sent to API:", params);
            
            // Get team performance data
            if (hasSalesPermission && (dataTypeFilter === 'all' || dataTypeFilter === 'sales')) {
                try {
                    console.log("Fetching sales performance with params:", params);
                    const salesPerformanceData = await getTeamMembersSalesPerformance(params);
                    console.log("Team sales performance data:", salesPerformanceData);
                    
                    if (Array.isArray(salesPerformanceData) && salesPerformanceData.length > 0) {
                        // Calculate performance percentage for each team member
                        const formattedSalesData = salesPerformanceData.map(member => ({
                            ...member,
                            performance: member.targetAmount > 0 
                                ? Math.round((member.totalSalesAmount / member.targetAmount) * 100) 
                                : 0
                        }));
                        
                        setTeamSalesPerformance(formattedSalesData);
                        
                        // Calculate metrics immediately with the data we have instead of using setTimeout
                        const metrics = {
                            totalSales: formattedSalesData.reduce((sum, member) => sum + (parseFloat(member.totalSalesAmount || 0) || 0), 0),
                            totalSalesTarget: formattedSalesData.reduce((sum, member) => sum + (parseFloat(member.targetAmount || 0) || 0), 0),
                            salesPerformance: 0,
                            totalQuantity: formattedSalesData.reduce((sum, member) => sum + (parseFloat(member.totalSalesQty || member.salesQty || 0) || 0), 0)
                        };
                        
                        // Calculate performance percentage
                        metrics.salesPerformance = metrics.totalSalesTarget > 0 ? 
                            Math.round((metrics.totalSales / metrics.totalSalesTarget) * 100) : 0;
                            
                        setSalesMetrics(metrics);
                        console.log("Sales metrics calculated immediately:", metrics);
                        
                        // Process monthly data if available
                        if (salesPerformanceData.monthlySales && Array.isArray(salesPerformanceData.monthlySales)) {
                            console.log("Monthly sales data received:", salesPerformanceData.monthlySales);
                            
                            // Ensure the monthly data has the correct structure for the charts
                            const enhancedMonthlyData = salesPerformanceData.monthlySales.map(item => {
                                // Make sure we have the required fields for the chart
                                return {
                                    ...item,
                                    // Ensure these fields exist for the chart
                                    name: monthNames[item.month] || `Month ${item.month}`,
                                    actualValue: item.totalSalesAmount || item.actual || 0,
                                    targetValue: item.targetAmount || item.target || 0
                                };
                            });
                            
                            console.log("Enhanced monthly sales data:", enhancedMonthlyData);
                            setMonthlySalesPerformance(enhancedMonthlyData);
                        } else if (salesPerformanceData && salesPerformanceData.monthlySales) {
                            // Handle case where monthlySales exists but isn't an array
                            setMonthlySalesPerformance([]);
                            console.warn("monthlySales exists but is not an array:", salesPerformanceData.monthlySales);
                        } else {
                            console.log("No monthly sales data available");
                            setMonthlySalesPerformance([]);
                        }
                        
                        setShowSalesData(true);
                    } else {
                        console.warn("Received salesPerformanceData is not an array:", salesPerformanceData);
                        setTeamSalesPerformance([]);
                        setMonthlySalesPerformance([]);
                        setShowSalesData(hasSalesPermission);
                    }
                } catch (error) {
                    console.error("Error fetching team sales performance:", error);
                    toast.error('Failed to load team sales data');
                    setTeamSalesPerformance([]);
                    setMonthlySalesPerformance([]);
                    setShowSalesData(hasSalesPermission);
                }
            } else {
                setShowSalesData(hasSalesPermission);
            }
            
            if (hasOrdersPermission && (dataTypeFilter === 'all' || dataTypeFilter === 'orders')) {
                try {
                    console.log("Fetching orders performance with params:", params);
                    const orderPerformanceData = await getTeamMembersOrderPerformance(params);
                    console.log("Team order performance data:", orderPerformanceData);
                    
                    if (Array.isArray(orderPerformanceData) && orderPerformanceData.length > 0) {
                        // Calculate performance percentage for each team member
                        const formattedOrdersData = orderPerformanceData.map(member => ({
                            ...member,
                            performance: member.targetAmount > 0 
                                ? Math.round((member.totalAmount / member.targetAmount) * 100) 
                                : 0
                        }));
                        
                        setTeamOrderPerformance(formattedOrdersData);
                        
                        // Calculate metrics immediately with the data we have instead of using setTimeout
                        const metrics = {
                            totalOrders: formattedOrdersData.reduce((sum, member) => sum + (parseFloat(member.totalAmount || member.totalOrderAmount || 0) || 0), 0),
                            totalOrderTarget: formattedOrdersData.reduce((sum, member) => sum + (parseFloat(member.targetAmount || 0) || 0), 0),
                            orderPerformance: 0,
                            totalQuantity: formattedOrdersData.reduce((sum, member) => sum + (parseFloat(member.totalOrderQty || member.orderQty || 0) || 0), 0)
                        };
                        
                        // Calculate performance percentage
                        metrics.orderPerformance = metrics.totalOrderTarget > 0 ? 
                            Math.round((metrics.totalOrders / metrics.totalOrderTarget) * 100) : 0;
                            
                        setOrderMetrics(metrics);
                        console.log("Order metrics calculated immediately:", metrics);
                        
                        // Process monthly data if available
                        if (orderPerformanceData.monthlyOrders && Array.isArray(orderPerformanceData.monthlyOrders)) {
                            console.log("Monthly orders data received:", orderPerformanceData.monthlyOrders);
                            
                            // Ensure the monthly data has the correct structure for the charts
                            const enhancedMonthlyData = orderPerformanceData.monthlyOrders.map(item => {
                                // Make sure we have the required fields for the chart
                                return {
                                    ...item,
                                    // Ensure these fields exist for the chart
                                    name: monthNames[item.month] || `Month ${item.month}`,
                                    actualValue: item.totalAmount || item.actual || 0,
                                    targetValue: item.targetAmount || item.target || 0
                                };
                            });
                            
                            console.log("Enhanced monthly orders data:", enhancedMonthlyData);
                            setMonthlyOrderPerformance(enhancedMonthlyData);
                        } else if (orderPerformanceData && orderPerformanceData.monthlyOrders) {
                            // Handle case where monthlyOrders exists but isn't an array
                            setMonthlyOrderPerformance([]);
                            console.warn("monthlyOrders exists but is not an array:", orderPerformanceData.monthlyOrders);
                        } else {
                            console.log("No monthly orders data available");
                            setMonthlyOrderPerformance([]);
                        }
                        
                        setShowOrdersData(true);
                    } else {
                        console.warn("Received orderPerformanceData is not an array:", orderPerformanceData);
                        setTeamOrderPerformance([]);
                        setMonthlyOrderPerformance([]);
                        setShowOrdersData(true);
                    }
                } catch (error) {
                    console.error("Error fetching team order performance:", error);
                    toast.error('Failed to load team orders data');
                    setTeamOrderPerformance([]);
                    setMonthlyOrderPerformance([]);
                    setShowOrdersData(hasOrdersPermission);
                }
            } else {
                setShowOrdersData(hasOrdersPermission);
            }
            
            // Update filter status
            updateFilterStatus();
            
        } catch (error) {
            console.error("Error fetching team performance data:", error);
            toast.error('Failed to load team performance data');
        } finally {
            setLoading(false);
        }
    };
    
    const updateFilterStatus = () => {
        let status = "Showing All data till today";
        
        // Only update status if specific filters are selected
        if (filterType.value === 'month-range') {
            if (startMonth && startYear && endMonth && endYear) {
                status = `Showing from ${startMonth.label} ${startYear.value} to ${endMonth.label} ${endYear.value}`;
            } else if (startMonth && startYear) {
                status = `Showing ${startMonth.label} ${startYear.value}`;
            } else if (endMonth && endYear) {
                status = `Showing all data up to ${endMonth.label} ${endYear.value}`;
            } else if (startYear && endYear && (startYear.value !== endYear.value)) {
                status = `Showing from ${startYear.value} to ${endYear.value}`;
            }
        } else if (filterType.value === 'year-range') {
            if (startYear && endYear) {
                if (startYear.value === endYear.value) {
                    status = `Showing ${startYear.value}`;
                } else {
                    status = `Showing from ${startYear.value} to ${endYear.value}`;
                }
            }
        } else if (filterType.value === 'month-only') {
            if (startMonth && startYear) {
                status = `Showing ${startMonth.label} ${startYear.value}`;
            } else if (startYear) {
                status = `Showing all of ${startYear.value}`;
            }
        }
        
        setFilterStatus(status);
    };

    const validateDateRange = () => {
        let isValid = true;
        const errors = {
            startDate: '',
            endDate: '',
            range: ''
        };
        
        // Validate start date
        if (filterType.value === 'month-range' || filterType.value === 'month-only') {
            if (startYear && startMonth && isFutureDate(startYear.value, startMonth.value)) {
                errors.startDate = 'Cannot select future dates';
                isValid = false;
            }
        }
        
        // Validate end date
        if (filterType.value === 'month-range') {
            if (endYear && endMonth && isFutureDate(endYear.value, endMonth.value)) {
                errors.endDate = 'Cannot select future dates';
                isValid = false;
            }
            
            // Validate range only if both dates are selected
            if (startYear && startMonth && endYear && endMonth) {
                const startDate = new Date(startYear.value, startMonth.value - 1);
                const endDate = new Date(endYear.value, endMonth.value - 1);
                
                if (endDate < startDate) {
                    errors.range = 'End date cannot be earlier than start date';
                    isValid = false;
                }
            }
        }
        
        setDateErrors(errors);
        return isValid;
    };

    const getFilterParams = () => {
        let params = {};
        
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
                    startMonth: startMonth.value,
                    startYear: startYear.value,
                    endMonth: new Date().getMonth() + 1, // Current month
                    endYear: new Date().getFullYear() // Current year
                };
            }
            // Case 3: If only To date is provided (all data up to that date)
            else if (endMonth && endYear) {
                const currentYear = new Date().getFullYear();
                // Default to the earliest data we have, 4 years back
                const startYear = currentYear - 4;
                
                params = {
                    startMonth: 1, // January
                    startYear: startYear,
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
            // Case 5: If no parameters are provided
            else {
                // Default to all data for current year
                const currentDate = new Date();
                params = {
                    startMonth: 1, // January
                    startYear: currentDate.getFullYear(),
                    endMonth: currentDate.getMonth() + 1, // Current month
                    endYear: currentDate.getFullYear() // Current year
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
                    year: startYear.value,
                    startMonth: 1,
                    endMonth: 12
                };
            } else {
                // Default to current month and year
                const currentDate = new Date();
                params = {
                    month: currentDate.getMonth() + 1,
                    year: currentDate.getFullYear()
                };
            }
        } else if (filterType.value === 'year-range') {
            // Year range - show data for full years
            if (startYear && endYear) {
                // If start and end year are the same, use the simpler year parameter
                if (startYear.value === endYear.value) {
                    params = {
                        year: startYear.value
                    };
                } else {
                    params = {
                        startYear: startYear.value,
                        endYear: endYear.value,
                        startMonth: 1, // January
                        endMonth: 12  // December
                    };
                }
            } else if (startYear) {
                // If only start year is selected
                params = {
                    year: startYear.value
                };
            } else if (endYear) {
                // If only end year is selected
                params = {
                    year: endYear.value
                };
            } else {
                // Default to current year
                params = {
                    year: new Date().getFullYear()
                };
            }
        }
        
        // Add debug info to params to help with troubleshooting
        params.filterType = filterType ? filterType.value : 'month-range';
        
        console.log("Generated filter params:", params);
        return params;
    };

    const handleApplyFilters = () => {
        // Check if any filter is selected based on filter type
        let hasSelectedFilters = false;
        
        if (filterType.value === 'month-range') {
            hasSelectedFilters = !!(startMonth || endMonth || startYear || endYear);
        } else if (filterType.value === 'year-range') {
            hasSelectedFilters = !!(startYear || endYear);
        } else if (filterType.value === 'month-only') {
            hasSelectedFilters = !!(startMonth || startYear);
        }
        
        if (!hasSelectedFilters) {
            toast.info('Using default filter values');
            // Continue with default values - don't return
        }
        
        // Show validation errors if any
        setShowErrors(true);
        
        // Validate date range
        if (!validateDateRange()) {
            toast.error('Please fix the date errors before applying filters');
            return;
        }
        
        // Get filter parameters
        const params = getFilterParams();
        console.log("Applying filters:", params);
        
        // Fetch filtered data
        fetchTeamPerformanceData(params)
            .then(() => {
                toast.success("Data updated successfully");
                // Hide validation errors after successful apply
                setShowErrors(false);
            })
            .catch(error => {
                console.error("Error applying filters:", error);
                toast.error("Error updating data with filters");
            });
    };

    const handleResetFilters = () => {
        // Reset to default filter type
        setFilterType({ value: 'month-range', label: 'Month Range' });
        
        // Clear month selections but keep current year as default
        setStartMonth(null);
        setEndMonth(null);
        
        // Set years to current year by default
        setStartYear(yearOptions[0]); // Current year
        setEndYear(yearOptions[0]); // Current year
        
        // Reset error display
        setShowErrors(false);
        setDateErrors({
            startDate: '',
            endDate: '',
            range: ''
        });
        
        // Update filter status
        setFilterStatus("Showing All data till today");
        
        // Fetch without date parameters to get all data
        setLoading(true);
        fetchTeamPerformanceData({}) // Empty params to get all data
            .then(() => {
                console.log("Filters reset successfully");
            })
            .catch(error => {
                console.error("Error resetting filters:", error);
                toast.error("Error resetting data");
            })
            .finally(() => {
                setLoading(false);
            });
    };
    
    const handleFilterTypeChange = (newValue) => {
        // Convert string to object if it's not already
        const filterOption = typeof newValue === 'string' 
            ? filterTypeOptions.find(opt => opt.value === newValue)
            : newValue;
            
        setFilterType(filterOption);
        
        // Reset related inputs based on filter type
        if (filterOption.value === 'month-range') {
            // Keep both month selectors for range
            setStartMonth(null);
            setEndMonth(null);
            // Keep year selectors as is
        } else if (filterOption.value === 'year-range') {
            // No need for month selectors in year range
            setStartMonth(null);
            setEndMonth(null);
            // Keep year selectors as is
        } else if (filterOption.value === 'month-only') {
            // Only need start month for single month
            setEndMonth(null);
            // No need for end year in month only
            setEndYear(startYear);
        }
        
        // Clear any previous validation errors
        setDateErrors({
            startDate: '',
            endDate: '',
            range: ''
        });
        setShowErrors(false);
    };

    // Calculate total sales metrics
    const calculateSalesMetrics = () => {
        console.log("Calculating sales metrics from data:", teamSalesPerformance);
        
        if (!teamSalesPerformance || teamSalesPerformance.length === 0) {
            console.warn("No sales data available for metrics calculation");
            // Instead of returning empty values, check if we already have metrics in state
            if (salesMetrics.totalSales > 0 || salesMetrics.totalSalesTarget > 0) {
                console.log("Using existing sales metrics from state:", salesMetrics);
                return salesMetrics;
            }
            return { totalSales: 0, totalSalesTarget: 0, salesPerformance: 0, totalQuantity: 0 };
        }
        
        let totalSales = 0;
        let totalSalesTarget = 0;
        
        // Process each team member's data with robust field checking
        teamSalesPerformance.forEach(member => {
            // Extract sales amount from any available field
            const salesAmount = parseFloat(
                member.totalSalesAmount !== undefined ? member.totalSalesAmount : 
                member.salesAmount !== undefined ? member.salesAmount :
                member.totalAmount !== undefined ? member.totalAmount :
                member.amount !== undefined ? member.amount : 0
            );
            
            // Extract target amount from any available field
            const targetAmount = parseFloat(
                member.targetAmount !== undefined ? member.targetAmount :
                member.salesTarget !== undefined ? member.salesTarget :
                member.target !== undefined ? member.target : 0
            );
            
            if (!isNaN(salesAmount)) {
                totalSales += salesAmount;
            }
            
            if (!isNaN(targetAmount)) {
                totalSalesTarget += targetAmount;
            }
        });
        
        console.log(`Total sales calculated: ${totalSales}, Total target: ${totalSalesTarget}`);
        
        // Calculate performance percentage
        const salesPerformance = totalSalesTarget > 0 ? 
            Math.round((totalSales / totalSalesTarget) * 100) : 0;
        
        // Calculate total quantity if available
        const totalQuantity = teamSalesPerformance.reduce((sum, member) => 
            sum + (parseFloat(member.totalSalesQty || member.salesQty || 0) || 0), 0);
        
        return { totalSales, totalSalesTarget, salesPerformance, totalQuantity };
    };
    
    // Calculate total orders metrics
    const calculateOrderMetrics = () => {
        console.log("Calculating order metrics from data:", teamOrderPerformance);
        
        if (!teamOrderPerformance || teamOrderPerformance.length === 0) {
            console.warn("No order data available for metrics calculation");
            // Instead of returning empty values, check if we already have metrics in state
            if (orderMetrics.totalOrders > 0 || orderMetrics.totalOrderTarget > 0) {
                console.log("Using existing order metrics from state:", orderMetrics);
                return orderMetrics;
            }
            return { totalOrders: 0, totalOrderTarget: 0, orderPerformance: 0, totalQuantity: 0 };
        }
        
        let totalOrders = 0;
        let totalOrderTarget = 0;
        
        // Process each team member's data with robust field checking
        teamOrderPerformance.forEach(member => {
            // Extract order amount from any available field
            const orderAmount = parseFloat(
                member.totalAmount !== undefined ? member.totalAmount :
                member.totalOrderAmount !== undefined ? member.totalOrderAmount :
                member.orderAmount !== undefined ? member.orderAmount :
                member.amount !== undefined ? member.amount : 0
            );
            
            // Extract target amount from any available field
            const targetAmount = parseFloat(
                member.targetAmount !== undefined ? member.targetAmount :
                member.orderTarget !== undefined ? member.orderTarget :
                member.target !== undefined ? member.target : 0
            );
            
            if (!isNaN(orderAmount)) {
                totalOrders += orderAmount;
            }
            
            if (!isNaN(targetAmount)) {
                totalOrderTarget += targetAmount;
            }
        });
        
        console.log(`Total orders calculated: ${totalOrders}, Total target: ${totalOrderTarget}`);
        
        // Calculate performance percentage
        const orderPerformance = totalOrderTarget > 0 ? 
            Math.round((totalOrders / totalOrderTarget) * 100) : 0;
        
        // Calculate total quantity if available
        const totalQuantity = teamOrderPerformance.reduce((sum, member) => 
            sum + (parseFloat(member.totalOrderQty || member.orderQty || 0) || 0), 0);
        
        return { totalOrders, totalOrderTarget, orderPerformance, totalQuantity };
    };

    // Handler for team type change
    const handleTeamTypeChange = (selected) => {
        setSelectedTeamType(selected);
        
        // Refresh data with the new team type
        const params = getFilterParams();
        fetchTeamPerformanceData(params);
    };

    const renderSalesCharts = () => {
        // Don't show if user doesn't have sales permission or if orders-only filter is selected
        if (!showSalesData || dataTypeFilter === 'orders') return null;
        
        // Use stored sales metrics from state instead of calculating each time
        return (
            <motion.div 
                variants={fadeIn} 
                className="mb-8"
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 shadow-card">
                        <div className="flex justify-between mb-2">
                            <div>
                                <h3 className="text-gray-500 text-sm font-medium">Total Sales</h3>
                                <p className="text-xl sm:text-2xl font-bold text-accent">
                                    ₹{salesMetrics.totalSales.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <DollarSign size={18} className="text-accent" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-card">
                        <div className="flex justify-between mb-2">
                            <div>
                                <h3 className="text-gray-500 text-sm font-medium">Sales Target</h3>
                                <p className="text-xl sm:text-2xl font-bold text-primary">
                                    ₹{salesMetrics.totalSalesTarget.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <Target size={18} className="text-primary" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-card">
                        <div className="flex justify-between mb-2">
                            <div>
                                <h3 className="text-gray-500 text-sm font-medium">Sales Performance</h3>
                                <p className={`text-xl sm:text-2xl font-bold ${parseFloat(salesMetrics.salesPerformance) >= 100 ? "text-green-500" : "text-yellow-500"}`}>
                                    {salesMetrics.salesPerformance}%
                                </p>
                            </div>
                            <div>
                                <PieChart size={18} className={parseFloat(salesMetrics.salesPerformance) >= 100 ? "text-green-500" : "text-yellow-500"} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Team Sales Performance */}
                {teamSalesPerformance.length > 0 ? (
                    <div className="bg-white rounded-xl p-6 shadow-md mb-8">
                        <h2 className="text-xl font-medium mb-4">Sales Performance by Employee</h2>
                        <div className="overflow-x-auto mb-6">
                            <DataTable 
                                columns={salesTeamColumns} 
                                data={teamSalesPerformance} 
                                title="" 
                            />
                        </div>
                        <div className="h-[500px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={teamSalesPerformance} margin={{ top: 20, right: 30, left: 60, bottom: 40 }}>
                                    <XAxis dataKey="employeeName" textAnchor="middle" height={40} />
                                    <YAxis width={100} />
                                    <Tooltip />
                                    <Legend wrapperStyle={{ paddingTop: 0 }} />
                                    <Bar dataKey="totalSalesAmount" name="Total Sales" fill="#10B981" />
                                    <Bar dataKey="targetAmount" name="Target" fill="#6366F1" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl p-6 shadow-md mb-8 text-center">
                        <h2 className="text-xl font-medium mb-4">Sales Performance by Employee</h2>
                        <p className="text-gray-500">No sales performance data available for the selected period.</p>
                    </div>
                )}
            </motion.div>
        );
    };

    const renderOrdersCharts = () => {
        // Don't show if user doesn't have orders permission or if sales-only filter is selected
        if (!showOrdersData || dataTypeFilter === 'sales') return null;
        
        // Use stored order metrics from state instead of calculating each time
        return (
            <motion.div 
                variants={fadeIn} 
                className="mb-8"
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 shadow-card">
                        <div className="flex justify-between mb-2">
                            <div>
                                <h3 className="text-gray-500 text-sm font-medium">Total Orders</h3>
                                <p className="text-xl sm:text-2xl font-bold text-accent">
                                    ₹{orderMetrics.totalOrders.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <ShoppingBag size={18} className="text-accent" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-card">
                        <div className="flex justify-between mb-2">
                            <div>
                                <h3 className="text-gray-500 text-sm font-medium">Order Target</h3>
                                <p className="text-xl sm:text-2xl font-bold text-primary">
                                    ₹{orderMetrics.totalOrderTarget.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <Target size={18} className="text-primary" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-card">
                        <div className="flex justify-between mb-2">
                            <div>
                                <h3 className="text-gray-500 text-sm font-medium">Order Performance</h3>
                                <p className={`text-xl sm:text-2xl font-bold ${parseFloat(orderMetrics.orderPerformance) >= 100 ? "text-green-500" : "text-yellow-500"}`}>
                                    {orderMetrics.orderPerformance}%
                                </p>
                            </div>
                            <div>
                                <PieChart size={18} className={parseFloat(orderMetrics.orderPerformance) >= 100 ? "text-green-500" : "text-yellow-500"} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Team Orders Performance */}
                {teamOrderPerformance.length > 0 ? (
                    <div className="bg-white rounded-xl p-6 shadow-md mb-8">
                        <h2 className="text-xl font-medium mb-4">Orders Performance by Employee</h2>
                        <div className="overflow-x-auto mb-6">
                            <DataTable 
                                columns={ordersTeamColumns} 
                                data={teamOrderPerformance} 
                                title="" 
                            />
                        </div>
                        <div className="h-[500px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={teamOrderPerformance} margin={{ top: 20, right: 30, left: 60, bottom: 40 }}>
                                    <XAxis dataKey="employeeName" textAnchor="middle" height={40} />
                                    <YAxis width={100} />
                                    <Tooltip />
                                    <Legend wrapperStyle={{ paddingTop: 0 }} />
                                    <Bar dataKey="totalAmount" name="Total Orders" fill="#10B981" />
                                    <Bar dataKey="targetAmount" name="Target" fill="#6366F1" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl p-6 shadow-md mb-8 text-center">
                        <h2 className="text-xl font-medium mb-4">Orders Performance by Employee</h2>
                        <p className="text-gray-500">No orders performance data available for the selected period.</p>
                    </div>
                )}
            </motion.div>
        );
    };

    return (
        <motion.div initial="hidden" animate="visible" className="p-8 bg-background min-h-screen">
            <ToastContainer />

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
                    <Loader className="animate-spin text-primary" size={50} />
                </div>
            )}

            {/* Report Type and Team Type Selection */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-primary">Team Performance Dashboard</h1>
                
                <div className="flex items-center gap-4">
                    {/* Data Type Filter */}
                    <div className="flex items-center">
                        <label className="mr-2 text-sm font-medium text-gray-700">Data Type:</label>
                        <Select
                            options={dataTypeOptions}
                            value={dataTypeOptions.find(option => option.value === dataTypeFilter)}
                            onChange={(selected) => setDataTypeFilter(selected.value)}
                            className="w-40"
                            isSearchable={false}
                        />
                    </div>
                </div>
            </div>
                
            {/* Filter Section - Same design as team manager dashboard */}
            <motion.div variants={slideUp} className="bg-white p-6 shadow-card rounded-xl mb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                        <Filter size={20} className="text-primary" />
                        {filterType.value === 'month-range' && 'Month Range Filter'}
                        {filterType.value === 'year-range' && 'Year Range Filter'}
                        {filterType.value === 'month-only' && 'Month Only Filter'}
                    </h2>
                    <div className="flex gap-1 flex-wrap">
                        <button 
                            className={`px-3 py-2 rounded-lg font-medium transition-colors ${filterType.value === 'month-range' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            onClick={() => handleFilterTypeChange('month-range')}
                        >
                            Month Range
                        </button>
                        <button 
                            className={`px-3 py-2 rounded-lg font-medium transition-colors ${filterType.value === 'year-range' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            onClick={() => handleFilterTypeChange('year-range')}
                        >
                            Year Range
                        </button>
                        <button 
                            className={`px-3 py-2 rounded-lg font-medium transition-colors ${filterType.value === 'month-only' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            onClick={() => handleFilterTypeChange('month-only')}
                        >
                            Month Only
                        </button>
                    </div>
                </div>
                
                {filterType?.value === 'month-range' && (
                    <div className="flex flex-wrap items-end gap-4 mb-4 relative">
                        <div className="flex-grow">
                            <div className="flex flex-wrap gap-4">
                                <div className="flex flex-col">
                                    <label className="text-sm font-medium text-gray-700 mb-1">From</label>
                                    <div className="flex items-center gap-3">
                                        <Select
                                            options={availableStartMonths}
                                            value={startMonth}
                                            onChange={(value) => {
                                                setStartMonth(value);
                                                // Silently validate but don't show errors until apply
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
                                                
                                                // Check for future date
                                                if (value && startYear && isFutureDate(startYear.value, value.value)) {
                                                    setDateErrors(prev => ({
                                                        ...prev,
                                                        startDate: 'Cannot select future dates'
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
                                        <Select
                                            options={yearOptions}
                                            value={startYear}
                                            onChange={(value) => {
                                                setStartYear(value);
                                                // Silently validate but don't show errors until apply
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
                                                
                                                // If month is already selected, check if it's now in the future
                                                if (value && startMonth && isFutureDate(value.value, startMonth.value)) {
                                                    setDateErrors(prev => ({
                                                        ...prev,
                                                        startDate: 'Cannot select future dates'
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
                                                // Silently validate but don't show errors until apply
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
                                                
                                                // Check for future date
                                                if (value && endYear && isFutureDate(endYear.value, value.value)) {
                                                    setDateErrors(prev => ({
                                                        ...prev,
                                                        endDate: 'Cannot select future dates'
                                                    }));
                                                } else {
                                                    setDateErrors(prev => ({
                                                        ...prev,
                                                        endDate: ''
                                                    }));
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
                                                // Silently validate but don't show errors until apply
                                                if (value && startMonth && startYear && endMonth) {
                                                    const startDate = new Date(startYear.value, startMonth.value - 1);
                                                    const endDate = new Date(value.value, endMonth.value - 1);
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
                                                
                                                // If month is already selected, check if it's now in the future
                                                if (value && endMonth && isFutureDate(value.value, endMonth.value)) {
                                                    setDateErrors(prev => ({
                                                        ...prev,
                                                        endDate: 'Cannot select future dates'
                                                    }));
                                                } else {
                                                    setDateErrors(prev => ({
                                                        ...prev,
                                                        endDate: ''
                                                    }));
                                                }
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
                            </div>
                            
                            <div className="min-h-[20px] mt-1">
                                {showErrors && dateErrors.range && (
                                    <p className="text-red-500 text-xs">{dateErrors.range}</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-end gap-1 self-start md:self-end">
                            <button 
                                onClick={handleResetFilters}
                                className="py-2 px-3 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                            >
                                Reset
                            </button>
                            <button 
                                onClick={handleApplyFilters}
                                className="py-2 px-3 bg-primary text-white rounded-md hover:bg-opacity-90 transition-colors"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                )}
                
                {filterType?.value === 'year-range' && (
                    <div className="flex flex-wrap items-end gap-4 mb-4 relative">
                        <div className="flex-grow">
                            <div className="flex flex-wrap gap-4">
                                <div className="flex flex-col">
                                    <label className="text-sm font-medium text-gray-700 mb-1">From Year</label>
                                    <Select
                                        options={yearOptions}
                                        value={startYear}
                                        onChange={(value) => {
                                            setStartYear(value);
                                            // Validate range but don't show errors until apply
                                            if (value && endYear && value.value > endYear.value) {
                                                setDateErrors(prev => ({
                                                    ...prev,
                                                    range: 'Start year cannot be after end year'
                                                }));
                                            } else {
                                                setDateErrors(prev => ({
                                                    ...prev,
                                                    range: ''
                                                }));
                                            }
                                        }}
                                        placeholder="Select Year"
                                        className="w-40"
                                    />
                                </div>
                                
                                <div className="flex flex-col">
                                    <label className="text-sm font-medium text-gray-700 mb-1">To Year</label>
                                    <Select
                                        options={yearOptions}
                                        value={endYear}
                                        onChange={(value) => {
                                            setEndYear(value);
                                            // Validate range but don't show errors until apply
                                            if (value && startYear && value.value < startYear.value) {
                                                setDateErrors(prev => ({
                                                    ...prev,
                                                    range: 'End year cannot be before start year'
                                                }));
                                            } else {
                                                setDateErrors(prev => ({
                                                    ...prev,
                                                    range: ''
                                                }));
                                            }
                                        }}
                                        placeholder="Select Year"
                                        className="w-40"
                                    />
                                </div>
                            </div>
                            
                            <div className="min-h-[20px] mt-1">
                                {showErrors && dateErrors.range && (
                                    <p className="text-red-500 text-xs">{dateErrors.range}</p>
                                )}
                            </div>
                        </div>
                    
                        <div className="flex items-end gap-1 self-start md:self-end">
                        <button 
                            onClick={handleResetFilters}
                                className="py-2 px-3 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                        >
                            Reset
                        </button>
                        <button 
                            onClick={handleApplyFilters}
                                className="py-2 px-3 bg-primary text-white rounded-md hover:bg-opacity-90 transition-colors"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
                )}
                
                {filterType?.value === 'month-only' && (
                    <div className="flex flex-wrap items-end gap-4 mb-4 relative">
                        <div className="flex-grow">
                            <div className="flex flex-wrap gap-4">
                                <div className="flex flex-col">
                                    <label className="text-sm font-medium text-gray-700 mb-1">Month</label>
                                    <Select
                                        options={availableStartMonths}
                                        value={startMonth}
                                        onChange={(value) => {
                                            setStartMonth(value);
                                            // Check for future date but don't show errors until apply
                                            if (value && startYear && isFutureDate(startYear.value, value.value)) {
                                                setDateErrors(prev => ({
                                                    ...prev,
                                                    startDate: 'Cannot select future dates'
                                                }));
                                            } else {
                                                setDateErrors(prev => ({
                                                    ...prev,
                                                    startDate: ''
                                                }));
                                            }
                                        }}
                                        placeholder="Select Month"
                                        isClearable
                                        className="w-48"
                                    />
                </div>
                                
                                <div className="flex flex-col">
                                    <label className="text-sm font-medium text-gray-700 mb-1">Year</label>
                                    <Select
                                        options={yearOptions}
                                        value={startYear}
                                        onChange={(value) => {
                                            setStartYear(value);
                                            // If month is already selected, check if it's now in the future
                                            if (value && startMonth && isFutureDate(value.value, startMonth.value)) {
                                                setDateErrors(prev => ({
                                                    ...prev,
                                                    startDate: 'Cannot select future dates'
                                                }));
                                            } else {
                                                setDateErrors(prev => ({
                                                    ...prev,
                                                    startDate: ''
                                                }));
                                            }
                                        }}
                                        placeholder="Select Year"
                                        className="w-40"
                                    />
                            </div>
                            </div>
                            
                            <div className="min-h-[20px] mt-1">
                                {showErrors && dateErrors.startDate && (
                                    <p className="text-red-500 text-xs">{dateErrors.startDate}</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-end gap-1 self-start md:self-end">
                            <button 
                                onClick={handleResetFilters}
                                className="py-2 px-3 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                            >
                                Reset
                            </button>
                            <button 
                                onClick={handleApplyFilters}
                                className="py-2 px-3 bg-primary text-white rounded-md hover:bg-opacity-90 transition-colors"
                            >
                                Apply Filters
                            </button>
                    </div>
                </div>
            )}
            </motion.div>

            {/* Filter Status - Now displayed as an info bar outside the filter card */}
            <motion.div 
                variants={fadeIn} 
                className="flex items-center bg-white px-6 py-3 shadow-sm rounded-xl mb-8 text-gray-700"
            >
                <Calendar size={18} className="text-primary mr-2" />
                <p className="font-medium">{filterStatus}</p>
            </motion.div>

            {/* Render sales and orders data */}
            {renderSalesCharts()}
            {renderOrdersCharts()}

            {/* No Data Message */}
            {!loading && (!showSalesData && !showOrdersData) && (
                <motion.div variants={fadeIn} className="text-center mt-16 bg-white p-8 rounded-xl shadow-md">
                    <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded-full mx-auto mb-4">
                        <span className="text-gray-400 text-2xl">📊</span>
                    </div>
                    <h3 className="text-xl font-medium text-gray-600">No performance data available</h3>
                    <p className="text-gray-500 mt-2">Team performance data will appear here when available.</p>
                </motion.div>
            )}
        </motion.div>
    );
};

export default TeamManagerDashboard; 