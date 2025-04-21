import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Loader, Mail, Key, User, Users } from 'lucide-react';
import { fadeIn, slideUp } from '@/utils/motionVariants';
import { getTeamMembersForCurrentUser } from '@/services/apiService';
import DataTable from '@/components/ui/DataTable';
import Card from '@/components/ui/card';

const TeamMembersManagement = () => {
    const [loading, setLoading] = useState(false);
    const [teamMembers, setTeamMembers] = useState([]);

    useEffect(() => {
        fetchTeamMembers();
    }, []);

    // Fetch Team Members
    const fetchTeamMembers = async () => {
        try {
            setLoading(true);
            const data = await getTeamMembersForCurrentUser();
            console.log("Team members data:", data);
            
            if (Array.isArray(data) && data.length > 0) {
                // Format data for display
                const formattedData = data.map(member => ({
                    id: member._id,
                    name: member.name || 'N/A',
                    email: member.email || 'N/A',
                    permissions: member.permissions || 'N/A',
                    role: member.role || 'Employee',
                    // Add avatar preview if available
                    avatar: member.avatar || null,
                }));
                
                setTeamMembers(formattedData);
            } else {
                // Don't show toast notification when no members found
                console.log('No team members found for this team manager');
                setTeamMembers([]);
            }
        } catch (error) {
            console.error('Error fetching team members:', error);
            toast.error('Failed to load team members');
            setTeamMembers([]);
        } finally {
            setLoading(false);
        }
    };

    // Table columns
    const columns = [
        { 
            header: 'Name', 
            accessor: 'name',
            cell: (row) => (
                <div className="flex items-center gap-2">
                    {row.avatar ? (
                        <img src={row.avatar} alt={row.name} className="w-8 h-8 rounded-full" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <User size={14} />
                        </div>
                    )}
                    <span>{row.name}</span>
                </div>
            )
        },
        { 
            header: 'Email', 
            accessor: 'email',
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-500" />
                    <span>{row.email}</span>
                </div>
            )
        },
        { 
            header: 'Permissions', 
            accessor: 'permissions',
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <Key size={14} className="text-gray-500" />
                    <span className={`px-2 py-1 rounded text-xs ${
                        row.permissions === 'Sales' ? 'bg-blue-100 text-blue-800' :
                        row.permissions === 'Orders' ? 'bg-green-100 text-green-800' :
                        row.permissions === 'Sales & Orders' ? 'bg-purple-100 text-purple-800' :
                        row.permissions === 'All Permissions' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                    }`}>
                        {row.permissions}
                    </span>
                </div>
            )
        },
        { 
            header: 'Role', 
            accessor: 'role',
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <User size={14} className="text-gray-500" />
                    <span className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs">
                        {row.role}
                    </span>
                </div>
            )
        }
    ];

    return (
        <motion.div initial="hidden" animate="visible" className="p-8 bg-background min-h-screen">
            <ToastContainer />

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
                    <Loader className="animate-spin text-primary" size={50} />
                </div>
            )}

            <motion.div variants={fadeIn} className="mb-8">
                <h1 className="text-2xl font-bold text-primary mb-2">My Team</h1>
                <p className="text-gray-600">Manage your team members and view their information</p>
            </motion.div>

            <motion.div variants={slideUp} className="mb-8">
                <Card>
                    <div className="p-4">
                        <h2 className="text-xl font-semibold mb-4">Team Overview</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 rounded-lg p-4">
                                <p className="text-sm text-blue-600 mb-1">Total Members</p>
                                <p className="text-2xl font-bold">{teamMembers.length}</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4">
                                <p className="text-sm text-green-600 mb-1">Sales Members</p>
                                <p className="text-2xl font-bold">
                                    {teamMembers.filter(member => 
                                        member.permissions === 'Sales' || 
                                        member.permissions === 'Sales & Orders' || 
                                        member.permissions === 'All Permissions'
                                    ).length}
                                </p>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-4">
                                <p className="text-sm text-amber-600 mb-1">Orders Members</p>
                                <p className="text-2xl font-bold">
                                    {teamMembers.filter(member => 
                                        member.permissions === 'Orders' || 
                                        member.permissions === 'Sales & Orders' || 
                                        member.permissions === 'All Permissions'
                                    ).length}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            </motion.div>

            <motion.div variants={slideUp}>
                {teamMembers.length > 0 ? (
                    <DataTable
                        columns={columns}
                        data={teamMembers}
                        title="Team Members"
                        pagination={true}
                        searchable={true}
                    />
                ) : (
                    <Card className="text-center py-12">
                        <div className="flex flex-col items-center">
                            <Users size={48} className="text-gray-300 mb-4" />
                            <h3 className="text-xl font-medium text-gray-800 mb-2">No Team Members Found</h3>
                            <p className="text-gray-500 max-w-md mx-auto">
                                Your team doesn't have any members assigned yet. Contact an administrator to assign team members to your team.
                            </p>
                        </div>
                    </Card>
                )}
            </motion.div>
        </motion.div>
    );
};

export default TeamMembersManagement; 