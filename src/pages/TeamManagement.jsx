// src/pages/TeamManagement.js
import React, { useState, useEffect } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { getAllTeams, addTeam, updateTeam, deleteTeam } from '@/services/teamService';
import { getEmployees, getTeamManagers, getUserById, getUserProfile } from '@/services/apiService';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Select from 'react-select';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Edit, Trash2, Info, AlertCircle } from 'lucide-react';

// Validation Schema
const schema = yup.object().shape({
    teamName: yup.string().required('Team name is required'),
    members: yup.array().min(1, 'At least one member is required'),
    teamManager: yup.object().nullable(),
});

const columns = [
    { header: 'Team Name', accessor: 'teamName' },
    { header: 'Team Manager', accessor: 'teamManager' },
    { header: 'Members', accessor: 'members' },
    { 
        header: 'Created By', 
        accessor: 'createdBy',
        render: (row) => {
            const createdBy = row.createdBy;
            if (!createdBy) return 'Unknown';
            
            if (typeof createdBy === 'object') {
                return createdBy.name || createdBy.username || createdBy.email || 'Unknown User';
            }
            
            return createdBy;
        }
    },
    { header: 'Actions', accessor: 'actions' }
]; 
// Permission color mapping
const permissionColors = {
    'Sales': '#04b87f',
    'Orders': '#b80404',
    'Sales & Orders': '#d46b02',
    'All Permissions': '#333333'
};

// Custom styles for react-select
const customSelectStyles = {
    option: (provided, state) => {
        return {
            ...provided,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px'
        };
    }
};

// Custom option component for the dropdown
const CustomOption = ({ innerProps, label, data }) => (
    <div {...innerProps} className="flex justify-between items-center px-3 py-2 hover:bg-gray-100 cursor-pointer">
        <div>{label}</div>
        {data.permissions && (
            <div 
                className="text-xs ml-2 italic" 
                style={{ color: permissionColors[data.permissions] || '#888888' }}
            >
                {data.permissions === 'Sales & Orders' ? 'Both' : data.permissions}
            </div>
        )}
    </div>
);

