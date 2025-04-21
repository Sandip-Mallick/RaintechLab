// src/pages/MyTargets.js
import React, { useEffect, useState } from 'react';
import DataTable from '@/components/ui/DataTable';
import { getAssignedTargets } from '@/services/targetService';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Loader } from 'lucide-react';
import Select from 'react-select';

const targetTypeOptions = [
    { value: 'all', label: 'All Targets' },
    { value: 'sales', label: 'Sales Targets' },
    { value: 'order', label: 'Order Targets' }
];

const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const MyTargets = () => {
    const [targets, setTargets] = useState([]);
    const [filteredTargets, setFilteredTargets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [targetTypeFilter, setTargetTypeFilter] = useState({ value: 'all', label: 'All Targets' });

    useEffect(() => {
        fetchTargets();
    }, []);

    useEffect(() => {
        if (targets) {
            filterTargets(targetTypeFilter.value);
        }
    }, [targets, targetTypeFilter]);

    const fetchTargets = async () => {
        setLoading(true);
        try {
            const data = await getAssignedTargets();
            console.log("Raw targets data:", data);
            
            if (data && data.length > 0) {
                // Format the data
                const formattedData = data.map(target => {
                    // Normalize target type
                    let displayType;
                    let filterType;
                    
                    // Handle different variations of target types
                    const type = target.targetType?.toLowerCase() || '';
                    if (type === 'sales' || type === 'sale') {
                        displayType = 'Sales';
                        filterType = 'sales';
                    } else if (type === 'orders' || type === 'order') {
                        displayType = 'Orders';
                        filterType = 'order';
                    } else {
                        displayType = 'Unknown';
                        filterType = 'unknown';
                    }
                    
                    return {
                        ...target,
                        month: monthNames[target.month - 1], // Convert month number to name
                        targetType: displayType,
                        displayTargetType: filterType,
                        targetAmount: parseFloat(target.targetAmount) || 0,
                        targetQty: parseInt(target.targetQty) || 0,
                        setBy: target.createdBy?.name || 
                              (target.createdBy === 'team_manager' ? 'Team Manager' : 'Admin') ||
                              (target.createdBy?.role === 'team_manager' ? 'Team Manager' : 'Admin')
                    };
                });
                
                console.log("Formatted targets data:", formattedData);
                setTargets(formattedData);
                setFilteredTargets(formattedData);
            } else {
                setTargets([]);
                setFilteredTargets([]);
            }
        } catch (error) {
            console.error('Error fetching targets:', error);
            toast.error('Failed to load targets');
            setTargets([]);
            setFilteredTargets([]);
        } finally {
            setLoading(false);
        }
    };

    const filterTargets = (type) => {
        if (!targets || targets.length === 0) return;
        
        if (type === 'all') {
            setFilteredTargets(targets);
        } else {
            // Use the original targetType value for filtering
            const filtered = targets.filter(target => target.displayTargetType === type);
            setFilteredTargets(filtered);
        }
    };

    const targetColumns = [
        { header: 'Target Type', accessor: 'targetType' },
        { header: 'Target Amount', accessor: 'targetAmount', format: value => `₹${value.toLocaleString()}` },
        { header: 'Target Quantity', accessor: 'targetQty' },
        { header: 'Month', accessor: 'month' },
        { header: 'Year', accessor: 'year' },
        { header: 'Set By', accessor: 'setBy' }
    ];

    return (
        <div className="p-8 bg-background min-h-screen">
            <ToastContainer />
            
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
                    <Loader className="animate-spin text-primary" size={50} />
                </div>
            )}
            
            <div className="bg-white p-6 shadow-card rounded-xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-primary">My Targets</h2>
                    <div className="w-64">
                        <Select
                            options={targetTypeOptions}
                            value={targetTypeFilter}
                            onChange={setTargetTypeFilter}
                            className="basic-single"
                            classNamePrefix="select"
                            placeholder="Filter by type"
                        />
                    </div>
                </div>
                
                {loading ? (
                    <p className="text-gray-500 text-center">Loading targets...</p>
                ) : filteredTargets && filteredTargets.length > 0 ? (
                    <DataTable 
                        columns={targetColumns} 
                        data={filteredTargets} 
                        title="" // Remove title as we already have one
                    />
                ) : (
                    <p className="text-gray-500 text-center py-6">
                        {targets && targets.length > 0 
                            ? 'No targets match the selected filter.'
                            : 'No targets have been assigned to you yet.'}
                    </p>
                )}
            </div>
        </div>
    );
};

export default MyTargets;
