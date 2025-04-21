import axios from 'axios';
import { API_ORDERS_URL, API_URL } from '../config/env';
import { getAssignedTargets } from './targetService';

// Get All Orders (Admin)
export const getAllOrders = async (filters = {}) => {
    try {
        const { data } = await axios.get(API_ORDERS_URL, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            params: filters
        });
        console.log("Orders API response with filters:", filters);
        return data;
    } catch (error) {
        console.error('Failed to fetch orders data:', error);
        return [];
    }
};

// Fetch Orders for Current Employee
export const getEmployeeOrders = async (year = null) => {
    try {
        console.log('Getting orders for employee', year ? `for year ${year}` : 'for all years');
        
        // Get token from local storage
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            return [];
        }
        
        // Get user ID from local storage or decode from token
        let userId = localStorage.getItem('userId');
        
        if (!userId && token) {
            try {
                // If userId is not in localStorage, try to extract it from token
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                
                const decoded = JSON.parse(jsonPayload);
                userId = decoded.id || decoded.userId || decoded.sub;
                
                if (userId) {
                    localStorage.setItem('userId', userId);
                    console.log('Extracted userId from token:', userId);
                }
            } catch (err) {
                console.error('Error decoding token:', err);
                return [];
            }
        }
        
        if (!userId) {
            console.error('Could not determine user ID');
            return [];
        }
        
        console.log('Fetching orders for employee with ID:', userId);
        
        // Ensure year is properly parsed if provided
        const yearFilter = year ? parseInt(year) : null;
        console.log('Year filter (parsed):', yearFilter);
        
        // Construct the URL with the year filter if provided
        let url = `${API_URL}/orders/employee-orders`;
        if (yearFilter) {
            url += `?year=${yearFilter}`;
        }
        
        // Use the correct endpoint based on backend routes
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log(`Employee orders endpoint status: ${response.status}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`Found ${data.length} orders for employee`);
                
                // Always filter by year client-side to ensure consistency
                let orders = sanitizeOrders(data);
                
                if (yearFilter) {
                    console.log(`Filtering ${orders.length} orders for year ${yearFilter} on client side`);
                    orders = orders.filter(order => {
                        const orderDate = new Date(order.date || order.createdAt);
                        const orderYear = orderDate.getFullYear();
                        return orderYear === yearFilter;
                    });
                    console.log(`After filtering: ${orders.length} orders for year ${yearFilter}`);
                }
                
                return orders;
            } else {
                console.log(`Employee orders endpoint returned status: ${response.status}`);
                // Don't throw here - continue to fallback
            }
        } catch (error) {
            console.error('Error accessing employee orders endpoint:', error.message);
            // Don't throw - continue to fallback
        }
        
        // Try the main orders endpoint as fallback
        console.log('Using fallback: fetching all orders');
        try {
            const response = await fetch(`${API_URL}/orders`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log(`All orders endpoint status: ${response.status}`);
            
            if (response.ok) {
                const allOrders = await response.json();
                console.log(`Retrieved ${allOrders.length} total orders`);
                
                // Filter orders by employee ID (could be userId or employeeId field)
                let filteredOrders = allOrders.filter(order => 
                    (order.userId === userId) || 
                    (order.employeeId === userId) || 
                    (order.employee && (order.employee.id === userId || order.employee._id === userId))
                );
                
                console.log(`Filtered down to ${filteredOrders.length} orders for this employee`);
                
                // Apply year filter if provided
                if (yearFilter) {
                    console.log(`Further filtering orders for year ${yearFilter}`);
                    
                    filteredOrders = filteredOrders.filter(order => {
                        const orderDate = new Date(order.date || order.createdAt);
                        const orderYear = orderDate.getFullYear();
                        return orderYear === yearFilter;
                    });
                    
                    console.log(`After year filtering: ${filteredOrders.length} orders for year ${yearFilter}`);
                }
                
                return sanitizeOrders(filteredOrders);
            } else if (response.status === 403) {
                console.log('User does not have permission to access all orders');
                return [];
            } else {
                console.error(`Error fetching all orders: ${response.status}`);
                return [];
            }
        } catch (error) {
            console.error('Error accessing orders endpoints:', error.message);
            return [];
        }
    } catch (error) {
        console.error('Error in getEmployeeOrders:', error);
        return [];
    }
};

// Helper function to sanitize order data
const sanitizeOrders = (orders) => {
    if (!Array.isArray(orders)) {
        console.warn('Expected orders to be an array but got:', typeof orders);
        return [];
    }
    
    return orders.map(order => {
        // Handle client information properly
        let clientName = "Unknown Client";
        if (order.clientName) {
            clientName = order.clientName;
        } else if (order.client) {
            if (typeof order.client === 'object' && order.client.name) {
                clientName = order.client.name;
            } else if (typeof order.client === 'string') {
                clientName = order.client;
            }
        } else if (order.clientId && typeof order.clientId === 'object' && order.clientId.name) {
            clientName = order.clientId.name;
        }

        // Ensure numeric values are properly parsed
        const orderAmount = parseFloat(order.orderAmount || order.amount || 0);
        const orderQty = parseInt(order.orderQty || order.qty || 0);
        const sourcingCost = parseFloat(order.sourcingCost || 0);
        
        return {
            id: order._id || order.id || `temp-${Math.random().toString(36).substring(2, 9)}`,
            _id: order._id || order.id,
            client: order.client || { name: clientName },
            clientId: order.clientId || order.client?._id || '',
            clientName: clientName, // Explicitly add clientName field
            orderAmount: orderAmount,
            amount: orderAmount, // Add amount field for compatibility
            orderQty: orderQty,
            qty: orderQty, // Add qty field for compatibility
            sourcingCost: sourcingCost,
            date: order.date || new Date().toISOString(),
            createdAt: order.createdAt || new Date().toISOString(),
            updatedAt: order.updatedAt || new Date().toISOString()
        };
    });
};

// Add New Order (Employee Only)
export const addOrder = async (orderData) => {
    try {
        console.log("Adding new order with data:", orderData);
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.error("No authentication token found");
            throw new Error("Authentication error. Please log in again.");
        }
        
        // Validate required fields
        if (!orderData.clientId) {
            throw new Error("Client ID is required");
        }
        
        // Get user ID from localStorage or token
        let userId = localStorage.getItem('userId');
        if (!userId && token) {
            try {
                const tokenParts = token.split('.');
                if (tokenParts.length === 3) {
                    const base64Url = tokenParts[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(
                        atob(base64).split('').map(function(c) {
                            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                        }).join('')
                    );
                    
                    const decoded = JSON.parse(jsonPayload);
                    userId = decoded.id || decoded.userId || decoded.sub;
                    
                    if (userId) {
                        localStorage.setItem('userId', userId);
                        console.log("User ID extracted from token:", userId);
                    }
                }
            } catch (e) {
                console.error("Error extracting user ID from token:", e);
            }
        }
        
        if (!userId) {
            console.warn("No user ID found. Order will be associated with the authenticated user.");
        }
        
        // Ensure the data has all required fields and proper numeric values
        const sanitizedData = {
            clientId: orderData.clientId,
            orderAmount: typeof orderData.orderAmount === 'number' ? orderData.orderAmount : parseFloat(orderData.orderAmount) || 0,
            orderQty: typeof orderData.orderQty === 'number' ? orderData.orderQty : parseInt(orderData.orderQty) || 0,
            sourcingCost: typeof orderData.sourcingCost === 'number' ? orderData.sourcingCost : parseFloat(orderData.sourcingCost) || 0,
            date: orderData.date || new Date().toISOString(),
            // Include both employee ID and employee field for flexibility
            employeeId: userId || orderData.employeeId || null,
            employee: userId || orderData.employee || "current",
            // Add userId property as well for maximum compatibility
            userId: userId || null
        };
        
        console.log("Sanitized order data being sent:", sanitizedData);
        
        // Use main orders endpoint as per backend route definition
        try {
            const response = await fetch(`${API_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(sanitizedData)
            });
            
            console.log(`Order add request status: ${response.status}`);
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Authentication error. Please log in again.");
                } else if (response.status === 403) {
                    throw new Error("You don't have permission to add orders.");
                } else if (response.status === 400) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || "Invalid order data. Please check all fields.");
                } else {
                    throw new Error(`Server error (${response.status}). Please try again later.`);
                }
            }
            
            // Try to parse response as JSON
            try {
                const data = await response.json();
                console.log("Order added successfully, server response:", data);
        return data;
            } catch (jsonError) {
                console.warn("Response wasn't JSON but request was successful");
                return { success: true };
            }
        } catch (error) {
            console.error("Error in order API request:", error);
            throw error;
        }
    } catch (error) {
        console.error('Error adding new order:', error);
        
        // If it's already a handled error with a message, rethrow it
        if (error.message) {
            throw error;
        }
        
        // Fallback generic error
        throw new Error("Failed to add order. Please try again later.");
    }
};

