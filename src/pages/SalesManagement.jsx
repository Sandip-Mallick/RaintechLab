// src/pages/SalesManagement.js
import React, { useState, useEffect } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { getAllSales, addSale, updateSale, deleteSale } from '../services/salesService';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Edit, Trash2 } from 'lucide-react';
import Select from 'react-select';
import { getAllClients } from '../services/clientService';

// Validation Schema for Adding/Updating Sales
const schema = yup.object().shape({
    clientId: yup.object().required('Client is required'),
    salesAmount: yup.number().positive().required('Sales amount is required'),
    salesQty: yup.number().positive().required('Sales quantity is required'),
    sourcingCost: yup.number().positive().required('Sourcing cost is required'),
    date: yup.date().required('Date is required'),
});

const columns = [
    { header: 'Client Name', accessor: 'clientName' },
    { header: 'Sales Amount', accessor: 'salesAmount' },
    { header: 'Sales Quantity', accessor: 'salesQty' },
    { header: 'Sourcing Cost', accessor: 'sourcingCost' },
    { header: 'Date', accessor: 'date' },
    { header: 'Sold By', accessor: 'employeeName' },
    { header: 'Actions', accessor: 'actions' }
];

const SalesManagement = () => {
    const [salesData, setSalesData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [isEditMode, setEditMode] = useState(false);
    const [editSaleId, setEditSaleId] = useState(null);
    const [clients, setClients] = useState([]);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        control,
        formState: { errors },
        watch
    } = useForm({
        resolver: yupResolver(schema),
    });

    useEffect(() => {
        fetchSalesData();
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const data = await getAllClients();
            setClients(data.map(client => ({ 
                value: client._id, 
                label: client.name 
            })));
        } catch (error) {
            console.error('Error fetching clients:', error);
            toast.error('Failed to fetch clients');
        }
    };

    const fetchSalesData = async () => {
        setLoading(true);
        try {
            const data = await getAllSales();
    
            // Format the date before setting it in state
            const formattedData = data.map(sale => ({
                ...sale,
                date: new Date(sale.date).toLocaleDateString('en-GB'), // Formats as DD/MM/YYYY
                employeeName: sale.employeeId?.name || 'Unknown',
                actions: (
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleEditClick(sale)}
                            className="text-blue-500 hover:text-blue-700"
                        >
                            <Edit size={16} />
                        </button>
                        <button
                            onClick={() => handleDeleteClick(sale._id)}
                            className="text-red-500 hover:text-red-700"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ),
            }));
    
            setSalesData(formattedData);
        } catch (error) {
            toast.error('Failed to fetch sales data');
        }
        setLoading(false);
    };

    const handleEditClick = (sale) => {
        setEditMode(true);
        setEditSaleId(sale._id);
        
        // Find the client in the clients array to set as Select value
        const clientOption = clients.find(client => 
            client.value === sale.clientId
        ) || { value: sale.clientId, label: sale.clientName };
        
        // Reset form with existing sale data
        reset({
            clientId: clientOption,
            salesAmount: sale.salesAmount,
            salesQty: sale.salesQty,
            sourcingCost: sale.sourcingCost,
            date: new Date(sale.date)
        });
        
        setModalOpen(true);
    };

    const handleDeleteClick = async (id) => {
        if (window.confirm('Are you sure you want to delete this sale?')) {
            setLoading(true);
            try {
                await deleteSale(id);
                toast.success('Sale deleted successfully');
                fetchSalesData();
            } catch (error) {
                toast.error('Failed to delete sale');
            }
            setLoading(false);
        }
    };

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            // Extract the clientId value if it's an object
            const clientIdValue = data.clientId && typeof data.clientId === 'object' ? 
                data.clientId.value : data.clientId;
                
            const payload = {
                ...data,
                clientId: clientIdValue, // Use the extracted ID value
                salesAmount: Number(data.salesAmount),
                salesQty: Number(data.salesQty),
                sourcingCost: Number(data.sourcingCost),
            };

            if (isEditMode) {
                await updateSale(editSaleId, payload);
                toast.success('Sale updated successfully');
            }

            setModalOpen(false);
            fetchSalesData();
        } catch (error) {
            toast.error('Error occurred while saving sale');
        }
        setLoading(false);
    };

    return (
        <div className="p-8 bg-background min-h-screen">
            <ToastContainer />
            <DataTable 
                columns={columns} 
                data={salesData} 
                title="Sales"
            />

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setModalOpen(false)} 
                title="Edit Sale"
            >
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="mb-3">
                        <Select
                            placeholder="Select a client"
                            options={clients}
                            onChange={(selectedOption) => setValue('clientId', selectedOption)}
                            value={watch('clientId')}
                            className="mb-1"
                        />
                        {errors.clientId && <p className="text-red-500 mb-2">{errors.clientId.message}</p>}
                    </div>

                    <input
                        type="number"
                        placeholder="Sales Amount"
                        {...register('salesAmount')}
                        className="w-full p-2 border rounded-xl mb-3"
                    />
                    {errors.salesAmount && <p className="text-red-500 mb-3">{errors.salesAmount.message}</p>}

                    <input
                        type="number"
                        placeholder="Sales Quantity"
                        {...register('salesQty')}
                        className="w-full p-2 border rounded-xl mb-3"
                    />
                    {errors.salesQty && <p className="text-red-500 mb-3">{errors.salesQty.message}</p>}

                    <input
                        type="number"
                        placeholder="Sourcing Cost"
                        {...register('sourcingCost')}
                        className="w-full p-2 border rounded-xl mb-3"
                    />
                    {errors.sourcingCost && <p className="text-red-500 mb-3">{errors.sourcingCost.message}</p>}

                    <input
                        type="date"
                        {...register('date')}
                        className="w-full p-2 border rounded-xl mb-3"
                    />
                    {errors.date && <p className="text-red-500 mb-3">{errors.date.message}</p>}

                    <Button type="submit" className="w-full bg-accent" disabled={loading}>
                        {loading ? 'Saving...' : 'Submit'}
                    </Button>
                </form>
            </Modal>
        </div>
    );
};

export default SalesManagement;
