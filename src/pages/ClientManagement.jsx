// src/pages/ClientManagement.js
import React, { useState, useEffect } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { getAllClients, addClient, updateClient, deleteClient } from '@/services/clientService';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Edit, Trash2 } from 'lucide-react';

// ✅ **Validation Schema**
const schema = yup.object().shape({
    name: yup.string().required('Client name is required'),
    email: yup.string()
        .email('Please enter a valid email address')
        .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email must contain @ and a domain')
        .required('Email is required')
        .trim()
        .lowercase(),
    phone: yup.string().required('Phone number is required'),
    address: yup.string().required('Address is required'),
});

const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Address', accessor: 'address' },
    { header: 'Actions', accessor: 'actions' },
];

const ClientManagement = () => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [clientData, setClientData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isEditMode, setEditMode] = useState(false);
    const [editClientId, setEditClientId] = useState(null);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(schema),
    });

    useEffect(() => {
        fetchClientData();
    }, []);

    // ✅ **Fetch Clients from API**
    const fetchClientData = async () => {
        setLoading(true);
        try {
            const data = await getAllClients();
            setClientData(
                data.map((client) => ({
                    ...client,
                    actions: (
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleEditClick(client)}
                                className="p-1 text-blue-500 hover:text-blue-700"
                                title="Edit"
                            >
                                <Edit size={16} />
                            </button>
                            <button
                                onClick={() => handleDeleteClick(client._id)}
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
            toast.error('Failed to fetch client data');
        }
        setLoading(false);
    };

    // ✅ **Handle Client Deletion**
    const handleDeleteClick = async (id) => {
        if (window.confirm('Are you sure you want to delete this client?')) {
            setLoading(true);
            try {
                await deleteClient(id);
                toast.success('Client deleted successfully');
                fetchClientData();
            } catch (error) {
                toast.error('Error deleting client');
            } finally {
                setLoading(false);
            }
        }
    };

    // ✅ **Open Modal for Add/Edit**
    const handleAddClick = () => {
        reset();
        setEditMode(false);
        setModalOpen(true);
    };

    const handleEditClick = (client) => {
        setEditMode(true);
        setEditClientId(client._id);
        setValue('name', client.name);
        setValue('email', client.email);
        setValue('phone', client.phone);
        setValue('address', client.address);
        setModalOpen(true);
    };

    // ✅ **Submit Client Data**
    const onSubmit = async (formData) => {
        setLoading(true);
        try {
            if (isEditMode) {
                await updateClient(editClientId, formData);
                toast.success('Client updated successfully');
            } else {
                await addClient(
                    formData
                );
                toast.success('Client added successfully');
            }
            fetchClientData();
        } catch (error) {
            toast.error('Error saving client data');
        } finally {
            setLoading(false);
            setModalOpen(false);
        }
    };

    return (
        <div className="p-8 bg-background min-h-screen">
            <ToastContainer />
            <DataTable columns={columns} data={clientData} title="Clients" onAddClick={handleAddClick} />

            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={isEditMode ? "Edit Client" : "Add New Client"}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <input type="text" placeholder="Name" {...register('name')} className="w-full p-2 border rounded-xl mb-3" />
                    {errors.name && <p className="text-red-500">{errors.name.message}</p>}

                    <input type="email" placeholder="Email" {...register('email')} className="w-full p-2 border rounded-xl mb-3" />
                    {errors.email && <p className="text-red-500">{errors.email.message}</p>}

                    <input type="text" placeholder="Phone" {...register('phone')} className="w-full p-2 border rounded-xl mb-3" />
                    {errors.phone && <p className="text-red-500">{errors.phone.message}</p>}

                    <input type="text" placeholder="Address" {...register('address')} className="w-full p-2 border rounded-xl mb-3" />
                    {errors.address && <p className="text-red-500">{errors.address.message}</p>}

                    <Button type="submit" className="w-full bg-accent" disabled={loading}>
                        {loading ? 'Saving...' : 'Submit'}
                    </Button>
                </form>
            </Modal>
        </div>
    );
};

export default ClientManagement;
