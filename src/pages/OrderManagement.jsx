import React, { useState, useEffect } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { getAllOrders, updateOrder, deleteOrder } from '../services/orderService';
import { getAllClients } from '../services/clientService';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Select from 'react-select';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Edit, Trash2 } from 'lucide-react';

const validationSchema = yup.object({
    clientId: yup.object().required('Client is required'),
    orderAmount: yup.number().required('Order amount is required').positive('Amount must be positive'),
    orderQty: yup.number().required('Order quantity is required').positive('Quantity must be positive'),
    sourcingCost: yup.number().required('Sourcing cost is required').positive('Cost must be positive'),
    date: yup.date().required('Date is required')
});

const columns = [
    { header: 'Client Name', accessor: 'clientName' },
    { header: 'Order Amount', accessor: 'orderAmount' },
    { header: 'Order Quantity', accessor: 'orderQty' },
    { header: 'Sourcing Cost', accessor: 'sourcingCost' },
    { header: 'Date', accessor: 'date' },
    { header: 'Ordered By', accessor: 'employeeName' },
    { header: 'Actions', accessor: 'actions' }
];

const OrderManagement = () => {
    const [orderData, setOrderData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [isEditMode, setEditMode] = useState(false);
    const [editOrderId, setEditOrderId] = useState(null);
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
        resolver: yupResolver(validationSchema),
    });

    useEffect(() => {
        fetchOrderData();
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

    const fetchOrderData = async () => {
        setLoading(true);
        try {
            // Create a filter that includes both 2024 and 2025 data
            const filters = {
                startMonth: 1,
                startYear: 2024,  // Start from 2024 to include the 13/11/2024 orders
                endMonth: 12,
                endYear: 2025     // Include 2025 data as well
            };
            
            console.log("Fetching orders with date range:", filters);
            const data = await getAllOrders(filters);

            // Format the date before setting it in state
            const formattedData = data.map(order => {
                // Parse the date string carefully to handle different formats
                let orderDate;
                try {
                    // Try to parse the date
                    orderDate = new Date(order.date);
                    // Check if the date is valid
                    if (isNaN(orderDate.getTime())) {
                        console.warn("Invalid date format:", order.date);
                        orderDate = new Date(); // Use current date as fallback
                    }
                } catch (e) {
                    console.error("Error parsing date:", e);
                    orderDate = new Date(); // Use current date as fallback
                }
                
                return {
                    ...order,
                    date: orderDate.toLocaleDateString('en-GB'), // Formats as DD/MM/YYYY
                    employeeName: order.employeeId?.name || 'Unknown',
                    actions: (
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleEditClick(order)}
                                className="text-blue-500 hover:text-blue-700"
                            >
                                <Edit size={16} />
                            </button>
                            <button
                                onClick={() => handleDeleteClick(order._id)}
                                className="text-red-500 hover:text-red-700"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ),
                };
            });

            console.log(`Loaded ${formattedData.length} orders`);
            setOrderData(formattedData);
        } catch (error) {
            console.error("Error fetching orders:", error);
            toast.error('Failed to fetch order data');
        }
        setLoading(false);
    };

    const handleEditClick = (order) => {
        setEditMode(true);
        setEditOrderId(order._id);
        
        // Find the client in the clients array to set as Select value
        const clientOption = clients.find(client => 
            client.value === order.clientId
        ) || { value: order.clientId, label: order.clientName };
        
        // Parse the date value - handle different formats
        let dateValue;
        try {
            // If the date is in DD/MM/YYYY format (from the table display)
            if (typeof order.date === 'string' && order.date.includes('/')) {
                const [day, month, year] = order.date.split('/').map(Number);
                dateValue = new Date(year, month - 1, day);
            } else {
                // Try regular parsing
                dateValue = new Date(order.date);
            }
            
            // Verify date is valid
            if (isNaN(dateValue.getTime())) {
                console.warn("Invalid date from order object:", order.date);
                dateValue = new Date(); // Use current date as fallback
            }
            
            // Format to YYYY-MM-DD for the form input
            const formattedDate = dateValue.toISOString().split('T')[0];
            console.log("Parsed date for form:", formattedDate);
            
            // Reset form with existing order data
            reset({
                clientId: clientOption,
                orderAmount: order.orderAmount,
                orderQty: order.orderQty,
                sourcingCost: order.sourcingCost,
                date: formattedDate
            });
        } catch (e) {
            console.error("Error parsing date:", e);
            // Use fallback with today's date
            reset({
                clientId: clientOption,
                orderAmount: order.orderAmount,
                orderQty: order.orderQty,
                sourcingCost: order.sourcingCost,
                date: new Date().toISOString().split('T')[0]
            });
        }
        
        setModalOpen(true);
    };

    const handleDeleteClick = async (id) => {
        if (window.confirm('Are you sure you want to delete this order?')) {
            setLoading(true);
            try {
                await deleteOrder(id);
                toast.success('Order deleted successfully');
                fetchOrderData();
            } catch (error) {
                toast.error('Failed to delete order');
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
                orderAmount: Number(data.orderAmount),
                orderQty: Number(data.orderQty),
                sourcingCost: Number(data.sourcingCost),
            };

            if (isEditMode) {
                await updateOrder(editOrderId, payload);
                toast.success('Order updated successfully');
            }

            setModalOpen(false);
            fetchOrderData();
        } catch (error) {
            toast.error('Error occurred while saving order');
        }
        setLoading(false);
    };

    return (
        <div className="p-8 bg-background min-h-screen">
            <ToastContainer />
            <DataTable 
                columns={columns} 
                data={orderData} 
                title="Orders"
            />

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setModalOpen(false)} 
                title="Edit Order"
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
                        placeholder="Order Amount"
                        {...register('orderAmount')}
                        className="w-full p-2 border rounded-xl mb-3"
                    />
                    {errors.orderAmount && <p className="text-red-500 mb-3">{errors.orderAmount.message}</p>}

                    <input
                        type="number"
                        placeholder="Order Quantity"
                        {...register('orderQty')}
                        className="w-full p-2 border rounded-xl mb-3"
                    />
                    {errors.orderQty && <p className="text-red-500 mb-3">{errors.orderQty.message}</p>}

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

export default OrderManagement; 