// Update Employee's Own Order
export const updateOrder = async (orderId, orderData) => {
    try {
        const { data } = await axios.put(`${API_ORDERS_URL}/${orderId}`, orderData, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return data;
    } catch (error) {
        console.error('Failed to update order:', error);
        return null;
    }
};

// Delete Order (Admin Only)
export const deleteOrder = async (orderId) => {
    try {
        const { data } = await axios.delete(`${API_ORDERS_URL}/${orderId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return data;
    } catch (error) {
        console.error('Failed to delete order:', error);
        return null;
    }
};

// Get Employee Order Performance
export const getEmployeeOrderPerformance = async () => {
    try {
        console.log("Fetching employee order performance...");
        const token = localStorage.getItem('token');
        if (!token) {
            console.error("No authentication token found");
            return defaultOrderPerformance();
        }

        // Try to get order performance data
    try {
        const { data } = await axios.get(`${API_ORDERS_URL}/my-performance`, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });
            
            console.log("Employee order performance response:", data);
            
            // If we get valid data, return it
            if (data && (typeof data.totalAmount === 'number' || typeof data.totalOrderQty === 'number')) {
                return {
                    totalAmount: data.totalAmount || 0,
                    totalOrderQty: data.totalOrderQty || 0
                };
            }
            
            // If data doesn't match expected format, try fallback approach
            return await fallbackOrderPerformance();
            
        } catch (error) {
            console.error('Failed to fetch employee order performance:', error);
            console.error('Error details:', error.response ? error.response.data : 'No response data');
            
            // Try fallback approach
            return await fallbackOrderPerformance();
        }
    } catch (error) {
        console.error('Unexpected error in getEmployeeOrderPerformance:', error);
        return defaultOrderPerformance();
    }
};

// Fallback function to calculate order performance from orders if API endpoint is missing
async function fallbackOrderPerformance() {
    console.log("Using fallback approach for order performance");
    try {
        // Try to get individual orders and calculate totals manually
        const orders = await getEmployeeOrders();
        
        if (Array.isArray(orders) && orders.length > 0) {
            console.log(`Calculating performance from ${orders.length} orders`);
            
            const totalAmount = orders.reduce((sum, order) => {
                return sum + (parseFloat(order.orderAmount) || 0);
            }, 0);
            
            const totalOrderQty = orders.reduce((sum, order) => {
                return sum + (parseInt(order.orderQty) || 0);
            }, 0);
            
            return { totalAmount, totalOrderQty };
        }
        
        return defaultOrderPerformance();
    } catch (error) {
        console.error('Fallback order performance calculation failed:', error);
        return defaultOrderPerformance();
    }
}

// Default order performance data
function defaultOrderPerformance() {
    console.log("Returning default order performance data");
    return { totalAmount: 0, totalOrderQty: 0 };
}

// Get Monthly Order Performance
export const getMonthlyOrderPerformance = async () => {
    try {
        console.log("Fetching monthly order performance...");
        const token = localStorage.getItem('token');
        if (!token) {
            console.error("No authentication token found");
            return [];
        }

        // Get current user ID for more specific data fetching
        const userId = localStorage.getItem('userId');
        
        // Add timestamp to avoid caching issues
        const timestamp = new Date().getTime();
        
        // Create URL with userId if available for more specific targeting
        let url = `${API_ORDERS_URL}/my-monthly-performance?_t=${timestamp}`;
        if (userId) {
            url += `&userId=${userId}`;
            console.log(`Fetching order performance for employee with ID: ${userId}`);
        }

        console.log(`Fetching monthly order performance for employee with ID: ${userId || 'unknown'}`);

        // Fetch the data
        const response = await fetch(url, {
            method: 'GET',
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
        });
            
        if (!response.ok) {
            console.error(`Error fetching monthly order performance: ${response.status}`);
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Monthly order performance API response:", data);
            
        // If we have valid array data, process it
        if (Array.isArray(data) && data.length > 0) {
            // Properly format the data for the chart using fields that match the sales data structure
            return data.map(item => {
                const month = parseInt(item.month) || new Date().getMonth() + 1;
                const year = parseInt(item.year) || new Date().getFullYear();
                
                // Try to find the actual order amount from all possible field names
                const totalAmount = parseFloat(
                    // Check all possible fields for the actual order amount
                    item.totalAmount !== undefined ? item.totalAmount :
                    item.orderAmount !== undefined ? item.orderAmount : 
                    item.totalOrderAmount !== undefined ? item.totalOrderAmount :
                    item.amount !== undefined ? item.amount : 0
                );
                
                // Get target amount - check all possible fields
                const targetAmount = parseFloat(
                    item.targetAmount !== undefined ? item.targetAmount :
                    item.totalTarget !== undefined ? item.totalTarget : 
                    item.target !== undefined ? item.target : 0
                );
                
                console.log(`Month ${month} order data: totalAmount=${totalAmount}, targetAmount=${targetAmount}`);
                
                // Calculate performance percentage
                const performancePercent = targetAmount > 0 
                    ? Math.round((totalAmount / targetAmount) * 100) 
                    : 0;
                
                return {
                    month,
                    year,
                    // Standard fields for orders - ensure all are set to the same value
                    totalAmount: totalAmount,
                    orderAmount: totalAmount,
                    amount: totalAmount,
                    // Match sales data structure - CRITICAL for the chart to work
                    totalSalesAmount: totalAmount,
                    totalSales: totalAmount,
                    // Target fields
                    targetAmount: targetAmount,
                    totalTarget: targetAmount,
                    // Performance fields
                    performance: performancePercent,
                    performanceAmount: `${performancePercent}%`,
                    // Include employee info to ensure this is the current employee's data
                    employeeId: userId || 'current'
                };
            });
        }
        
        // If no valid data from API, try to get actual orders and aggregate them
        console.log("No valid order performance data from API, trying to aggregate from actual orders");
        
        try {
            // Get the employee's actual orders
            const orders = await getEmployeeOrders();
            
            if (Array.isArray(orders) && orders.length > 0) {
                console.log(`Found ${orders.length} actual orders to process`);
                
                // Group orders by month and year
                const ordersByMonth = {};
                
                orders.forEach(order => {
                    const orderDate = new Date(order.date || order.createdAt);
                    const month = orderDate.getMonth() + 1; // 1-12
                    const year = orderDate.getFullYear();
                    const key = `${year}-${month}`;
                    
                    if (!ordersByMonth[key]) {
                        ordersByMonth[key] = {
                            month,
                            year,
                            totalAmount: 0,
                            totalQty: 0,
                            orders: []
                        };
                    }
                    
                    // Add order amount - ensure it's a number
                    const orderAmount = parseFloat(order.orderAmount || order.amount || 0);
                    ordersByMonth[key].totalAmount += orderAmount;
                    ordersByMonth[key].totalQty += parseInt(order.orderQty || order.qty || 0);
                    ordersByMonth[key].orders.push(order);
                });
                
                console.log("Orders grouped by month:", ordersByMonth);
                
                // Format the data for the chart
                const currentYear = new Date().getFullYear();
                const monthlyData = Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    const key = `${currentYear}-${month}`;
                    
                    const monthData = ordersByMonth[key] || {
                        month,
                        year: currentYear,
                        totalAmount: 0,
                        totalQty: 0
                    };
                    
                    return {
                        month,
                        year: currentYear,
                        totalAmount: monthData.totalAmount,
                        orderAmount: monthData.totalAmount,
                        totalOrderQty: monthData.totalQty,
                        // Match sales data structure
                        totalSalesAmount: monthData.totalAmount,
                        totalSales: monthData.totalAmount,
                        // Default target to 0 - will be updated if targets are found
                        targetAmount: 0,
                        totalTarget: 0,
                        performance: 0,
                        performanceAmount: "0%",
                        employeeId: userId || 'current'
                    };
                });
                
                // Try to get targets to add to the data
                const targetsData = await getAssignedTargets();
                
                if (Array.isArray(targetsData) && targetsData.length > 0) {
                    // Filter for order targets for the current year
                    const orderTargets = targetsData.filter(target => {
                        const targetType = (target.targetType || '').toLowerCase();
                        return (targetType === 'order' || targetType === 'orders') && 
                               parseInt(target.year) === currentYear;
                    });
                    
                    console.log(`Found ${orderTargets.length} order targets for year ${currentYear}`);
                    
                    // Update the monthly data with target values
                    orderTargets.forEach(target => {
                        const month = parseInt(target.month);
                        
                        if (month && month >= 1 && month <= 12) {
                            const monthIndex = month - 1;
                            const targetAmount = parseFloat(target.targetAmount || target.amount || 0);
                            
                            if (targetAmount > 0) {
                                monthlyData[monthIndex].targetAmount = targetAmount;
                                monthlyData[monthIndex].totalTarget = targetAmount;
                                
                                // Update performance percentage
                                const totalAmount = monthlyData[monthIndex].totalAmount;
                                const performancePercent = Math.round((totalAmount / targetAmount) * 100);
                                
                                monthlyData[monthIndex].performance = performancePercent;
                                monthlyData[monthIndex].performanceAmount = `${performancePercent}%`;
                            }
                        }
                    });
                }
                
                console.log("Generated monthly order performance data from actual orders:", monthlyData);
                return monthlyData;
            }
        } catch (ordersError) {
            console.error("Error trying to generate performance from orders:", ordersError);
        }
        
        // If all else fails, return empty data with structure for all months in the current year
        console.log("Falling back to empty order performance data");
        const currentYear = new Date().getFullYear();
        const emptyData = Array.from({ length: 12 }, (_, i) => {
            const month = i + 1;
            return {
                month,
                year: currentYear,
                // Standard fields for orders
                totalAmount: 0,
                orderAmount: 0,
                totalOrderQty: 0,
                // Match sales data structure for chart compatibility
                totalSalesAmount: 0,
                totalSales: 0,
                // Target fields
                targetAmount: 0,
                totalTarget: 0,
                // Performance fields
                performance: 0,
                performanceAmount: "0%",
                employeeId: userId || 'current'
            };
        });
        
        // Try to merge with any target data we might have
        const targetsData = await getAssignedTargets();
        if (Array.isArray(targetsData) && targetsData.length > 0) {
            console.log("Found targets to merge with empty order data:", targetsData.length);
            
            // Filter for order targets in the current year
            const relevantTargets = targetsData.filter(target => {
                const isOrderTarget = (target.targetType || '').toLowerCase().includes('order');
                const isCurrentYear = parseInt(target.year) === currentYear;
                return isOrderTarget && isCurrentYear;
            });
            
            console.log(`Found ${relevantTargets.length} relevant order targets for year ${currentYear}`);
            
            // Update empty data with target values
            relevantTargets.forEach(target => {
                const month = parseInt(target.month);
                if (month && month >= 1 && month <= 12) {
                    const monthIndex = month - 1;
                    const targetAmount = parseFloat(target.targetAmount || target.amount || 0);
                    
                    emptyData[monthIndex].targetAmount = targetAmount;
                    emptyData[monthIndex].totalTarget = targetAmount;
                }
            });
        }
        
        console.log("Returning empty order performance data with targets:", emptyData);
        return emptyData;
    } catch (error) {
        console.error('Error in getMonthlyOrderPerformance:', error);
        console.error('Error details:', error.response ? error.response.data : 'No response data');
        
        // Return empty data structure for all months in the current year
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            year: currentYear,
            totalAmount: 0,
            orderAmount: 0,
            totalOrderQty: 0,
            totalSalesAmount: 0, // For chart compatibility
            totalSales: 0,       // For chart compatibility
            targetAmount: 0,
            totalTarget: 0,
            performance: 0,
            performanceAmount: "0%",
            employeeId: 'current'
        }));
    }
};

// Get Monthly Order Performance for all employees/teams
export const getAllOrdersMonthlyPerformance = async (filters = {}) => {
    try {
        const { data } = await axios.get(`${API_ORDERS_URL}/all-orders-performance/monthly`, {
            params: filters,
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        console.log("Order monthly performance API response with filters:", filters);
        return data;
    } catch (error) {
        console.error('Error fetching all orders monthly performance:', error);
        return null;
    }
};

// Get Orders Performance By Employee
export const getAllEmployeesOrderPerformance = async (filters = {}) => {
    try {
        console.log("Fetching employees order performance with filters:", filters);
        
        // Add timestamp to avoid caching issues
        const timestamp = new Date().getTime();
        
        // Ensure we have the authorization token
        const token = localStorage.getItem('token');
        if (!token) {
            console.error("No authentication token found for employee order performance request");
            return [];
        }
        
        // Make the API call with filters
        const response = await axios.get(`${API_ORDERS_URL}/employees-order-performance`, {
            params: { ...filters, _t: timestamp },
            headers: { 
                Authorization: `Bearer ${token}`,
                'Cache-Control': 'no-cache'
            }
        });
        
        const { data } = response;
        
        // Log the raw API response
        console.log("Orders API response received:", response.status);
        console.log("Order data structure:", data && Array.isArray(data) 
            ? `Array with ${data.length} items` 
            : (data ? typeof data : "null or undefined"));
        
        if (data && data.length > 0) {
            console.log("Sample order performance record:", data[0]);
        }
        
        // Handle different response formats and ensure we return a properly structured array
        if (Array.isArray(data)) {
            return data.map(item => {
                // Handle various field names that might exist in the API response
                const employeeName = item.employeeName || 
                                    (item.employee && item.employee.name) || 
                                    "Unknown Employee";
                
                const employeeId = item.employeeId || 
                                  (item.employee && (item.employee._id || item.employee.id)) || 
                                  item._id || 
                                  "";
                
                const totalOrderAmount = parseFloat(
                    item.totalOrderAmount !== undefined ? item.totalOrderAmount :
                    item.orderAmount !== undefined ? item.orderAmount :
                    item.amount !== undefined ? item.amount : 0
                );
                
                const targetAmount = parseFloat(
                    item.targetAmount !== undefined ? item.targetAmount :
                    item.target !== undefined ? item.target : 0
                );
                
                // Calculate performance if not provided
                let performanceAmount = "0%";
                if (item.performanceAmount) {
                    performanceAmount = item.performanceAmount;
                } else if (targetAmount > 0) {
                    const performance = Math.min((totalOrderAmount / targetAmount) * 100, 100);
                    performanceAmount = `${performance.toFixed(2)}%`;
                }
                
                return {
                    employeeId,
                    employeeName,
                    totalOrderAmount,
                    targetAmount,
                    performanceAmount,
                    performancePercentage: parseFloat(performanceAmount.replace('%', ''))
                };
            });
        } else if (data && typeof data === 'object') {
            // If data is an object but not an array, it might be a single record or have a nested data property
            if (data.data && Array.isArray(data.data)) {
                console.log("Found nested data array with", data.data.length, "items");
                return data.data.map(/* same mapping as above */);
            } else {
                // Single record case
                console.log("Processing single record response");
                const item = data;
                // Apply the same mapping as in the array case
                // ... 
                return [{
                    employeeId: item.employeeId || "",
                    employeeName: item.employeeName || "Unknown Employee",
                    totalOrderAmount: parseFloat(item.totalOrderAmount || 0),
                    targetAmount: parseFloat(item.targetAmount || 0),
                    performanceAmount: item.performanceAmount || "0%",
                    performancePercentage: parseFloat(item.performanceAmount?.replace('%', '') || 0)
                }];
            }
        }
        
        console.warn("No valid data format received from API for order performance");
        return [];
    } catch (error) {
        console.error('Error fetching employees order performance:', error);
        console.error('Error details:', error.response ? error.response.data : 'No response data');
        console.error('Error status:', error.response ? error.response.status : 'No status code');
        return [];
    }
};

// Get Team Members' Order Performance (Team Manager Only)
export const getTeamMembersOrderPerformance = async (filters = {}) => {
    try {
        console.log("Calling getTeamMembersOrderPerformance with filters:", filters);
        
        // Get and log the token to ensure it's available
        const token = localStorage.getItem('token');
        if (!token) {
            console.error("No authentication token found for team orders performance request");
            return [];
        }
        
        // Add timestamp to avoid caching issues
        const timestamp = new Date().getTime();
        const requestParams = { ...filters, _t: timestamp };
        
        console.log("Making API request to:", `${API_ORDERS_URL}/team-members-performance`);
        console.log("With params:", requestParams);
        
        const response = await axios.get(`${API_ORDERS_URL}/team-members-performance`, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Cache-Control': 'no-cache'
            },
            params: requestParams
        });
        
        const { data } = response;
        
        // Log detailed response information
        console.log("Team members orders API response status:", response.status);
        console.log("Team members orders data structure:", data && Array.isArray(data) 
            ? `Array with ${data.length} items` 
            : (data ? typeof data : "null or undefined"));
        
        if (data && Array.isArray(data) && data.length > 0) {
            console.log("Sample order performance record:", data[0]);
        } else {
            console.warn("Empty or invalid orders data received from API:", data);
        }
        
        return data;
    } catch (error) {
        console.error('Error fetching team members order performance:', error);
        console.error('Error details:', error.response ? error.response.data : 'No response data');
        console.error('Error status:', error.response ? error.response.status : 'No status available');
        return [];
    }
}; 