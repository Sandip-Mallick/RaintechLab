import React, { useState, useEffect } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { getAllTargets, addTarget, updateTarget, deleteTarget } from '@/services/targetService';
import { getEmployees } from '@/services/apiService';
import { getAllTeams } from '@/services/teamService';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Select from 'react-select';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion } from 'framer-motion';
import { Loader, Edit, Trash2, Info } from 'lucide-react';

// Validation Schema
const schema = yup.object().shape({
    targetType: yup.string().oneOf(['sales', 'order']).required('Target type is required'),
    targetAmount: yup.number()
        .typeError('Please enter a valid number for target amount')
        .positive('Target amount must be greater than zero')
        .required('Target amount is required'),
    targetQty: yup.number()
        .typeError('Please enter a valid number for target quantity')
        .positive('Target quantity must be greater than zero')
        .required('Target quantity is required'),
    month: yup.number().min(1).max(12).required('Month is required'),
    year: yup.number().positive().required('Year is required'),
    assignedTo: yup.array().min(1, 'At least one user or team must be selected').required('Assigned to is required'),
});

const columns = [
    { header: 'Assigned To', accessor: 'assignedTo' },
    { header: 'Target Type', accessor: 'targetType' },
    { header: 'Target Amount', accessor: 'targetAmount' },
    { header: 'Target Quantity', accessor: 'targetQty' },
    { header: 'Month', accessor: 'month' },
    { header: 'Year', accessor: 'year' },
    { header: 'Set by', accessor: 'setBy' },
    { header: 'Actions', accessor: 'actions' },
];

const targetTypeOptions = [
    { value: 'sales', label: 'Sales Target' },
    { value: 'order', label: 'Order Target' }
];

// Month options for dropdown
const monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
];

// Helper function to convert month number to name
const getMonthName = (monthNumber) => {
    return monthOptions.find(month => month.value === monthNumber)?.label || monthNumber;
};

