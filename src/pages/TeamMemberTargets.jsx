import React, { useState, useEffect, useMemo } from 'react';
import DataTable from '@/components/ui/DataTable';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Loader, Info } from 'lucide-react';
import { getTeamMemberTargets } from '../services/targetService';
import { jwtDecode } from "jwt-decode";

// Helper function to convert month number to name
const getMonthName = (monthNumber) => {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Convert to number and subtract 1 for zero-indexing
    const index = parseInt(monthNumber) - 1;
    return months[index] || monthNumber;
};

const TeamMemberTargets = () => {
    const [loading, setLoading] = useState(true);
    const [targets, setTargets] = useState([]);
    const [hasSalesPermission, setHasSalesPermission] = useState(true);
    const [hasOrdersPermission, setHasOrdersPermission] = useState(true);
    const [userRole, setUserRole] = useState('');

    // Fetch team members and targets on component mount
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                checkUserRole();
                checkUserPermissions();
                await fetchTargets();
            } catch (error) {
                console.error('Error initializing TeamMemberTargets:', error);
                toast.error('Failed to load targets data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const checkUserRole = () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const decoded = jwtDecode(token);
                setUserRole(decoded.role);
            }
        } catch (error) {
            console.error('Error checking user role:', error);
        }
    };

    const checkUserPermissions = () => {
        const userProfile = JSON.parse(localStorage.getItem('userProfile')) || {};
        const permissions = userProfile.permissions || '';
        
        console.log('User permissions:', permissions);
        
        setHasSalesPermission(
            permissions === 'Sales' || 
            permissions === 'Sales & Orders' || 
            permissions === 'All Permissions'
        );
        
        setHasOrdersPermission(
            permissions === 'Orders' || 
            permissions === 'Sales & Orders' || 
            permissions === 'All Permissions'
        );
    };

    // Fetch targets for team members
    const fetchTargets = async () => {
        try {
            console.log('Fetching team member targets...');
            const response = await getTeamMemberTargets();
            
            console.log('Raw targets data:', response);
            
            if (Array.isArray(response)) {
                // Format the targets with employee names
                const formattedTargets = response.map(target => {
                    // Safely parse numeric values
                    const rawAmount = target.targetAmount || target.amount;
                    const parsedAmount = typeof rawAmount === 'number' ? rawAmount : 
                                        (rawAmount && !isNaN(parseFloat(rawAmount)) ? parseFloat(rawAmount) : 0);
                    
                    // Safely parse target quantity
                    const rawQty = target.targetQty || target.qty || rawAmount;
                    const parsedQty = typeof rawQty === 'number' ? rawQty : 
                                     (rawQty && !isNaN(parseFloat(rawQty)) ? parseFloat(rawQty) : 0);
                    
                    // Get employee name from various possible fields
                    const employeeName = target.employeeName || 
                                        (target.employee?.name) || 
                                        (target.assignedTo?.name) || 
                                        'Unknown Employee';
                    
                    // Determine who set the target
                    const setBy = target.setBy || 
                                 (target.createdBy?.name) || 
                                 (target.createdBy === 'team_manager' ? 'Team Manager' : 'Admin') ||
                                 'Admin';
                    
                    // Get month as string or number
                    let month = target.month || target.targetMonth;
                    // If it's a number, ensure proper formatting
                    if (typeof month === 'number') {
                        month = month < 10 ? `0${month}` : `${month}`;
                    }

                    // Filter targets based on permissions
                    const targetTypeStr = (target.targetType || '').toLowerCase();
                    const isSalesTarget = targetTypeStr.includes('sale');
                    const isOrderTarget = targetTypeStr.includes('order');
                    
                    return {
                        ...target,
                        _id: target._id,
                        employeeId: target.employeeId || target.employee?._id,
                        employeeName: employeeName,
                        setBy: setBy,
                        // Format the target type for display
                        targetType: (target.targetType === 'sales' || target.type === 'sales') ? 'Sales' : 'Orders',
                        // Ensure amount is a valid number and format for display
                        amount: parsedAmount,
                        targetAmount: parsedAmount,
                        targetAmountDisplay: `₹${parsedAmount.toLocaleString()}`,
                        // Add target quantity
                        targetQty: parsedQty,
                        targetQtyDisplay: parsedQty.toLocaleString(),
                        // Month and year
                        month: month,
                        monthDisplay: getMonthName(month) || '',
                        year: target.year ? Number(target.year) : new Date().getFullYear(),
                        // Add permissions info for filtering
                        isSalesTarget,
                        isOrderTarget
                    };
                });
                
                // Filter targets based on team manager's permissions
                const filteredTargets = formattedTargets.filter(target => 
                    (target.isSalesTarget && hasSalesPermission) || 
                    (target.isOrderTarget && hasOrdersPermission)
                );
                
                console.log('Filtered targets based on permissions:', filteredTargets);
                setTargets(filteredTargets);
            } else {
                console.warn('No targets found or invalid format');
                setTargets([]);
            }
        } catch (error) {
            console.error('Error fetching targets:', error);
            toast.error(error.message || 'Failed to load targets. Please try again.');
        }
    };

    // Define columns for DataTable
    const columns = [
        { header: 'Employee', accessor: 'employeeName' },
        { header: 'Target Type', accessor: 'targetType' },
        { header: 'Target Amount', accessor: 'targetAmountDisplay' },
        { header: 'Target Quantity', accessor: 'targetQtyDisplay' },
        { header: 'Month', accessor: 'monthDisplay' },
        { header: 'Year', accessor: 'year' },
        { header: 'Set By', accessor: 'setBy' }
    ];

    // Prepare data for DataTable with filtered permissions
    const tableData = useMemo(() => {
        return targets;
    }, [targets]);

    return (
        <div className="p-6 bg-background min-h-screen">
            <ToastContainer />

            {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader className="animate-spin text-primary" size={36} />
                </div>
            ) : (
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-primary">Team Member Targets</h1>
                        {/* No add button for team managers - view only */}
                    </div>

                    {targets.length > 0 ? (
                <DataTable
                    columns={columns}
                            data={tableData} 
                            pagination={true} 
                            defaultPageSize={10}
                        />
                    ) : (
                        <div className="text-center p-8 bg-gray-50 rounded-lg">
                            <Info className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-semibold text-gray-900">No targets found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                No targets have been set for your team members yet.
                            </p>
                        </div>
                    )}
                        </div>
            )}
        </div>
    );
};

export default TeamMemberTargets; 