const TeamManagement = () => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [teamData, setTeamData] = useState([]);
    const [employeeOptions, setEmployeeOptions] = useState([]);
    const [teamManagerOptions, setTeamManagerOptions] = useState([]);
    const [selectedPermissionType, setSelectedPermissionType] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isEditMode, setEditMode] = useState(false);
    const [editTeamId, setEditTeamId] = useState(null);
    const [managerTooltipVisible, setManagerTooltipVisible] = useState(false);
    const [membersTooltipVisible, setMembersTooltipVisible] = useState(false);
    const [permissionError, setPermissionError] = useState('');
    const [managerPermissionError, setManagerPermissionError] = useState('');
    const [creatorNames, setCreatorNames] = useState({});

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(schema),
    });

    // Watch selected members to validate permissions
    const selectedMembers = watch('members') || [];

    // Watch the selected team manager
    const selectedManager = watch('teamManager');

    // Validate selected members have the same permissions
    useEffect(() => {
        if (selectedMembers && selectedMembers.length > 1) {
            const firstMember = selectedMembers[0];
            const firstPermission = firstMember?.permissions;
            
            // Early return if no permission on first member
            if (!firstPermission) {
                setPermissionError('');
                return;
            }
            
            // Check if team is compatible
            const isValid = selectedMembers.every(member => {
                // If first team member has Sales permission
                if (firstPermission === 'Sales') {
                    // Allow members with Sales or Sales & Orders permissions
                    return member.permissions === 'Sales' || member.permissions === 'Sales & Orders';
                }
                // If first team member has Orders permission
                else if (firstPermission === 'Orders') {
                    // Allow members with Orders or Sales & Orders permissions
                    return member.permissions === 'Orders' || member.permissions === 'Sales & Orders';
                }
                // If first team member has Sales & Orders permission
                else if (firstPermission === 'Sales & Orders') {
                    // Allow members with any of the three permission types
                    return member.permissions === 'Sales' || 
                           member.permissions === 'Orders' || 
                           member.permissions === 'Sales & Orders';
                }
                // For any other case, require exact permission match
                else {
                    return member.permissions === firstPermission;
                }
            });
            
            if (!isValid) {
                setPermissionError('You can\'t add employees with incompatible permissions to the same team');
            } else {
                setPermissionError('');
            }
        } else {
            setPermissionError('');
        }
    }, [selectedMembers]);

    // Validate team manager and member permissions compatibility
    useEffect(() => {
        if (selectedManager && selectedMembers.length > 0) {
            const managerPermission = selectedManager.permissions;
            
            // Check compatibility between manager and team members
            const isValid = selectedMembers.every(member => {
                if (managerPermission === 'Sales') {
                    // Sales manager can manage Sales and Sales & Orders team members
                    return member.permissions === 'Sales' || member.permissions === 'Sales & Orders';
                } else if (managerPermission === 'Orders') {
                    // Orders manager can manage Orders and Sales & Orders team members
                    return member.permissions === 'Orders' || member.permissions === 'Sales & Orders';
                } else if (managerPermission === 'Sales & Orders') {
                    // Manager with both permissions can manage any team members
                    return true;
                }
                return false;
            });
            
            if (!isValid) {
                setManagerPermissionError(`Team manager with "${managerPermission}" permission cannot manage team members with incompatible permissions`);
            } else {
                setManagerPermissionError('');
            }
        } else {
            setManagerPermissionError('');
        }
    }, [selectedManager, selectedMembers]);

    useEffect(() => {
        fetchTeamData();
        fetchEmployeeData();
    }, []);

    // Fetch Team Data from API
    const fetchTeamData = async () => {
        setLoading(true);
        try {
            const data = await getAllTeams();
            console.log("Raw team data:", data);
            
            // Fetch creator names for all teams
            fetchCreatorNames(data);

            setTeamData(
                data.map((team) => {
                    // Debug the createdBy information
                    console.log(`Team ${team.teamName} createdBy:`, team.createdBy);
                    
                    // Extract creator ID
                    let creatorId = null;
                    let creatorName = 'Unknown';
                    
                    if (team.createdBy) {
                        if (typeof team.createdBy === 'object') {
                            creatorId = team.createdBy._id || team.createdBy.id;
                            
                            // Explicitly check for Admin role
                            if (team.createdBy.role === 'Admin') {
                                creatorName = 'Admin';
                            } else {
                                creatorName = team.createdBy.name || team.createdBy.username || 'Unknown User';
                            }
                        } else if (typeof team.createdBy === 'string') {
                            creatorId = team.createdBy;
                            creatorName = 'Unknown'; // Will be updated by the render function if available
                        }
                    }
                    
                    return {
                        ...team,
                        members: team.members
                            ?.filter((m) => m && m.name) // Filter out undefined or invalid members
                            .map((m) => m.name) // Map to member names
                            .join(', '),
                        teamManager: team.teamManager?.name ?? 'Not Assigned',
                        // Reference creatorId for use in the column render function
                        creatorId: creatorId,
                        // Handle all possible formats of createdBy
                        createdBy: creatorName,
                        actions: (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEditClick(team)}
                                    className="p-1 text-blue-500 hover:text-blue-700"
                                    title="Edit"
                                >
                                    <Edit size={16} />
                                </button>
                                <button
                                    onClick={() => handleDeleteClick(team._id)}
                                    className="p-1 text-red-500 hover:text-red-700"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ),
                    };
                })
            );
        } catch (error) {
            toast.error('Failed to fetch team data');
            console.error('Team data fetch error:', error);
        }
        setLoading(false);
    };

    // Fetch Employee Data
    const fetchEmployeeData = async () => {
        try {
            const data = await getEmployees();
            
            // Set employee options for team members (regular employees)
            setEmployeeOptions(
                data.filter(emp => emp.role === 'Employee')
                .map((emp) => ({ 
                    value: emp._id, 
                    label: emp.name,
                    permissions: emp.permissions 
                }))
            );
            
            // Set team manager options (only users with Team Manager role)
            setTeamManagerOptions(
                data.filter(emp => emp.role === 'Team Manager')
                .map((emp) => ({ 
                    value: emp._id, 
                    label: emp.name,
                    permissions: emp.permissions 
                }))
            );
        } catch (error) {
            toast.error('Failed to fetch employee data');
        }
    };

    // Function to handle team deletion
    const handleDeleteClick = async (id) => {
        if (window.confirm('Are you sure you want to delete this team?')) {
            setLoading(true);
            try {
                const success = await deleteTeam(id);
                if (success) {
                    toast.success('Team deleted successfully');
                    fetchTeamData(); // Refresh the data after deletion
                } else {
                    toast.error('Failed to delete team');
                }
            } catch (error) {
                console.error('Failed to delete team:', error.message);
                toast.error('An error occurred while deleting the team');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleAddClick = () => {
        reset();
        setPermissionError('');
        setManagerPermissionError('');
        setEditMode(false);
        setModalOpen(true);
    };

    const handleEditClick = (team) => {
        setEditMode(true);
        setPermissionError('');
        setManagerPermissionError('');
        setEditTeamId(team._id);
        setValue('teamName', team.teamName);
        
        // Get full employee objects to include permissions
        const teamMembers = team.members?.map(member => {
            const emp = employeeOptions.find(e => e.value === member._id);
            return emp || { value: member._id, label: member.name, permissions: member.permissions };
        }) || [];
        
        setValue('members', teamMembers);
        
        // Set team manager if it exists
        if (team.teamManager) {
            const manager = { 
                value: team.teamManager._id, 
                label: team.teamManager.name,
                permissions: team.teamManager.permissions 
            };
            setValue('teamManager', manager);
            
            // If there's both a manager and members, validate compatibility immediately after setting values
            if (teamMembers.length > 0 && manager.permissions) {
                const managerPermission = manager.permissions;
                
                // Check if any team members have incompatible permissions with the manager
                const hasIncompatibleMembers = teamMembers.some(member => {
                    if (managerPermission === 'Sales') {
                        return member.permissions !== 'Sales';
                    } else if (managerPermission === 'Orders') {
                        return member.permissions !== 'Orders';
                    }
                    return false; // Manager with Sales & Orders can manage any members
                });
                
                if (hasIncompatibleMembers) {
                    setManagerPermissionError(`Team manager with "${managerPermission}" permission cannot manage some team members due to incompatible permissions`);
                }
            }
        } else {
            setValue('teamManager', null);
        }
        
        setModalOpen(true);
    };

    // Function to filter team managers based on team's permission focus
    const getFilteredTeamManagers = () => {
        if (!selectedPermissionType || !teamManagerOptions.length) return teamManagerOptions;
        
        return teamManagerOptions.filter(manager => {
            if (selectedPermissionType === 'Sales') {
                // Show managers with Sales or Sales & Orders permissions
                return manager.permissions === 'Sales' || manager.permissions === 'Sales & Orders';
            } else if (selectedPermissionType === 'Orders') {
                // Show managers with Orders or Sales & Orders permissions
                return manager.permissions === 'Orders' || manager.permissions === 'Sales & Orders';
            } else if (selectedPermissionType === 'Sales & Orders') {
                // For Sales & Orders, show all managers with either Sales, Orders, or both
                return manager.permissions === 'Sales' || 
                       manager.permissions === 'Orders' || 
                       manager.permissions === 'Sales & Orders';
            }
            return true;
        });
    };
    
    // Determine the permission type of the team based on selected members
    useEffect(() => {
        if (selectedMembers && selectedMembers.length > 0) {
            const firstMember = selectedMembers[0];
            setSelectedPermissionType(firstMember?.permissions || null);
        } else {
            setSelectedPermissionType(null);
        }
    }, [selectedMembers]);

    // Get filtered employee options based on selected manager permissions
    const getFilteredEmployeeOptions = () => {
        if (!selectedManager || !employeeOptions.length) return employeeOptions;
        
        return employeeOptions.filter(emp => {
            if (selectedManager.permissions === 'Sales') {
                // Sales manager can only manage sales team members
                return emp.permissions === 'Sales' || emp.permissions === 'Sales & Orders';
            } else if (selectedManager.permissions === 'Orders') {
                // Orders manager can only manage orders team members
                return emp.permissions === 'Orders' || emp.permissions === 'Sales & Orders';
            } else if (selectedManager.permissions === 'Sales & Orders') {
                // Manager with both permissions can manage any team members
                return true;
            }
            return false;
        });
    };

    const onSubmit = async (formData) => {
        // Check for permission errors before submission
        if (permissionError || managerPermissionError) {
            toast.error(permissionError || managerPermissionError);
            return;
        }
        
        setLoading(true);
        try {
            const payload = {
                ...formData,
                members: formData.members?.map((m) => m.value) ?? [], // Ensure members is an array of IDs
                teamManager: formData.teamManager?.value || null, // Get team manager ID if exists
                targetAmount: 0 // Add default targetAmount since it's required by the backend model
            };
            
            console.log("Sending team payload:", payload);

            if (isEditMode) {
                await updateTeam(editTeamId, payload);
                toast.success('Team updated successfully');
            } else {
                await addTeam(payload);
                toast.success('Team added successfully');
            }

            fetchTeamData();
        } catch (error) {
            console.error("Team creation error:", error);
            console.error("Error details:", error.response?.data);
            toast.error(error.response?.data?.msg || 'Error occurred while saving team');
        } finally {
            setLoading(false);
            setModalOpen(false);
        }
    };

    // Fetch creator names based on IDs
    const fetchCreatorNames = async (teams) => {
        if (!Array.isArray(teams)) return;
        
        // First, get the current user profile to determine if the current user is an admin
        try {
            const currentUser = await getUserProfile();
            console.log("Current user profile:", currentUser);
            
            if (currentUser && currentUser.role === 'Admin') {
                // Store the admin's information for reference
                const adminId = currentUser._id || currentUser.id;
                if (adminId) {
                    setCreatorNames(prev => ({
                        ...prev,
                        [adminId]: 'Admin'
                    }));
                    console.log("Added Admin to creator names cache:", adminId);
                }
            }
        } catch (error) {
            console.error("Error fetching current user profile:", error);
        }
        
        const creatorIds = teams
            .map(team => {
                // Handle if createdBy is an object or a string ID
                if (team.createdBy && typeof team.createdBy === 'object') {
                    return team.createdBy._id || team.createdBy.id;
                } else if (typeof team.createdBy === 'string') {
                    return team.createdBy;
                }
                return null;
            })
            .filter(id => id && id !== 'unknown');
        
        // Remove duplicates
        const uniqueIds = [...new Set(creatorIds)];
        
        console.log("Creator IDs to fetch:", uniqueIds);
        
        // Create a map of ID -> name
        const namesMap = { ...creatorNames };
        
        // Fetch user details for each ID
        for (const id of uniqueIds) {
            if (namesMap[id]) continue; // Skip if we already have the name
            
            try {
                const user = await getUserById(id);
                if (user) {
                    // If the user is an Admin, explicitly label as "Admin"
                    if (user.role === 'Admin') {
                        namesMap[id] = 'Admin';
                    } else {
                        namesMap[id] = user.name || user.username || 'Unknown User';
                    }
                    console.log(`Found user name for ID ${id}: ${namesMap[id]}`);
                }
            } catch (error) {
                console.error(`Failed to fetch user details for ID: ${id}`, error);
            }
        }
        
        setCreatorNames(namesMap);
    };

    // Column definitions with custom render for createdBy
    const getColumns = () => [
        { header: 'Team Name', accessor: 'teamName' },
        { header: 'Team Manager', accessor: 'teamManager' },
        { header: 'Members', accessor: 'members' },
        { 
            header: 'Created By', 
            accessor: 'createdBy',
            render: (row) => {
                // If we have a cached name for this creator ID, use it
                if (row.creatorId && creatorNames[row.creatorId]) {
                    return creatorNames[row.creatorId];
                }
                
                const createdBy = row.createdBy;
                if (!createdBy) return 'Unknown';
                
                // Check if createdBy is an object
                if (typeof createdBy === 'object') {
                    // Explicitly check for Admin role
                    if (createdBy.role === 'Admin') {
                        return 'Admin';
                    }
                    return createdBy.name || createdBy.username || createdBy.email || 'Unknown User';
                }
                
                // Special case: if the creator ID is the current admin's ID
                // (This relies on the creatorNames cache being populated with admin info)
                const adminEntry = Object.entries(creatorNames).find(([_, name]) => name === 'Admin');
                if (adminEntry && adminEntry[0] === createdBy) {
                    return 'Admin';
                }
                
                // If createdBy is just an ID and we don't have a cached name yet
                if (typeof createdBy === 'string' && createdBy !== 'Unknown') {
                    // Try to fetch the name if it looks like an ID
                    if (createdBy.length > 10) {
                        return `User ${createdBy.substring(0, 8)}...`;
                    }
                }
                
                return createdBy;
            }
        },
        { header: 'Actions', accessor: 'actions' }
    ]; 

    return (
        <div className="p-8 bg-background min-h-screen">
            <ToastContainer />
            <DataTable
                columns={getColumns()} 
                data={teamData}
                title="Teams"
                onAddClick={handleAddClick}
            />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
                title={isEditMode ? "Edit Team" : "Add New Team"}
            >
                <form onSubmit={handleSubmit(onSubmit)}>
                    <input
                        type="text"
                        placeholder="Team Name"
                        {...register('teamName')}
                        className="w-full p-2 border rounded-xl mb-3"
                    />
                    {errors.teamName && <p className="text-red-500 text-xs mb-3">{errors.teamName.message}</p>}

                    {/* Team Manager Selection */}
                    <div className="mb-3">
                        <div className="flex items-center mb-2">
                            <label className="text-sm font-medium text-gray-700">Select Team Manager</label>
                            <div 
                                className="ml-2 cursor-pointer text-blue-500"
                                onMouseEnter={() => setManagerTooltipVisible(true)}
                                onMouseLeave={() => setManagerTooltipVisible(false)}
                            >
                                <Info size={16} />
                            </div>
                            {managerTooltipVisible && (
                                <div className="absolute z-10 bg-gray-800 text-white p-2 rounded shadow-lg text-xs max-w-xs right-0 top-0">
                                    Team manager permissions must be compatible with team members.
                                    <ul className="list-disc pl-4 mt-1">
                                        <li>Sales manager can manage both Sales team members and Sales & Orders team members</li>
                                        <li>Orders manager can manage both Orders team members and Sales & Orders team members</li>
                                        <li>Manager with both permissions can manage any team members</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                        
                        <Select
                            options={getFilteredTeamManagers()}
                            placeholder="Select Team Manager"
                            onChange={(selectedOption) => setValue('teamManager', selectedOption)}
                            className="mb-2"
                            isClearable
                            value={watch('teamManager')}
                            styles={customSelectStyles}
                            components={{
                                Option: CustomOption
                            }}
                        />
                        {selectedManager && (
                            <div className="text-xs text-gray-600 mb-2">
                                <span className="font-medium">Note:</span> {selectedManager.permissions === 'Sales' 
                                    ? 'Sales managers can manage both Sales team members and Sales & Orders team members.' 
                                    : selectedManager.permissions === 'Orders' 
                                        ? 'Orders managers can manage both Orders team members and Sales & Orders team members.' 
                                        : 'This manager can manage team members with any permissions.'}
                            </div>
                        )}
                        {errors.teamManager && <p className="text-red-500 text-xs mb-2">{errors.teamManager.message}</p>}
                    </div>

                    <div className="mb-3 relative">
                        <div className="flex items-center mb-2">
                            <label className="text-sm font-medium text-gray-700">Select Team Members</label>
                            <div 
                                className="ml-2 cursor-pointer text-blue-500"
                                onMouseEnter={() => setMembersTooltipVisible(true)}
                                onMouseLeave={() => setMembersTooltipVisible(false)}
                            >
                                <Info size={16} />
                            </div>
                            {membersTooltipVisible && (
                                <div className="absolute z-10 bg-gray-800 text-white p-2 rounded shadow-lg text-xs max-w-xs right-0 top-0">
                                    Team member permission compatibility rules:
                                    <ul className="list-disc pl-4 mt-1">
                                        <li>Teams with Sales members can include Sales & Orders members</li>
                                        <li>Teams with Orders members can include Sales & Orders members</li>
                                        <li>Teams with Sales & Orders members can include any member type</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                        
                        <Select
                            options={selectedManager ? getFilteredEmployeeOptions() : employeeOptions}
                            isMulti
                            placeholder="Select Members"
                            onChange={(selectedOptions) => setValue('members', selectedOptions)}
                            className="mb-2"
                            defaultValue={[]}
                            styles={customSelectStyles}
                            components={{
                                Option: CustomOption
                            }}
                        />
                        
                        {permissionError && (
                            <div className="flex items-center text-red-500 text-xs mb-2">
                                <AlertCircle size={14} className="mr-1" />
                                {permissionError}
                            </div>
                        )}
                        
                        {managerPermissionError && (
                            <div className="flex items-center text-red-500 text-xs mb-2">
                                <AlertCircle size={14} className="mr-1" />
                                {managerPermissionError}
                            </div>
                        )}
                        
                        {errors.members && <p className="text-red-500 text-xs mb-2">{errors.members.message}</p>}
                        
                        {/* Permission legend */}
                        <div className="flex flex-wrap gap-4 text-xs mt-2 mb-3">
                            <div className="flex items-center">
                                <span className="italic mr-1" style={{ color: permissionColors['Sales'] }}>Sales</span>
                            </div>
                            <div className="flex items-center">
                                <span className="italic mr-1" style={{ color: permissionColors['Orders'] }}>Orders</span>
                            </div>
                            <div className="flex items-center">
                                <span className="italic mr-1" style={{ color: permissionColors['Sales & Orders'] }}>Both</span>
                            </div>
                        </div>
                    </div>

                    <Button 
                        type="submit" 
                        className="w-full bg-accent" 
                        disabled={loading || !!permissionError || !!managerPermissionError}
                    >
                        {loading ? 'Saving...' : 'Submit'}
                    </Button>
                </form>
            </Modal>
        </div>
    );
};

export default TeamManagement;