const TargetManagement = () => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [targetData, setTargetData] = useState([]);
    const [employeeOptions, setEmployeeOptions] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]); // Store all employees
    const [teamOptions, setTeamOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isEditMode, setEditMode] = useState(false);
    const [editTargetId, setEditTargetId] = useState(null);
    const [validationError, setValidationError] = useState('');
    const [teamPermissionsMap, setTeamPermissionsMap] = useState({});
    const [teamMembersMap, setTeamMembersMap] = useState({}); // Map of team ID to member IDs
    const [filteredOptions, setFilteredOptions] = useState({ // For storing filtered options
        employees: [],
        teams: []
    });

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            targetType: '',
            targetAmount: '',
            targetQty: '',
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            assignedTo: []
        }
    });

    const targetType = watch('targetType');

    // Fetch data on component mount
    useEffect(() => {
        fetchTargetData();
        fetchEmployeeData();
        fetchTeamData();
    }, []);

    // Fetch target data
    const fetchTargetData = async () => {
        setLoading(true);
        try {
            const data = await getAllTargets();
            const formattedData = data.map((target) => ({
                ...target,
                month: getMonthName(target.month), // Convert month number to name for display
                targetType: target.targetType === 'sales' ? 'Sales' : 'Order', // Capitalize target type
                assignedTo: target.assignedTo?.name || target.assignedTo?.teamName || 'Unknown',
                setBy: target.createdBy?.name || 
                      (target.createdBy?.role === 'team_manager' ? 'Team Manager' : 'Admin') || 
                      (typeof target.createdBy === 'string' && target.createdBy === 'team_manager' ? 'Team Manager' : 'Admin'), // Handle different formats of creator data
                actions: (
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleEditClick(target)}
                            className="p-1 text-blue-500 hover:text-blue-700"
                            title="Edit"
                        >
                            <Edit size={16} />
                        </button>
                        <button
                            onClick={() => handleDeleteClick(target._id)}
                            className="p-1 text-red-500 hover:text-red-700"
                            title="Delete"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ),
            }));
            setTargetData(formattedData);
        } catch (error) {
            toast.error('Failed to fetch target data');
        }
        setLoading(false);
    };

    // Fetch employees for dropdown
    const fetchEmployeeData = async () => {
        try {
            const data = await getEmployees();
            
            // Filter out team managers - only include regular employees
            const filteredEmployees = data.filter(emp => emp.role !== 'Team Manager');
            
            // Store all employees (excluding team managers)
            const employees = filteredEmployees.map((emp) => ({ 
                value: emp._id, 
                label: emp.name,
                permissions: emp.permissions,
                role: emp.role
            }));
            
            console.log(`Found ${data.length} total employees, showing ${employees.length} (Team Managers filtered out)`);
            
            setAllEmployees(employees);
            setEmployeeOptions(employees); // Initially show all employees excluding team managers
        } catch (error) {
            toast.error('Failed to fetch employee data');
        }
    };

    // Fetch teams for dropdown
    const fetchTeamData = async () => {
        try {
            const data = await getAllTeams();
            console.log('Fetched team data:', data);
            
            // Create maps for team permissions and members
            const permissionsMap = {};
            const membersMap = {};
            
            for (const team of data) {
                // Skip teams with no members
                if (!team.members || team.members.length === 0) {
                    console.log(`Team ${team.teamName} has no members, skipping permission check`);
                    permissionsMap[team._id] = { hasOrders: false, hasSales: false };
                    membersMap[team._id] = [];
                    continue;
                }
                
                // Check each member's permissions
                const permissions = {
                    hasOrders: false,
                    hasSales: false
                };
                
                // Store member IDs for this team
                membersMap[team._id] = team.members.map(member => member._id);
                
                console.log(`Team ${team.teamName} has ${team.members.length} members:`, team.members);
                
                // Count permissions by type
                let salesCount = 0;
                let ordersCount = 0;
                let bothCount = 0;
                let allPermCount = 0;
                
                for (const member of team.members) {
                    if (!member || !member.permissions) {
                        console.warn(`Missing member data or permissions in team ${team.teamName}:`, member);
                        continue;
                    }
                    
                    console.log(`Member ${member.name} (${member._id}) has permissions:`, member.permissions);
                    
                    // Check for Sales permissions - including "All Permissions"
                    if (
                        member.permissions === 'Sales' || 
                        member.permissions === 'Sales & Orders' || 
                        member.permissions === 'All Permissions'
                    ) {
                        permissions.hasSales = true;
                        
                        // Track permission counts
                        if (member.permissions === 'Sales') salesCount++;
                        if (member.permissions === 'Sales & Orders') bothCount++;
                        if (member.permissions === 'All Permissions') allPermCount++;
                    }
                    
                    // Check for Orders permissions - including "All Permissions"
                    if (
                        member.permissions === 'Orders' || 
                        member.permissions === 'Sales & Orders' || 
                        member.permissions === 'All Permissions'
                    ) {
                        permissions.hasOrders = true;
                        
                        // Track permission counts
                        if (member.permissions === 'Orders') ordersCount++;
                        if (member.permissions === 'Sales & Orders') bothCount++; // Already counted above
                        if (member.permissions === 'All Permissions') allPermCount++; // Already counted above
                    }
                }
                
                permissionsMap[team._id] = permissions;
                console.log(`Team ${team.teamName} calculated permissions:`, permissions);
                console.log(`Permission breakdown - Sales: ${salesCount}, Orders: ${ordersCount}, Both: ${bothCount}, All: ${allPermCount}`);
            }
            
            setTeamPermissionsMap(permissionsMap);
            setTeamMembersMap(membersMap);
            
            setTeamOptions(data.map((team) => ({ 
                value: team._id, 
                label: team.teamName,
                members: team.members || []
            })));
            
            // Log all team permissions for debugging
            console.log('Final team permissions map:', permissionsMap);
            
            // Initialize filtered options based on current target type
            updateFilteredOptions(data, watch('targetType'));
        } catch (error) {
            console.error('Failed to fetch team data:', error);
            toast.error('Failed to fetch team data');
        }
    };
    
    // Function to update filtered options based on target type and selected entities
    const updateFilteredOptions = (teams = teamOptions, targetType = watch('targetType'), selectedOptions = watch('assignedTo') || []) => {
        if (!targetType) {
            setFilteredOptions({
                employees: employeeOptions, // Already filtered to exclude team managers
                teams: teamOptions
            });
            return;
        }
        
        console.log(`Filtering options for target type: ${targetType}`);
        
        // Get selected team IDs and employee IDs
        const selectedTeamIds = selectedOptions
            .filter(option => teamOptions.some(team => team.value === option.value))
            .map(option => option.value);
        
        const selectedEmployeeIds = selectedOptions
            .filter(option => employeeOptions.some(emp => emp.value === option.value))
            .map(option => option.value);
        
        // Get all member IDs from selected teams
        const selectedTeamMemberIds = selectedTeamIds.reduce((acc, teamId) => {
            return [...acc, ...(teamMembersMap[teamId] || [])];
        }, []);
        
        // Create a map of which teams each selected employee belongs to
        const employeeTeamMap = {};
        
        // For each selected employee, find which teams they belong to
        for (const empId of selectedEmployeeIds) {
            employeeTeamMap[empId] = [];
            
            // Check all teams to see if this employee is a member
            Object.entries(teamMembersMap).forEach(([teamId, memberIds]) => {
                if (memberIds.includes(empId)) {
                    employeeTeamMap[empId].push(teamId);
                }
            });
        }
        
        // Filter employees based on permissions and team membership
        // allEmployees is already filtered to exclude team managers
        let filteredEmployees = allEmployees.filter(emp => {
            // Check if employee has appropriate permissions for the target type
            const hasPermission = 
                (targetType === 'sales' && (emp.permissions === 'Sales' || emp.permissions === 'Sales & Orders' || emp.permissions === 'All Permissions')) ||
                (targetType === 'order' && (emp.permissions === 'Orders' || emp.permissions === 'Sales & Orders' || emp.permissions === 'All Permissions'));
                
            // If employee doesn't have the right permission, filter them out
            if (!hasPermission) {
                return false;
            }
            
            // If employee is already in a selected team, we should disable them but still show them
            return true;
        }).map(emp => {
            // Check if employee has appropriate permissions for the target type
            const hasPermission = 
                (targetType === 'sales' && (emp.permissions === 'Sales' || emp.permissions === 'Sales & Orders' || emp.permissions === 'All Permissions')) ||
                (targetType === 'order' && (emp.permissions === 'Orders' || emp.permissions === 'Sales & Orders' || emp.permissions === 'All Permissions'));
            
            // If employee is already in a selected team, we should disable them
            const isInSelectedTeam = selectedTeamMemberIds.includes(emp.value);
            
            // Find which teams this employee belongs to (for better labeling)
            const employeeTeams = [];
            Object.entries(teamMembersMap).forEach(([teamId, memberIds]) => {
                if (memberIds.includes(emp.value) && selectedTeamIds.includes(teamId)) {
                    const team = teamOptions.find(t => t.value === teamId);
                    if (team) employeeTeams.push(team.label);
                }
            });
            
            let label = emp.label;
            
            // Add info about team membership if relevant
            if (isInSelectedTeam && employeeTeams.length > 0) {
                label = `${emp.label} (Already in ${employeeTeams.join(', ')})`;
            }
            
            // For employees without required permissions, explain why they're disabled
            if (!hasPermission) {
                if (targetType === 'sales') {
                    label = `${emp.label} (No sales permission)`;
                } else {
                    label = `${emp.label} (No orders permission)`;
                }
            }
            
            return {
                ...emp,
                label,
                isDisabled: isInSelectedTeam || !hasPermission,
            };
        });
        
        // Process all teams, marking them as disabled if they don't have members with proper permissions
        console.log('Processing teams for filtering:');
        
        const allTeamsWithStatus = teams.map(team => {
            const teamId = typeof team.value === 'string' ? team.value : team._id;
            const teamPermissions = teamPermissionsMap[teamId] || { hasOrders: false, hasSales: false };
            
            // Debug log for team permissions
            console.log(`Team ${team.label || team.teamName} permissions:`, teamPermissions);
            
            // Check if team has appropriate permissions for target type
            const hasPermission = 
                (targetType === 'sales' && teamPermissions.hasSales) ||
                (targetType === 'order' && teamPermissions.hasOrders);
            
            console.log(`Team ${team.label || team.teamName} hasPermission: ${hasPermission}`);
            
            // Get team members
            const teamMembers = teamMembersMap[teamId] || [];
            
            // Count how many members of this team are already individually selected
            const selectedMemberCount = teamMembers.filter(memberId => 
                selectedEmployeeIds.includes(memberId)
            ).length;
            
            // If any member of this team is selected individually, the team should be disabled
            const hasSelectedMember = selectedMemberCount > 0;
            
            let label = team.label || team.teamName;
            
            if (!hasPermission) {
                if (targetType === 'sales') {
                    label = `${label} (No members with sales permission)`;
                } else {
                    label = `${label} (No members with orders permission)`;
                }
            } else if (hasSelectedMember) {
                // Find which members are selected
                const selectedMembers = teamMembers
                    .filter(memberId => selectedEmployeeIds.includes(memberId))
                    .map(memberId => {
                        const emp = allEmployees.find(e => e.value === memberId);
                        return emp ? emp.label : 'Unknown';
                    });
                
                if (selectedMembers.length === 1) {
                    label = `${label} (${selectedMembers[0]} already selected)`;
                } else if (selectedMembers.length > 0) {
                    label = `${label} (${selectedMemberCount} members already selected)`;
                }
            }
            
            return {
                value: teamId,
                label: label,
                members: team.members,
                isDisabled: !hasPermission || hasSelectedMember,
                hasPermission // Add this property to help with filtering
            };
        });
        
        // Filter teams to show only those with appropriate permissions for the selected target type
        // Ensure we're strictly filtering based on target type
        const filteredTeams = allTeamsWithStatus.filter(team => {
            if (targetType === 'sales') {
                // For sales targets, only include teams with sales permission
                return teamPermissionsMap[team.value]?.hasSales === true;
            } else if (targetType === 'order') {
                // For order targets, only include teams with orders permission
                return teamPermissionsMap[team.value]?.hasOrders === true;
            }
            return false;
        });
        
        console.log(`Total teams: ${teams.length}, Filtered teams: ${filteredTeams.length}`);
        
        setFilteredOptions({
            employees: filteredEmployees,
            teams: filteredTeams
        });
    };
    
    // Watch for changes in target type and selected options to update the dropdown options
    useEffect(() => {
        if (allEmployees.length > 0 && Object.keys(teamPermissionsMap).length > 0) {
            updateFilteredOptions(teamOptions, watch('targetType'), watch('assignedTo'));
        }
    }, [watch('targetType'), JSON.stringify(watch('assignedTo')), teamPermissionsMap, allEmployees]);

    // Handle delete target
    const handleDeleteClick = async (id) => {
        if (window.confirm('Are you sure you want to delete this target?')) {
            setLoading(true);
            try {
                const success = await deleteTarget(id);
                if (success) {
                    toast.success('Target deleted successfully');
                    fetchTargetData();
                } else {
                    toast.error('Failed to delete target');
                }
            } catch (error) {
                toast.error('Error occurred while deleting target');
            }
            setLoading(false);
        }
    };

    // Open modal for add/edit
    const handleAddClick = () => {
        reset();
        setEditMode(false);
        setModalOpen(true);
    };

    // Open modal for edit
    const handleEditClick = (target) => {
        setEditMode(true);
        setEditTargetId(target._id);
        
        // Convert display format of target type back to value format
        const targetTypeValue = target.targetType === 'Sales' ? 'sales' : 'order';
        setValue('targetType', targetTypeValue);
        setValue('targetAmount', target.targetAmount);
        setValue('targetQty', target.targetQty);
        
        // Convert month name back to number if needed
        let monthValue = target.month;
        if (isNaN(parseInt(monthValue))) {
            // If it's a month name, find its number
            const monthOption = monthOptions.find(opt => opt.label === monthValue);
            monthValue = monthOption ? monthOption.value : new Date().getMonth() + 1;
        }
        setValue('month', monthValue);
        
        // Ensure year is a number
        setValue('year', parseInt(target.year) || new Date().getFullYear());
        
        // For edit mode, we just populate a single item since editing multiple at once isn't supported
        const assigneeOption = target.assignedToModel === 'User'
            ? employeeOptions.find((emp) => emp.value === target.assignedTo)
            : teamOptions.find((team) => team.value === target.assignedTo);
            
        setValue('assignedTo', assigneeOption ? [assigneeOption] : []);
        
        setModalOpen(true);
    };

    // Validate selections to prevent duplicate assignments
    const validateSelections = (selections) => {
        if (!selections || selections.length === 0) return true;
        
        // Extract selection types based on which list they came from
        const hasEmployees = selections.some(item => employeeOptions.some(emp => emp.value === item.value));
        const hasTeams = selections.some(item => teamOptions.some(team => team.value === item.value));
        
        const selectedTeamIds = selections
            .filter(option => teamOptions.some(team => team.value === option.value))
            .map(option => option.value);
            
        const selectedEmployeeIds = selections
            .filter(option => employeeOptions.some(emp => emp.value === option.value))
            .map(option => option.value);
        
        // Get all member IDs from selected teams
        const selectedTeamMemberIds = selectedTeamIds.reduce((acc, teamId) => {
            return [...acc, ...(teamMembersMap[teamId] || [])];
        }, []);
        
        // Check for employees selected both individually and as part of teams
        const duplicateEmployees = [];
        for (const empId of selectedEmployeeIds) {
            if (selectedTeamMemberIds.includes(empId)) {
                // Find employee name and team name for error message
                const emp = allEmployees.find(e => e.value === empId);
                let teamName = '';
                for (const teamId of selectedTeamIds) {
                    if ((teamMembersMap[teamId] || []).includes(empId)) {
                        const team = teamOptions.find(t => t.value === teamId);
                        teamName = team ? team.label : 'selected team';
                        break;
                    }
                }
                duplicateEmployees.push({ name: emp ? emp.label : 'Employee', teamName });
            }
        }
        
        if (duplicateEmployees.length > 0) {
            const errorMessages = duplicateEmployees.map(({ name, teamName }) => 
                `${name} is already present in ${teamName}`
            );
            setValidationError(errorMessages.join(', '));
            return false;
        }
        
        // Check team permissions if teams are selected
        if (hasTeams && watch('targetType')) {
            const targetType = watch('targetType');
            
            // Validate each team has appropriate permissions
            for (const selection of selections) {
                // Skip if it's not a team
                if (!teamOptions.some(team => team.value === selection.value)) continue;
                
                const teamPermissions = teamPermissionsMap[selection.value];
                
                console.log(`Validating team ${selection.label} permissions:`, teamPermissions);
                
                if (!teamPermissions) {
                    console.warn(`No permission data found for team: ${selection.label}`);
                    continue; // Skip if no permission data
                }
                
                if (targetType === 'sales' && !teamPermissions.hasSales) {
                    console.error(`Team "${selection.label}" lacks sales permissions`);
                    setValidationError(`Team "${selection.label}" cannot be assigned sales targets because none of its members have sales permissions`);
                    return false;
                }
                
                if (targetType === 'order' && !teamPermissions.hasOrders) {
                    console.error(`Team "${selection.label}" lacks order permissions`);
                    setValidationError(`Team "${selection.label}" cannot be assigned order targets because none of its members have order permissions`);
                    return false;
                }
            }
        }
        
        // All validation passed
        setValidationError('');
        return true;
    };

    // Controlled handling of Select onChange to apply validation
    const handleAssignedToChange = (selectedOptions) => {
        // Reset validation error when selections change
        setValidationError('');
        
        // Update the form value with proper validation trigger
        setValue('assignedTo', selectedOptions || [], { 
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true
        });
        
        // Update filtered options based on new selections
        updateFilteredOptions(teamOptions, watch('targetType'), selectedOptions);
        
        // Validate the new selections
        validateSelections(selectedOptions);
    };

    const onSubmit = async (formData) => {
        setLoading(true);
        try {
            console.log("Submitting form data:", formData);
            
            if (isNaN(formData.targetAmount) || formData.targetAmount === undefined) {
                toast.error('Please enter a valid number for Target Amount');
                setLoading(false);
                return;
            }

            if (isNaN(formData.targetQty) || formData.targetQty === undefined) {
                toast.error('Please enter a valid number for Target Quantity');
                setLoading(false);
                return;
            }

            if (isNaN(formData.year) || formData.year === undefined) {
                toast.error('Please enter a valid year');
                setLoading(false);
                return;
            }
            
            // Validate selections
            if (!validateSelections(formData.assignedTo)) {
                setLoading(false);
                return;
            }
            
            // Get the original target amounts
            const originalTargetAmount = parseFloat(formData.targetAmount);
            const originalTargetQty = parseFloat(formData.targetQty);
            
            // Process each selected assignee
            const promises = [];
            
            // Split selections into teams and employees
            const selectedTeams = formData.assignedTo.filter(option => 
                teamOptions.some(team => team.value === option.value)
            );
            
            const selectedEmployees = formData.assignedTo.filter(option => 
                employeeOptions.some(emp => emp.value === option.value)
            );
            
            // Track all employees who will receive targets to prevent duplicates
            const employeesReceivingTargets = new Set();
            
            // Add individually selected employees to our tracking set first
            selectedEmployees.forEach(employee => employeesReceivingTargets.add(employee.value));
            
            // Get team members who are not individually selected
            let teamMembersToReceiveTargets = [];
            
            for (const team of selectedTeams) {
                const teamId = team.value;
                const teamMembers = teamMembersMap[teamId] || [];
                
                // For each team, get the eligible members based on target type
                const targetType = formData.targetType;
                const eligibleMembers = allEmployees.filter(emp => {
                    // Member must be in this team
                    if (!teamMembers.includes(emp.value)) return false;
                    
                    // Member must have required permission
                    const hasPermission = 
                        (targetType === 'sales' && (emp.permissions === 'Sales' || emp.permissions === 'Sales & Orders' || emp.permissions === 'All Permissions')) ||
                        (targetType === 'order' && (emp.permissions === 'Orders' || emp.permissions === 'Sales & Orders' || emp.permissions === 'All Permissions'));
                    
                    return hasPermission;
                });
                
                // Add team members who are not individually selected and haven't been added from other teams
                const nonSelectedMembers = eligibleMembers.filter(member => 
                    !employeesReceivingTargets.has(member.value) // Prevent duplicates
                );
                
                // Add these members to our tracking set
                nonSelectedMembers.forEach(member => employeesReceivingTargets.add(member.value));
                
                teamMembersToReceiveTargets = [
                    ...teamMembersToReceiveTargets,
                    ...nonSelectedMembers
                ];
            }
            
            // Calculate total recipients
            const totalRecipients = employeesReceivingTargets.size;
            
            if (totalRecipients === 0) {
                toast.error('No eligible employees found with the required permissions');
                setLoading(false);
                return;
            }
            
            // Calculate individual target amounts - only divide the amount, not the quantity
            const individualTargetAmount = parseFloat((originalTargetAmount / totalRecipients).toFixed(2));
            // Use the original quantity for each person (don't divide it)
            const individualTargetQty = originalTargetQty;
            
            // Create a single array of all unique employees to receive targets
            const allTargetRecipients = [...teamMembersToReceiveTargets];
            
            // Add individually selected employees who haven't been added from teams
            for (const employee of selectedEmployees) {
                // Skip if this employee is already in our list (from a team)
                if (!allTargetRecipients.some(member => member.value === employee.value)) {
                    allTargetRecipients.push(employee);
                }
            }
            
            console.log(`Creating targets for ${allTargetRecipients.length} unique employees`);
            
            // Create targets for all unique recipients
            for (const recipient of allTargetRecipients) {
                const targetPayload = {
                    assignedTo: recipient.value,
                    assignedToModel: 'User',
                    targetType: formData.targetType,
                    targetAmount: individualTargetAmount,
                    targetQty: individualTargetQty, // Same quantity for everyone
                    month: parseInt(formData.month, 10),
                    year: parseInt(formData.year, 10),
                    createdBy: localStorage.getItem('employeeId'),
                    createdFor: recipient.value, // The specific employee this target is for
                    originalTotal: originalTargetAmount,
                    membersCount: totalRecipients
                };
                
                if (isEditMode && editTargetId && recipient.value === formData.assignedTo[0]?.value) {
                    // In edit mode, we only update the original target
                    promises.push(updateTarget(editTargetId, targetPayload));
                } else if (!isEditMode) {
                    // In add mode, create new targets for all recipients
                    promises.push(addTarget(targetPayload));
                }
            }
            
            // Wait for all target creations to complete
            await Promise.all(promises);
            
            if (isEditMode) {
                toast.success('Target updated successfully');
            } else {
                toast.success(`Targets added successfully. Amount divided equally among ${totalRecipients} employees, same quantity for everyone.`);
            }
    
            fetchTargetData();
            setModalOpen(false);
        } catch (error) {
            console.error('Target submission error:', error);
            toast.error('Error occurred while saving targets. Please check all field values.');
        }
        setLoading(false);
    };

    return (
        <div className="p-8 bg-background min-h-screen">
            <ToastContainer />

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
                        <Loader className="animate-spin text-primary" size={50} />
                    </div>
                )}

                <DataTable
                    columns={columns}
                    data={targetData}
                    title="Targets"
                    onAddClick={handleAddClick}
                />
            </motion.div>

            {/* Modal for Add/Edit Target */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
                title={isEditMode ? 'Edit Target' : 'Add New Target'}
            >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Target Type</label>
                        <Select
                            options={targetTypeOptions}
                            onChange={(option) => {
                                setValue('targetType', option ? option.value : '');
                                // Reset assignedTo when target type changes
                                setValue('assignedTo', []);
                                // Clear any validation errors
                                setValidationError('');
                                // Update filtered options with the new target type
                                if (option) {
                                    updateFilteredOptions(teamOptions, option.value, []);
                                }
                            }}
                            value={targetTypeOptions.find(option => option.value === watch('targetType')) || null}
                            placeholder="Select a Target Type"
                            className="mt-1"
                            isClearable
                        />
                        {errors.targetType && <p className="text-red-500 text-xs mt-1">{errors.targetType.message}</p>}
                    </div>

                    <div className="mb-3">
                        <input
                            type="number"
                            placeholder="Target Amount"
                            {...register('targetAmount', { 
                                setValueAs: value => value === "" ? undefined : parseFloat(value)
                            })}
                            className={`w-full p-2 border rounded-xl ${errors.targetAmount ? 'border-red-300' : 'border-gray-300'}`}
                            min="1"
                            step="any"
                        />
                        {errors.targetAmount && <p className="text-red-500 text-xs mt-1">{errors.targetAmount.message}</p>}
                    </div>
                    
                    <div className="mb-3">
                        <input
                            type="number"
                            placeholder="Target Quantity"
                            {...register('targetQty', { 
                                setValueAs: value => value === "" ? undefined : parseFloat(value)
                            })}
                            className={`w-full p-2 border rounded-xl ${errors.targetQty ? 'border-red-300' : 'border-gray-300'}`}
                            min="1"
                            step="any"
                        />
                        {errors.targetQty && <p className="text-red-500 text-xs mt-1">{errors.targetQty.message}</p>}
                    </div>
                    
                    <div className="flex gap-4 mb-3">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                            <Select
                                options={monthOptions}
                                value={monthOptions.find(option => option.value === watch('month'))}
                                onChange={(option) => setValue('month', option.value)}
                                placeholder="Select Month"
                                className="w-full"
                            />
                            {errors.month && <p className="text-red-500 text-xs mt-1">{errors.month.message}</p>}
                        </div>
                        
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                            <input
                                type="number"
                                placeholder="Year"
                                {...register('year', { 
                                    setValueAs: value => value === "" ? undefined : parseInt(value, 10)
                                })}
                                className={`w-full p-2 border rounded-xl ${errors.year ? 'border-red-300' : 'border-gray-300'}`}
                                min="2000"
                            />
                            {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year.message}</p>}
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between items-center">
                            Assign To
                            <span className="relative group">
                                <Info size={16} className="text-gray-400 hover:text-primary cursor-pointer" />
                                <div className="hidden group-hover:block absolute bottom-6 right-0 transform w-60 z-10">
                                    <div className="relative bg-gray-100 shadow-lg rounded p-2 border border-gray-200">
                                        <span className="text-xs text-gray-700">
                                            You can select multiple employees or teams with the same permission type.
                                        </span>
                                        {/* Arrow pointing down to the icon */}
                                        <div className="absolute -bottom-2 right-1.5 w-4 h-4 bg-gray-100 border-r border-b border-gray-200 transform rotate-45"></div>
                                    </div>
                                </div>
                            </span>
                        </label>
                        <Select
                            options={[
                                { label: 'Employees', options: filteredOptions.employees || employeeOptions },
                                { label: 'Teams', options: filteredOptions.teams || teamOptions },
                            ]}
                            placeholder="Select Employees or Teams"
                            value={watch('assignedTo') || []}
                            onChange={handleAssignedToChange}
                            className="mb-1"
                            isClearable
                            isMulti={true}
                        />
                        {errors.assignedTo && <p className="text-red-500 text-xs">{errors.assignedTo.message}</p>}
                        {validationError && <p className="text-red-500 text-xs mt-1">{validationError}</p>}
                        {!isEditMode && 
                          ((watch('assignedTo')?.length > 1) || 
                          (watch('assignedTo')?.some(item => teamOptions.some(team => team.value === item.value)))) && 
                          !(watch('assignedTo')?.some(item => teamOptions.some(team => team.value === item.value)) && 
                            watch('assignedTo')?.some(item => employeeOptions.some(emp => emp.value === item.value))) && 
                          <p className="text-xs text-blue-500 mt-1">Target amount will be divided equally among all eligible employees with same permissions. Target quantity will be the same for everyone.</p>}
                        {!isEditMode && watch('assignedTo')?.some(item => teamOptions.some(team => team.value === item.value)) && 
                         watch('assignedTo')?.some(item => employeeOptions.some(emp => emp.value === item.value)) && 
                         <p className="text-xs text-amber-500 mt-1">You have selected both teams and individual employees. The target amount will be divided equally, but quantity will stay the same for everyone.</p>}
                        {isEditMode && <p className="text-xs text-gray-500 mt-1">When editing, changes will apply to this specific target only.</p>}
                    </div>

                    <Button type="submit" className="w-full bg-accent" disabled={loading}>
                        {loading ? 'Saving...' : 'Submit'}
                    </Button>
                </form>
            </Modal>
        </div>
    );
};

export default TargetManagement;