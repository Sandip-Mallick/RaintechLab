import { getAllSales } from './salesService';
import { getAllOrders } from './orderService';
import { getAllTargets, getTeamMemberTargets } from './targetService';
import { getTeamMembersSalesPerformance } from './salesService';
import { getTeamMembersOrderPerformance } from './orderService';

// Function to determine available years for Admin Dashboard
export const determineAdminDashboardYears = async () => {
    try {
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
            
        // Get years from orders data
        const orderYears = Array.isArray(allOrders) ? 
            [...new Set(allOrders.map(order => {
                const date = new Date(order.date || order.createdAt);
                return date.getFullYear();
            }).filter(Boolean))] : [];
            
        // Get years from targets data
        const targetYears = Array.isArray(allTargets) ? 
            [...new Set(allTargets.map(target => parseInt(String(target.year))).filter(Boolean))] : [];
            
        // Combine all years and ensure they're unique
        return [...new Set([...salesYears, ...orderYears, ...targetYears])];
    } catch (error) {
        console.error("Error determining admin dashboard years:", error);
        return [];
    }
};

// Function to determine available years for Team Manager Dashboard
export const determineTeamManagerDashboardYears = async () => {
    try {
        console.log("Starting determineTeamManagerDashboardYears");
        
        // Fetch all relevant team data to analyze available years
        console.log("Fetching team data from services...");
        const teamSalesPromise = getTeamMembersSalesPerformance({});
        const teamOrdersPromise = getTeamMembersOrderPerformance({});
        const teamTargetsPromise = getTeamMemberTargets({});
        
        const [teamSales, teamOrders, teamTargets] = await Promise.all([
            teamSalesPromise,
            teamOrdersPromise,
            teamTargetsPromise
        ]);
        
        console.log("Team data received:", {
            salesCount: Array.isArray(teamSales) ? teamSales.length : "not an array",
            ordersCount: Array.isArray(teamOrders) ? teamOrders.length : "not an array",
            targetsCount: Array.isArray(teamTargets) ? teamTargets.length : "not an array"
        });
        
        // Debug target data thoroughly
        if (Array.isArray(teamTargets) && teamTargets.length > 0) {
            console.log("First team target:", teamTargets[0]);
            
            // Log all years from targets
            const allTargetYears = teamTargets.map(target => target.year);
            console.log("All target years (raw):", allTargetYears);
        } else {
            console.log("No team targets available");
        }
        
        // Extract years from team sales data
        const salesYears = Array.isArray(teamSales) ? 
            [...new Set(teamSales.map(sale => {
                // Try to extract year from date field
                if (sale.date) {
                    return new Date(sale.date).getFullYear();
                }
                // Try year field directly if exists
                if (sale.year) {
                    return parseInt(sale.year);
                }
                return null;
            }).filter(Boolean))] : [];
            
        // Extract years from team orders data
        const orderYears = Array.isArray(teamOrders) ? 
            [...new Set(teamOrders.map(order => {
                // Try to extract year from date field
                if (order.date) {
                    return new Date(order.date).getFullYear();
                }
                // Try year field directly if exists
                if (order.year) {
                    return parseInt(order.year);
                }
                return null;
            }).filter(Boolean))] : [];
            
        // Extract years from team targets data with better validation
        const targetYears = Array.isArray(teamTargets) ? 
            [...new Set(teamTargets.map(target => {
                if (target && target.year) {
                    const yearValue = parseInt(target.year);
                    console.log(`Target year parsed: ${yearValue} from original value: ${target.year}`);
                    return isNaN(yearValue) ? null : yearValue;
                }
                return null;
            }).filter(Boolean))] : [];
        
        console.log("Extracted years from data sources:", {
            salesYears,
            orderYears,
            targetYears
        });
            
        // Combine all years and ensure they're unique
        const allYears = [...new Set([...salesYears, ...orderYears, ...targetYears])];
        console.log("Combined unique years:", allYears);
        
        return allYears;
    } catch (error) {
        console.error("Error determining team manager dashboard years:", error);
        return [];
    }
}; 