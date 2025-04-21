// src/pages/UserManagement.js
import React, { useState, useEffect } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { getAllUsers, addUser, updateUser, deleteUser } from '@/services/authService';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Select from 'react-select';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Edit, Trash2, Eye, EyeOff } from 'lucide-react';

// Create two schemas - one for add mode and one for edit mode
const addSchema = yup.object().shape({
    name: yup.string()
        .required('Name is required')
        .max(100, 'Name cannot be longer than 100 characters')
        .trim(),
    email: yup.string()
        .email('Please enter a valid email address')
        .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email must contain @ and a domain')
        .required('Email is required')
        .trim()
        .lowercase(),
    password: yup.string()
        .min(6, 'Password must be at least 6 characters')
        .required('Password is required'),
    role: yup.string()
        .required('Please select a user role')
        .oneOf(['Admin', 'Employee', 'Team Manager'], 'Invalid role selected'),
    permissions: yup.string()
        .when('role', {
            is: (val) => val === 'Employee' || val === 'Team Manager',
            then: () => 
                yup.string()
                    .required('Please select permissions')
                    .oneOf(['Sales', 'Orders', 'Sales & Orders'], 'Invalid permissions selected'),
            otherwise: () => yup.string().notRequired()
        })
});

// Edit schema makes password optional
const editSchema = yup.object().shape({
    name: yup.string()
        .required('Name is required')
        .max(100, 'Name cannot be longer than 100 characters')
        .trim(),
    email: yup.string()
        .email('Please enter a valid email address')
        .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email must contain @ and a domain')
        .required('Email is required')
        .trim()
        .lowercase(),
    password: yup.string()
        .min(6, 'Password must be at least 6 characters')
        .nullable()
        .transform(value => value === "" ? null : value),
    role: yup.string()
        .required('Please select a user role')
        .oneOf(['Admin', 'Employee', 'Team Manager'], 'Invalid role selected'),
    permissions: yup.string()
        .when('role', {
            is: (val) => val === 'Employee' || val === 'Team Manager',
            then: () => 
                yup.string()
                    .required('Please select permissions')
                    .oneOf(['Sales', 'Orders', 'Sales & Orders'], 'Invalid permissions selected'),
            otherwise: () => yup.string().notRequired()
        })
});

const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Role', accessor: 'role' },
    { header: 'Permissions', accessor: 'permissions' },
    { header: 'Actions', accessor: 'actions' },
];

