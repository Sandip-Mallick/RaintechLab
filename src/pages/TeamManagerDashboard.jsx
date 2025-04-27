import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/card';
import ResponsiveGrid from '@/components/ui/ResponsiveGrid';
import { getTeamMembersSalesPerformance } from '@/services/salesService';
import { getTeamMembersOrderPerformance } from '@/services/orderService';
import { getTeamMemberTargets } from '@/services/targetService';
import { determineTeamManagerDashboardYears } from '@/services/dashboardService';
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

// Generate current year
const currentYear = new Date().getFullYear();

// Month names array for conversion
const monthNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// Initial year options - will be dynamically updated
const initialYearOptions = [
    { value: currentYear, label: currentYear.toString() }
];

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
    const [filterType, setFilterType] = useState({ value: 'year-range', label: 'Year Range' });
    
    // Year options will be dynamically updated based on data
    const [yearOptions, setYearOptions] = useState(initialYearOptions);
    
    // Month/Year selections with React-Select format - with defaults set
    const [startMonth, setStartMonth] = useState(null);
    const [startYear, setStartYear] = useState(null); // Will be set after data load
    const [endMonth, setEndMonth] = useState(null);
    const [endYear, setEndYear] = useState(null); // Will be set after data load
    
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
    
    // Function to get available months - no future date restrictions
    const getAvailableMonths = (selectedYear) => {
        if (!selectedYear) return monthOptions;
        
        // Return all months without restrictions
        return monthOptions;
    };
    
    const availableStartMonths = startYear ? getAvailableMonths(startYear) : monthOptions;
    const availableEndMonths = endYear ? getAvailableMonths(endYear) : monthOptions;

    // New state for team type selection
    const [teamTypes, setTeamTypes] = useState([]);
    const [selectedTeamType, setSelectedTeamType] = useState(null);
    
    // Data table columns with Employee Name as first column for sales team
    const salesTeamColumns = [
        { 
            Header: 'Employee Name', 
            accessor: 'employeeName',
            width: 200
        },
        { 
            Header: 'Total Sales', 
            accessor: 'totalSalesAmount',
            Cell: ({ value }) => `₹${parseFloat(value || 0).toLocaleString()}`
        },
        { 
            Header: 'Target', 
            accessor: 'targetAmount',
            Cell: ({ value }) => `₹${parseFloat(value || 0).toLocaleString()}`
        },
        { 
            Header: 'Performance (%)', 
            accessor: 'performance',
            Cell: ({ value }) => `${value}%`
        }
    ];
    
    // Data table columns with Employee Name as first column for orders team
    const ordersTeamColumns = [
        { 
            Header: 'Employee Name', 
            accessor: 'employeeName',
            width: 200
        },
        { 
            Header: 'Total Orders', 
            accessor: 'totalAmount',
            Cell: ({ value }) => `₹${parseFloat(value || 0).toLocaleString()}`
        },
        { 
            Header: 'Target', 
            accessor: 'targetAmount',
            Cell: ({ value }) => `₹${parseFloat(value || 0).toLocaleString()}`
        },
        { 
            Header: 'Performance (%)', 
            accessor: 'performance',
            Cell: ({ value }) => `${value}%`
        }
    ];

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
            // Determine available years first, then fetch data
            determineAvailableYears()
                .then(() => {
                    // Then fetch all data on initial load without date parameters
                    fetchTeamPerformanceData({});
                })
                .catch(error => {
                    console.error("Failed to determine available years:", error);
                    // Still try to fetch data with empty params
                    fetchTeamPerformanceData({});
                });
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
            
            // Add timestamp to ensure fresh data
            params._cache = Date.now();
            
            // Check if we're applying a filter - this will be used to determine whether to show 0 or not
            const isApplyingFilter = Object.keys(params).some(key => 
                ['fromDate', 'toDate', 'year', 'month', 'startYear', 'endYear', 'startMonth', 'endMonth']
                .includes(key)
            );
            
            console.log("Is applying filter:", isApplyingFilter);
            console.log("Final params being sent to API:", params);
            
            // Make all API calls in parallel
            const [targetData, salesData, ordersData] = await Promise.all([
                // Fetch target data first - crucial for accurate performance calculations
                getTeamMemberTargets(params).catch(error => {
                    console.error("Error fetching team targets:", error);
                    return [];
                }),
                
                // Get sales performance data if user has permission
                hasSalesPermission && (dataTypeFilter === 'all' || dataTypeFilter === 'sales') 
                    ? getTeamMembersSalesPerformance(params).catch(error => {
                        console.error("Error fetching team sales performance:", error);
                        return [];
                      })
                    : Promise.resolve([]),
                
                // Get orders performance data if user has permission
                hasOrdersPermission && (dataTypeFilter === 'all' || dataTypeFilter === 'orders')
                    ? getTeamMembersOrderPerformance(params).catch(error => {
                        console.error("Error fetching team orders performance:", error);
                        return [];
                      })
                    : Promise.resolve([])
            ]);
            
            const teamTargets = targetData || [];
            const salesPerformanceData = salesData || [];
            const orderPerformanceData = ordersData || [];
            
            console.log("API data received:", {
                targets: teamTargets.length,
                sales: salesPerformanceData.length,
                orders: orderPerformanceData.length
            });
            
            // Create lookup maps for sales and orders targets by employee ID
            const salesTargetsByEmployee = {};
            const orderTargetsByEmployee = {};
            
            // Track total target values from filtered data
            let totalSalesTargetFromFiltered = 0;
            let totalOrderTargetFromFiltered = 0;
            
            // Process targets to organize by employee and type
            if (Array.isArray(teamTargets) && teamTargets.length > 0) {
                console.log(`Processing ${teamTargets.length} team targets with filter params:`, params);
                
                // Debug target data to make sure we have the right types
                teamTargets.forEach((target, index) => {
                    if (index < 5) {  // Just log a few for debugging
                        console.log(`Target ${index + 1}:`, {
                            id: target._id,
                            type: target.targetType,
                            amount: target.targetAmount,
                            employee: target.assignedTo?.name,
                            employeeId: target.employeeId || target.assignedTo?._id,
                            month: target.month,
                            year: target.year
                        });
                    }
                });
                
                teamTargets.forEach(target => {
                    // Get employeeId from multiple possible sources with more thorough extraction
                    const employeeId = 
                        // First check for direct employeeId property
                        target.employeeId || 
                        // Then check assignedTo which might be an object with _id
                        (target.assignedTo && typeof target.assignedTo === 'object' && target.assignedTo._id ? 
                            target.assignedTo._id.toString() : 
                            // Or assignedTo might be a string ID directly
                            (typeof target.assignedTo === 'string' ? target.assignedTo : 
                                // Or it might be under createdFor
                                (target.createdFor || null)));
                                      
                    // Normalize target type to handle all variations
                    const rawTargetType = (target.targetType || '').toLowerCase();
                    let targetType = rawTargetType;
                    
                    // Normalize variations of sales and orders
                    if (targetType === 'sales' || targetType === 'sale') {
                        targetType = 'sales';
                    } else if (targetType === 'orders' || targetType === 'order') {
                        targetType = 'orders';
                    }
                    
                    const targetAmount = parseFloat(target.targetAmount || 0);
                    
                    console.log(`Processing target: ID=${target._id}, Type=${targetType}, Amount=${targetAmount}, EmployeeID=${employeeId}`);
                    
                    if (employeeId) {
                        // Handle 'sale' or 'sales' type targets
                        if (targetType === 'sales' || targetType === 'sale') {
                            if (!salesTargetsByEmployee[employeeId]) {
                                salesTargetsByEmployee[employeeId] = 0;
                            }
                            salesTargetsByEmployee[employeeId] += targetAmount;
                            totalSalesTargetFromFiltered += targetAmount;
                            console.log(`Added sales target: ${targetAmount} for employee ${employeeId}, new total: ${salesTargetsByEmployee[employeeId]}`);
                        }
                        // Handle 'order' or 'orders' type targets
                        else if (targetType === 'orders' || targetType === 'order') {
                            if (!orderTargetsByEmployee[employeeId]) {
                                orderTargetsByEmployee[employeeId] = 0;
                            }
                            orderTargetsByEmployee[employeeId] += targetAmount;
                            totalOrderTargetFromFiltered += targetAmount;
                            console.log(`Added orders target: ${targetAmount} for employee ${employeeId}, new total: ${orderTargetsByEmployee[employeeId]}`);
                        } else {
                            console.log(`Unrecognized target type: ${targetType} for target ${target._id}`);
                        }
                    } else {
                        console.log(`Missing employeeId for target ${target._id}`);
                    }
                });
                
                console.log("Processed sales targets by employee:", salesTargetsByEmployee);
                console.log("Processed order targets by employee:", orderTargetsByEmployee);
                console.log("Total sales target from filtered data:", totalSalesTargetFromFiltered);
                console.log("Total order target from filtered data:", totalOrderTargetFromFiltered);
            } else {
                console.warn("No target data received from API or it's not in the expected format");
            }
            
            // Get team performance data
            if (hasSalesPermission && (dataTypeFilter === 'all' || dataTypeFilter === 'sales')) {
                try {
                    console.log("Fetching sales performance with params:", params);
                    
                    if (Array.isArray(salesPerformanceData) && salesPerformanceData.length > 0) {
                        console.log("Received sales data with", salesPerformanceData.length, "records");
                        
                        // Calculate performance percentage for each team member, integrating target data
                        const formattedSalesData = salesPerformanceData.map(member => {
                            // Extract employee ID using multiple possible sources for consistent matching
                            const employeeId = member.employeeId || 
                                             member._id || 
                                             (member.employee && member.employee._id ? 
                                                member.employee._id.toString() : null);
                            
                            // Get the target amount from our filtered targets or use the original if available
                            let targetAmount = parseFloat(member.targetAmount || 0);
                            
                            // If we have a filtered target for this employee, use it instead
                            if (employeeId && salesTargetsByEmployee[employeeId]) {
                                targetAmount = salesTargetsByEmployee[employeeId];
                                console.log(`Using filtered sales target for ${member.employeeName}: ${targetAmount}`);
                            } else {
                                console.log(`No filtered sales target found for ${member.employeeName} (ID: ${employeeId})`);
                            }
                            
                            const salesAmount = parseFloat(member.totalSalesAmount || 0);
                            const performance = targetAmount > 0 ? Math.round((salesAmount / targetAmount) * 100) : 0;
                            
                            return {
                                ...member,
                                employeeId: employeeId, // Ensure employeeId is in the result
                                targetAmount: targetAmount,
                                performance: performance
                            };
                        });
                        
                        setTeamSalesPerformance(formattedSalesData);
                        
                        // Calculate metrics directly from filtered targets when possible
                        // Use the direct sum from filtered targets data for most accurate results
                        const totalSalesTarget = totalSalesTargetFromFiltered > 0 
                            ? totalSalesTargetFromFiltered
                            : (Object.keys(salesTargetsByEmployee).length > 0 
                                ? Object.values(salesTargetsByEmployee).reduce((sum, target) => sum + parseFloat(target), 0)
                                : formattedSalesData.reduce((sum, member) => sum + (parseFloat(member.targetAmount || 0) || 0), 0));
                            
                        const metrics = {
                            totalSales: formattedSalesData.reduce((sum, member) => sum + (parseFloat(member.totalSalesAmount || 0) || 0), 0),
                            totalSalesTarget: totalSalesTarget,
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
                    } else if (isApplyingFilter) {
                        // If filter was applied but no data was found, ensure we show zeros
                        console.log("Filter was applied but no sales data returned - showing zero values");
                        
                        setTeamSalesPerformance([]);
                        setSalesMetrics({
                            totalSales: 0,
                            totalSalesTarget: 0,
                            salesPerformance: 0,
                            totalQuantity: 0
                        });
                        setMonthlySalesPerformance([]);
                        setShowSalesData(hasSalesPermission);
                    } else {
                        console.warn("Received empty sales data with no filter applied");
                        // In case we get data but it's not in the expected format
                        if (salesPerformanceData && typeof salesPerformanceData === 'object') {
                            // Try to extract data from a different structure
                            const extractedData = salesPerformanceData.data || 
                                                 salesPerformanceData.salesData || 
                                                 salesPerformanceData.members || [];
                            if (Array.isArray(extractedData) && extractedData.length > 0) {
                                console.log("Extracted sales data from nested structure:", extractedData.length, "records");
                                // Process the extracted data instead
                                setTeamSalesPerformance(extractedData);
                            } else {
                                setTeamSalesPerformance([]);
                            }
                        } else {
                            setTeamSalesPerformance([]);
                        }
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
                    
                    if (Array.isArray(orderPerformanceData) && orderPerformanceData.length > 0) {
                        console.log("Raw order data before processing:", orderPerformanceData);
                        
                        // Calculate performance percentage for each team member, integrating target data
                        const formattedOrdersData = orderPerformanceData.map(member => {
                            // Extract employee ID using multiple possible sources for consistent matching
                            const employeeId = member.employeeId || 
                                             member._id || 
                                             (member.employee && member.employee._id ? 
                                                member.employee._id.toString() : null);
                        
                            // Extract the order amount from ALL possible field names
                            const orderAmount = parseFloat(
                                member.totalOrderAmount !== undefined ? member.totalOrderAmount :
                                member.totalAmount !== undefined ? member.totalAmount :
                                member.orderAmount !== undefined ? member.orderAmount :
                                member.amount !== undefined ? member.amount : 0
                            );
                            
                            // Get the target amount - prefer filtered targets if available
                            let targetAmount = parseFloat(
                                member.targetAmount !== undefined ? member.targetAmount :
                                member.orderTarget !== undefined ? member.orderTarget :
                                member.target !== undefined ? member.target : 0
                            );
                            
                            // If we have a filtered target for this employee, use it instead
                            if (employeeId && orderTargetsByEmployee[employeeId]) {
                                targetAmount = orderTargetsByEmployee[employeeId];
                                console.log(`Using filtered order target for ${member.employeeName}: ${targetAmount}`);
                            } else {
                                console.log(`No filtered order target found for ${member.employeeName} (ID: ${employeeId})`);
                            }
                            
                            console.log("Processing member order data:", {
                                name: member.employeeName,
                                id: employeeId,
                                orderAmount,
                                targetAmount,
                                originalFields: {
                                    totalOrderAmount: member.totalOrderAmount,
                                    totalAmount: member.totalAmount,
                                    orderAmount: member.orderAmount,
                                    amount: member.amount
                                }
                            });

                            return {
                                ...member,
                                employeeId: employeeId, // Ensure employeeId is in the result
                                employeeName: member.employeeName,
                                totalOrderAmount: orderAmount,
                                totalAmount: orderAmount,
                                targetAmount: targetAmount,
                                performance: targetAmount > 0 ? Math.round((orderAmount / targetAmount) * 100) : 0
                            };
                        });
                        
                        setTeamOrderPerformance(formattedOrdersData);
                        
                        // Calculate metrics directly from filtered targets when possible
                        // Use the direct sum from filtered targets data for most accurate results
                        const totalOrderTarget = totalOrderTargetFromFiltered > 0
                            ? totalOrderTargetFromFiltered
                            : (Object.keys(orderTargetsByEmployee).length > 0 
                                ? Object.values(orderTargetsByEmployee).reduce((sum, target) => sum + parseFloat(target), 0)
                                : formattedOrdersData.reduce((sum, member) => sum + (parseFloat(member.targetAmount || 0) || 0), 0));
                            
                        const metrics = {
                            totalOrders: formattedOrdersData.reduce((sum, member) => sum + (parseFloat(member.totalAmount || 0) || 0), 0),
                            totalOrderTarget: totalOrderTarget,
                            orderPerformance: 0,
                            totalQuantity: formattedOrdersData.reduce((sum, member) => sum + (parseFloat(member.totalOrderQty || member.orderQty || 0) || 0), 0)
                        };
                        
                        // Calculate performance percentage
                        metrics.orderPerformance = metrics.totalOrderTarget > 0 ? 
                            Math.round((metrics.totalOrders / metrics.totalOrderTarget) * 100) : 0;
                            
                        setOrderMetrics(metrics);
                        console.log("Order metrics calculated:", metrics);
                        
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
                    } else if (isApplyingFilter) {
                        // If filter was applied but no data was found, ensure we show zeros
                        console.log("Filter was applied but no orders data returned - showing zero values");
                        
                        setTeamOrderPerformance([]);
                        setOrderMetrics({
                            totalOrders: 0,
                            totalOrderTarget: 0,
                            orderPerformance: 0,
                            totalQuantity: 0
                        });
                        setMonthlyOrderPerformance([]);
                        setShowOrdersData(hasOrdersPermission);
                    } else {
                        console.warn("Received empty orders data with no filter applied");
                        setTeamOrderPerformance([]);
                        setMonthlyOrderPerformance([]);
                        setShowOrdersData(hasOrdersPermission);
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
            updateFilterStatus(params, isApplyingFilter);
            
        } catch (error) {
            console.error("Error fetching team performance data:", error);
            toast.error('Failed to load team performance data');
        } finally {
            setLoading(false);
        }
    };
    
    const updateFilterStatus = (params = {}, isApplyingFilter = false) => {
        let status = "Showing All data till today";
        
        // If no data was found when filter was applied, update the status to indicate this
        if (isApplyingFilter && (!teamSalesPerformance.length && !teamOrderPerformance.length)) {
            if (filterType.value === 'month-range') {
                if (startMonth && startYear && endMonth && endYear) {
                    status = `No data found from ${startMonth.label} ${startYear.value} to ${endMonth.label} ${endYear.value}`;
                } else if (startMonth && startYear) {
                    status = `No data found for ${startMonth.label} ${startYear.value}`;
                } else if (endMonth && endYear) {
                    status = `No data found up to ${endMonth.label} ${endYear.value}`;
                } else if (startYear && endYear && (startYear.value !== endYear.value)) {
                    status = `No data found from ${startYear.value} to ${endYear.value}`;
                }
            } else if (filterType.value === 'year-range') {
                if (startYear && endYear) {
                    if (startYear.value === endYear.value) {
                        status = `No data found for ${startYear.value}`;
                    } else {
                        status = `No data found from ${startYear.value} to ${endYear.value}`;
                    }
                }
            } else if (filterType.value === 'month-only') {
                if (startMonth && startYear) {
                    status = `No data found for ${startMonth.label} ${startYear.value}`;
                } else if (startYear) {
                    status = `No data found for ${startYear.value}`;
                }
            }
        } else {
            // Only update status if specific filters are selected and we're not showing zero values
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
        
        // Validate range only for month-range when both dates are selected
        if (filterType.value === 'month-range' && startYear && startMonth && endYear && endMonth) {
            const startDate = new Date(startYear.value, startMonth.value - 1);
            const endDate = new Date(endYear.value, endMonth.value - 1);
            
            if (endDate < startDate) {
                errors.range = 'End date cannot be earlier than start date';
                isValid = false;
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
                // Create date strings in ISO format for backend
                const fromDate = `${startYear.value}-${String(startMonth.value).padStart(2, '0')}-01`;
                const toDate = `${endYear.value}-${String(endMonth.value).padStart(2, '0')}-${new Date(endYear.value, endMonth.value, 0).getDate()}`;
                
                params = {
                    fromDate,
                    toDate,
                    // Keep original format for backward compatibility
                    startMonth: parseInt(startMonth.value),
                    startYear: parseInt(startYear.value),
                    endMonth: parseInt(endMonth.value),
                    endYear: parseInt(endYear.value)
                };
                console.log("Using complete date range:", params);
            } 
            // Case 2: If only From date is provided (specific month to current)
            else if (startMonth && startYear) {
                const fromDate = `${startYear.value}-${String(startMonth.value).padStart(2, '0')}-01`;
                const currentDate = new Date();
                const toDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()}`;
                
                params = {
                    fromDate,
                    toDate,
                    // Keep original format for backward compatibility
                    startMonth: parseInt(startMonth.value),
                    startYear: parseInt(startYear.value),
                    endMonth: new Date().getMonth() + 1, // Current month
                    endYear: new Date().getFullYear() // Current year
                };
                console.log("Using start date to current:", params);
            }
            // Case 3: If only To date is provided (beginning to specific date)
            else if (endMonth && endYear) {
                // Use the earliest year from year options instead of hardcoded value
                const earliestYear = yearOptions.length > 0 
                    ? Math.min(...yearOptions.map(opt => opt.value))
                    : new Date().getFullYear() - 1;
                
                const fromDate = `${earliestYear}-01-01`;
                const toDate = `${endYear.value}-${String(endMonth.value).padStart(2, '0')}-${new Date(endYear.value, endMonth.value, 0).getDate()}`;
                    
                params = {
                    fromDate,
                    toDate,
                    // Keep original format for backward compatibility
                    startMonth: 1, // January
                    startYear: earliestYear,
                    endMonth: parseInt(endMonth.value),
                    endYear: parseInt(endYear.value)
                };
                console.log("Using beginning to end date:", params);
            }
            // Case 4: If only years are provided (show full year range)
            else if (startYear && endYear) {
                const fromDate = `${startYear.value}-01-01`;
                const toDate = `${endYear.value}-12-31`;
                
                params = {
                    fromDate,
                    toDate,
                    // Keep original format for backward compatibility
                    startMonth: 1, // January
                    startYear: parseInt(startYear.value),
                    endMonth: 12, // December
                    endYear: parseInt(endYear.value)
                };
                console.log("Using full year range:", params);
            }
            // Case 5: If no parameters are provided
            else {
                // Return empty params to get all data
                console.log("No filter parameters - showing all data till today");
                return {};
            }
        } else if (filterType.value === 'month-only') {
            // Month only - show data for a specific month
            if (startMonth && startYear) {
                // Get last day of month
                const lastDay = new Date(startYear.value, startMonth.value, 0).getDate();
                const fromDate = `${startYear.value}-${String(startMonth.value).padStart(2, '0')}-01`;
                const toDate = `${startYear.value}-${String(startMonth.value).padStart(2, '0')}-${lastDay}`;
                
                params = {
                    fromDate,
                    toDate,
                    // Keep original format for backward compatibility
                    month: startMonth.value,
                    year: startYear.value
                };
            } else if (startYear) {
                // If only year is selected, show the entire year
                const fromDate = `${startYear.value}-01-01`;
                const toDate = `${startYear.value}-12-31`;
                
                params = {
                    fromDate,
                    toDate,
                    // Keep original format for backward compatibility
                    year: startYear.value,
                    startMonth: 1,
                    endMonth: 12
                };
            } else {
                // Return empty params to get all data without date restrictions
                console.log("No filter parameters for month-only - showing all data till today");
                return {};
            }
        } else if (filterType.value === 'year-range') {
            // Year range - show data for full years
            if (startYear && endYear) {
                // If start and end year are the same, use the simpler year parameter
                if (startYear.value === endYear.value) {
                    const fromDate = `${startYear.value}-01-01`;
                    const toDate = `${startYear.value}-12-31`;
                    
                    params = {
                        fromDate,
                        toDate,
                        // Keep original format for backward compatibility
                        year: startYear.value
                    };
                } else {
                    const fromDate = `${startYear.value}-01-01`;
                    const toDate = `${endYear.value}-12-31`;
                    
                    params = {
                        fromDate,
                        toDate,
                        // Keep original format for backward compatibility
                        startYear: startYear.value,
                        endYear: endYear.value,
                        startMonth: 1, // January
                        endMonth: 12  // December
                    };
                }
            } else if (startYear) {
                // If only start year is selected
                const fromDate = `${startYear.value}-01-01`;
                const toDate = `${startYear.value}-12-31`;
                
                params = {
                    fromDate,
                    toDate,
                    // Keep original format for backward compatibility
                    year: startYear.value
                };
            } else if (endYear) {
                // If only end year is selected
                const fromDate = `${endYear.value}-01-01`;
                const toDate = `${endYear.value}-12-31`;
                
                params = {
                    fromDate,
                    toDate,
                    // Keep original format for backward compatibility
                    year: endYear.value
                };
            } else {
                // Return empty params to get all data
                console.log("No filter parameters for year-range - showing all data till today");
                return {};
            }
        }
        
        // Add debug info to params
        params.filterType = filterType ? filterType.value : 'month-range';
        console.log("FINAL FILTER PARAMS:", params);
        
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
        console.log("========== APPLYING FILTERS ==========");
        console.log(JSON.stringify(params, null, 2));
        
        // Clear existing data for clean refresh
        setTeamSalesPerformance([]);
        setTeamOrderPerformance([]);
        
        // Fetch filtered data
        fetchTeamPerformanceData(params)
            .then(() => {
                toast.success("Data updated with filters");
                // Hide validation errors after successful apply
                setShowErrors(false);
            })
            .catch(error => {
                console.error("Error applying filters:", error);
                toast.error("Error updating data with filters");
            });
    };

    const handleResetFilters = async () => {
        try {
            // Show loading state
            setLoading(true);
            
            // Reset to default filter type
            setFilterType({ value: 'year-range', label: 'Year Range' });
            
            // Clear selections
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
            
            // Update filter status to default
            setFilterStatus("Showing All data till today");
            
            // First determine available years - this will also set default years
            await determineAvailableYears();
            
            // Then fetch without date parameters to get all data
            await fetchTeamPerformanceData({}); // Empty params to get all data
            console.log("Filters reset successfully - showing all data till today");
        } catch (error) {
            console.error("Error resetting filters:", error);
            toast.error("Error resetting data");
            
            // Still try to fetch data with empty params
            try {
                await fetchTeamPerformanceData({});
            } catch (fetchError) {
                console.error("Error fetching data after reset:", fetchError);
            }
        } finally {
            setLoading(false);
        }
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

    // Make sure our calculateSalesMetrics handles cases with no data properly
    const calculateSalesMetrics = () => {
        console.log("Calculating sales metrics with data:", teamSalesPerformance);
        
        // Return zero values if no data
        if (!teamSalesPerformance || teamSalesPerformance.length === 0) {
            return { totalSales: 0, totalSalesTarget: 0, salesPerformance: 0, totalQuantity: 0 };
        }

        try {
            // Sum up all the values across team members
            let totalSales = 0;
            let totalSalesTarget = 0;

            teamSalesPerformance.forEach(member => {
                // Get sales amount - try all possible field names
                const salesAmount = parseFloat(
                    member.totalSalesAmount !== undefined ? member.totalSalesAmount :
                    member.salesAmount !== undefined ? member.salesAmount :
                    member.totalAmount !== undefined ? member.totalAmount :
                    member.amount !== undefined ? member.amount : 0
                );

                // Get target amount - try all possible field names
                const targetAmount = parseFloat(
                    member.targetAmount !== undefined ? member.targetAmount :
                    member.salesTarget !== undefined ? member.salesTarget :
                    member.target !== undefined ? member.target : 0
                );

                // Add to totals if valid numbers
                if (!isNaN(salesAmount)) totalSales += salesAmount;
                if (!isNaN(targetAmount)) totalSalesTarget += targetAmount;
            });

            // Calculate performance percentage
            const salesPerformance = totalSalesTarget > 0 ? 
                Math.round((totalSales / totalSalesTarget) * 100) : 0;
            
            // Debug log
            console.log("Sales totals:", { totalSales, totalSalesTarget, salesPerformance });

            return { 
                totalSales, 
                totalSalesTarget, 
                salesPerformance, 
                totalQuantity: teamSalesPerformance.reduce((sum, m) => 
                    sum + parseFloat(m.totalSalesQty || m.salesQty || 0), 0) 
            };
        } catch (error) {
            console.error("Error calculating sales metrics:", error);
            return { totalSales: 0, totalSalesTarget: 0, salesPerformance: 0, totalQuantity: 0 };
        }
    };
    
    // Calculate total orders metrics
    const calculateOrderMetrics = () => {
        console.log("Calculating order metrics with data:", teamOrderPerformance);
        
        // Return zero values if no data
        if (!teamOrderPerformance || teamOrderPerformance.length === 0) {
            return { totalOrders: 0, totalOrderTarget: 0, orderPerformance: 0, totalQuantity: 0 };
        }
        
        try {
            // Sum up all the values across team members
            let totalOrders = 0;
            let totalOrderTarget = 0;

            // Debug each team member's order data
            teamOrderPerformance.forEach((member, index) => {
                console.log(`ORDER DEBUG [${index}]: Member ${member.employeeName}`, {
                    totalOrderAmount: member.totalOrderAmount,
                    totalAmount: member.totalAmount,
                    orderAmount: member.orderAmount,
                    amount: member.amount,
                    targetAmount: member.targetAmount,
                    allKeys: Object.keys(member)
                });

                // Get order amount - MODIFIED with additional field checks
                const orderAmount = parseFloat(
                    member.totalOrderAmount !== undefined ? member.totalOrderAmount :
                    member.totalAmount !== undefined ? member.totalAmount :
                    member.orderAmount !== undefined ? member.orderAmount :
                    member.amount !== undefined ? member.amount : 0
                );

                // Get target amount
                const targetAmount = parseFloat(
                    member.targetAmount !== undefined ? member.targetAmount :
                    member.orderTarget !== undefined ? member.orderTarget :
                    member.target !== undefined ? member.target : 0
                );

                // Add to totals - ensure values aren't NaN
                if (!isNaN(orderAmount)) {
                    totalOrders += orderAmount;
                    console.log(`Added order amount: ${orderAmount}, running total: ${totalOrders}`);
                }
                if (!isNaN(targetAmount)) {
                    totalOrderTarget += targetAmount;
                    console.log(`Added target amount: ${targetAmount}, running total: ${totalOrderTarget}`);
                }
            });

            // Calculate performance percentage
            const orderPerformance = totalOrderTarget > 0 ? 
                Math.round((totalOrders / totalOrderTarget) * 100) : 0;

            // Debug final totals
            console.log("FINAL Order totals:", { totalOrders, totalOrderTarget, orderPerformance });

            return { 
                totalOrders, 
                totalOrderTarget, 
                orderPerformance, 
                totalQuantity: teamOrderPerformance.reduce((sum, m) => 
                    sum + parseFloat(m.totalOrderQty || m.orderQty || 0), 0) 
            };
        } catch (error) {
            console.error("Error calculating order metrics:", error);
            return { totalOrders: 0, totalOrderTarget: 0, orderPerformance: 0, totalQuantity: 0 };
        }
    };

    // Handler for team type change
    const handleTeamTypeChange = (selected) => {
        setSelectedTeamType(selected);
        
        // Refresh data with the new team type
        const params = getFilterParams();
        fetchTeamPerformanceData(params);
    };

    // Determine available years based on team data
    const determineAvailableYears = async () => {
        try {
            console.log("Determining available years from team data...");
            setLoading(true);
            
            // Use dashboardService to get years dynamically from all data sources
            const allYears = await determineTeamManagerDashboardYears();
            console.log("Years returned from service:", allYears);
            
            // Make sure current year is included
            if (allYears.length === 0 || !allYears.includes(currentYear)) {
                allYears.push(currentYear);
            }
            
            // Sort years in descending order
            allYears.sort((a, b) => b - a);
            
            console.log("All available years for team data:", allYears);
            
            // Create year options
            const newYearOptions = allYears.map(year => ({
                value: year,
                label: year.toString()
            }));
            
            console.log("Setting year options:", newYearOptions);
            
            // Update year options state
            setYearOptions(newYearOptions);
            
            // Set default years if we have options
            if (newYearOptions.length > 0) {
                setStartYear(newYearOptions[0]);
                setEndYear(newYearOptions[0]);
            }
            
            setLoading(false);
            return allYears;
        } catch (error) {
            console.error("Error determining available years:", error);
            toast.error("Failed to determine available years");
            
            // Fallback to current year only
            const fallbackYears = [currentYear];
            const fallbackOptions = fallbackYears.map(year => ({
                value: year,
                label: year.toString()
            }));
            
            console.log("Using fallback year:", fallbackYears);
            
            setYearOptions(fallbackOptions);
            setStartYear(fallbackOptions[0]);
            setEndYear(fallbackOptions[0]);
            
            setLoading(false);
            return fallbackYears;
        }
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
                        <div className="h-[500px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                {/* Sales Bar Chart */}
                                <BarChart 
                                    data={teamSalesPerformance} 
                                    margin={{ top: 20, right: 30, left: 60, bottom: 40 }} 
                                    barCategoryGap="20%"
                                    barGap={5}
                                >
                                    <XAxis 
                                        dataKey="employeeName" 
                                        textAnchor="middle" 
                                        height={40} 
                                    />
                                    <YAxis 
                                        width={60}
                                        tickFormatter={(value) => `₹${value}`}
                                    />
                                    <Tooltip 
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                // Calculate performance percentage for the current employee
                                                const actualSales = payload.find(entry => entry.dataKey === 'totalSalesAmount')?.value || 0;
                                                const targetSales = payload.find(entry => entry.dataKey === 'targetAmount')?.value || 0;
                                                const performancePercent = targetSales > 0 ? Math.round((actualSales / targetSales) * 100) : 0;
                                                const performanceColor = performancePercent >= 100 ? "#22c55e" : "#f59e0b";
                                                
                                                return (
                                                    <div className="bg-white shadow-md p-3 rounded-md text-sm">
                                                        <p className="font-bold mb-1">{label}</p>
                                                        {payload.map((entry, index) => (
                                                            <p key={`item-${index}`}>
                                                                <span className="text-black">
                                                                    {entry.dataKey === 'totalSalesAmount' ? 'Total Sales' : 'Sales Target'}:
                                                                </span>{' '}
                                                                <span style={{ color: entry.color }} className="font-bold">
                                                                    ₹{entry.value.toLocaleString()}
                                                                </span>
                                                            </p>
                                                        ))}
                                                        <p className="mt-2 border-t border-gray-100 pt-2">
                                                            <span className="text-black">Performance: </span>
                                                            <span style={{ color: performanceColor }} className="font-bold">
                                                                {performancePercent}%
                                                            </span>
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: 20 }} />
                                    <Bar dataKey="totalSalesAmount" name="Total Sales" fill="#10B981" />
                                    <Bar dataKey="targetAmount" name="Sales Target" fill="#6366F1" />
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
                                    ₹{(orderMetrics.totalOrders || 0).toLocaleString()}
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
                        <div className="h-[500px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart 
                                    data={teamOrderPerformance} 
                                    margin={{ top: 20, right: 30, left: 60, bottom: 40 }}
                                    barCategoryGap="20%"
                                    barGap={5}
                                >
                                    <XAxis 
                                        dataKey="employeeName" 
                                        textAnchor="middle" 
                                        height={40} 
                                    />
                                    <YAxis 
                                        width={60}
                                        tickFormatter={(value) => `₹${value}`}
                                    />
                                    <Tooltip 
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                // Calculate performance percentage for the current employee
                                                const actualOrders = payload.find(entry => entry.dataKey === 'totalAmount')?.value || 0;
                                                const targetOrders = payload.find(entry => entry.dataKey === 'targetAmount')?.value || 0;
                                                const performancePercent = targetOrders > 0 ? Math.round((actualOrders / targetOrders) * 100) : 0;
                                                const performanceColor = performancePercent >= 100 ? "#22c55e" : "#f59e0b";
                                                
                                                return (
                                                    <div className="bg-white shadow-md p-3 rounded-md text-sm">
                                                        <p className="font-bold mb-1">{label}</p>
                                                        {payload.map((entry, index) => (
                                                            <p key={`item-${index}`}>
                                                                <span className="text-black">
                                                                    {entry.dataKey === 'totalAmount' ? 'Total Orders' : 'Orders Target'}:
                                                                </span>{' '}
                                                                <span style={{ color: entry.color }} className="font-bold">
                                                                    ₹{entry.value.toLocaleString()}
                                                                </span>
                                                            </p>
                                                        ))}
                                                        <p className="mt-2 border-t border-gray-100 pt-2">
                                                            <span className="text-black">Performance: </span>
                                                            <span style={{ color: performanceColor }} className="font-bold">
                                                                {performancePercent}%
                                                            </span>
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: 20 }} />
                                    <Bar dataKey="totalAmount" name="Total Orders" fill="#10B981" />
                                    <Bar dataKey="targetAmount" name="Orders Target" fill="#6366F1" />
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
                        {/* Month Range filter temporarily disabled due to filtering issues with targets
                        <button 
                            className={`px-3 py-2 rounded-lg font-medium transition-colors ${filterType.value === 'month-range' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            onClick={() => handleFilterTypeChange('month-range')}
                        >
                            Month Range
                        </button>
                        */}
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
                
                {/* Month Range filter temporarily disabled due to filtering issues with targets
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
                */}
                
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