const UserManagement = () => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [userData, setUserData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isEditMode, setEditMode] = useState(false);
    const [editUserId, setEditUserId] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    // Use different schema based on mode
    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
        watch
    } = useForm({
        resolver: yupResolver(isEditMode ? editSchema : addSchema),
    });

    // Update form validation when edit mode changes
    useEffect(() => {
        reset(); // Reset form when switching modes
    }, [isEditMode, reset]);

    useEffect(() => {
        fetchUserData();
    }, []);

    // **Fetch Users Data**
    const fetchUserData = async () => {
        setLoading(true);
        try {
            const data = await getAllUsers();
            setUserData(
                data.map((user) => ({
                    ...user,
                    // Show permissions for Employees and Team Managers, show "All Permissions" for Admin
                    permissions: user.role === 'Admin' ? 'All Permissions' : user.permissions,
                    actions: (
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleEditClick(user)}
                                className="p-1 text-blue-500 hover:text-blue-700"
                                title="Edit"
                            >
                                <Edit size={16} />
                            </button>
                            <button
                                onClick={() => handleDeleteClick(user._id)}
                                className="p-1 text-red-500 hover:text-red-700"
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ),
                }))
            );
        } catch (error) {
            toast.error('Failed to fetch user data');
        }
        setLoading(false);
    };

    // This function ensures we have fresh data when editing
    const refreshAndEditUser = async (userId) => {
        setLoading(true);
        try {
            const data = await getAllUsers();
            setUserData(
                data.map((user) => ({
                    ...user,
                    permissions: user.role === 'Admin' ? 'All Permissions' : user.permissions,
                    actions: (
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleEditClick(user)}
                                className="p-1 text-blue-500 hover:text-blue-700"
                                title="Edit"
                            >
                                <Edit size={16} />
                            </button>
                            <button
                                onClick={() => handleDeleteClick(user._id)}
                                className="p-1 text-red-500 hover:text-red-700"
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ),
                }))
            );
            
            // Find the user we want to edit in the updated data
            const userToEdit = data.find(user => user._id === userId);
            if (userToEdit) {
                setEditMode(true);
                setEditUserId(userId);
                
                // Reset form with user data
                reset({
                    name: userToEdit.name,
                    email: userToEdit.email,
                    password: '',
                    role: userToEdit.role,
                    permissions: userToEdit.permissions
                });
                
                setModalOpen(true);
            } else {
                toast.error('User not found');
            }
        } catch (error) {
            toast.error('Failed to load user data');
        }
        setLoading(false);
    };

    // **Handle User Deletion**
    const handleDeleteClick = async (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            setLoading(true);
            try {
                await deleteUser(id);
                toast.success('User deleted successfully');
                await fetchUserData(); // Wait for the data to be refreshed
            } catch (error) {
                toast.error(error.message || 'Error deleting user');
            } finally {
                setLoading(false);
            }
        }
    };

    // **Open Modal for Adding/Editing**
    const handleAddClick = () => {
        setShowPassword(false);
        reset();
        setEditMode(false);
        setModalOpen(true);
    };

    const handleEditClick = (user) => {
        setShowPassword(false);
        refreshAndEditUser(user._id);
    };

    // Add useEffect to ensure form values are properly set when a user is being edited
    useEffect(() => {
        if (editUserId && isModalOpen) {
            // Find the user data from userData array
            const userToEdit = userData.find(user => user._id === editUserId);
            if (userToEdit) {
                // Set form values
                setValue('name', userToEdit.name);
                setValue('email', userToEdit.email);
                setValue('password', '');
                setValue('role', userToEdit.role);
                setValue('permissions', userToEdit.permissions);
            }
        }
    }, [editUserId, isModalOpen, userData, setValue]);

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    // **Submit User Data**
    const onSubmit = async (formData) => {
        setLoading(true);
        try {
            // Ensure admins always have 'All Permissions'
            const permissions = formData.role === 'Admin' ? 'All Permissions' : formData.permissions;
            
            // Create payload, removing password if it's null (in edit mode with no new password)
            const payload = {
                ...formData,
                permissions
            };
            
            // Remove password if it's null/empty and we're in edit mode
            if (isEditMode && !formData.password) {
                delete payload.password;
            }

            if (isEditMode) {
                await updateUser(editUserId, payload);
                toast.success('User updated successfully');
            } else {
                await addUser(payload);
                toast.success('User added successfully');
            }

            fetchUserData();
            setModalOpen(false);
        } catch (error) {
            // Create user-friendly error messages
            let friendlyMessage = 'Something went wrong. Please try again.';
            
            if (error.message) {
                // Handle common error scenarios with user-friendly messages
                if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
                    friendlyMessage = 'This email address is already in use. Please use a different email.';
                } else if (error.message.includes('validation failed')) {
                    friendlyMessage = 'Please check your input and try again.';
                } else if (error.message.includes('not found')) {
                    friendlyMessage = 'The user you are trying to edit no longer exists.';
                } else if (error.message.includes('permission denied') || error.message.includes('unauthorized')) {
                    friendlyMessage = 'You do not have permission to perform this action.';
                }
            }
            
            toast.error(friendlyMessage);
            console.error('Original error:', error); // Log the original error for debugging
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 bg-background min-h-screen">
            <ToastContainer />
            <DataTable columns={columns} data={userData} title="Users" onAddClick={handleAddClick} />

            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={isEditMode ? "Edit User" : "Add New User"}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <input
                        type="text"
                        placeholder="Full Name"
                        {...register('name')}
                        className={`w-full p-2 border rounded-xl mb-1 ${errors.name ? 'border-red-300' : 'border-gray-300'}`}
                    />
                    {errors.name && <p className="text-red-500 text-xs mb-3">{errors.name.message}</p>}

                    <input
                        type="email"
                        placeholder="Email"
                        {...register('email')}
                        className={`w-full p-2 border rounded-xl mb-1 ${errors.email ? 'border-red-300' : 'border-gray-300'}`}
                    />
                    {errors.email && <p className="text-red-500 text-xs mb-3">{errors.email.message}</p>}

                    <div className="relative mb-3">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder={isEditMode ? "Enter new password (optional)" : "Password"}
                            {...register('password')}
                            className={`w-full p-2 border rounded-xl mb-1 pr-10 ${errors.password ? 'border-red-300' : 'border-gray-300'}`}
                        />
                        <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 cursor-pointer"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                        {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
                    </div>

                    <div className="mb-3">
                        <Select
                            options={[
                                { value: 'Admin', label: 'Admin' },
                                { value: 'Employee', label: 'Employee' },
                                { value: 'Team Manager', label: 'Team Manager' },
                            ]}
                            placeholder="Select Role"
                            onChange={(selectedOption) => setValue('role', selectedOption ? selectedOption.value : '')}
                            className={`w-full ${errors.role ? 'border-red-300' : ''}`}
                            isClearable
                            value={
                                watch('role') 
                                    ? { value: watch('role'), label: watch('role') } 
                                    : null
                            }
                            defaultValue={isEditMode && userData.find(user => user._id === editUserId)?.role 
                                ? { value: userData.find(user => user._id === editUserId)?.role, 
                                    label: userData.find(user => user._id === editUserId)?.role } 
                                : null}
                        />
                        {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
                    </div>
                    
                    {watch('role') === 'Admin' ? (
                        <p className="text-green-500 font-semibold mb-3">Admin have all Permissions</p>
                    ) : (
                        <div className="mb-3">
                            <Select
                                options={[
                                    { value: 'Sales', label: 'Sales' },
                                    { value: 'Orders', label: 'Orders' },
                                    { value: 'Sales & Orders', label: 'Sales & Orders' }
                                ]}
                                placeholder="Select Permissions"
                                onChange={(selectedOption) => setValue('permissions', selectedOption ? selectedOption.value : '')}
                                className={`w-full ${errors.permissions ? 'border-red-300' : ''}`}
                                isClearable
                                value={
                                    watch('permissions') 
                                        ? { value: watch('permissions'), label: watch('permissions') } 
                                        : null
                                }
                                defaultValue={isEditMode && userData.find(user => user._id === editUserId)?.permissions 
                                    ? { value: userData.find(user => user._id === editUserId)?.permissions, 
                                        label: userData.find(user => user._id === editUserId)?.permissions } 
                                    : null}
                            />
                            {errors.permissions && <p className="text-red-500 text-xs mt-1">{errors.permissions.message}</p>}
                        </div>
                    )}

                    <Button type="submit" className="w-full bg-accent" disabled={loading}>
                        {loading ? 'Saving...' : 'Submit'}
                    </Button>
                </form>
            </Modal>
        </div>
    );
};

export default UserManagement;
