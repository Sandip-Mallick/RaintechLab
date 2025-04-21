import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { getEmployeeOrders, addOrder } from '@/services/orderService';
import { getAllClients } from '@/services/clientService';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Loader } from 'lucide-react';
import Select from 'react-select';

const schema = yup.object().shape({
    clientId: yup.string()
        .transform(value => (typeof value === "object" ? value.value : value))
        .required('Client is required'),
    orderAmount: yup.number().positive().required('Order amount is required'),
    orderQty: yup.number().positive().required('Order quantity is required'),
    sourcingCost: yup.number().positive().required('Sourcing cost is required'),
    date: yup.date().required('Date is required'),
});

const MyOrders = () => {
    const [ordersData, setOrdersData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [clientOptions, setClientOptions] = useState([]);

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
    });

    useEffect(() => {
        fetchOrdersData();
        fetchClientData();
    }, []);

    // Format number as currency
    const formatCurrency = (value) => {
        if (value === undefined || value === null) return '₹0';
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return '₹0';
        return '₹' + numValue.toLocaleString('en-IN');
    };

    // Fetch Orders Data with memoization
    const fetchOrdersData = useCallback(async (refresh = false) => {
        setLoading(true);
        try {
            console.log("Fetching employee orders data...");
            localStorage.removeItem('ordersData'); // Clear any cached data before fetching
            const data = await getEmployeeOrders(refresh);
            console.log("Orders data received:", typeof data, Array.isArray(data) ? `Array with ${data.length} items` : 'Not an array');
            
            if (!data || !Array.isArray(data)) {
                console.warn("Invalid orders data format received:", data);
                setOrdersData([]);
                toast.warning('No orders data available');
                setLoading(false);
                return;
            }
            
            if (data.length === 0) {
                console.log("No orders data found for the current user");
                setOrdersData([]);
                setLoading(false);
                return;
            }
            
            console.log("Processing orders data for display:", data.length, "records");
            console.log("Sample data:", data[0]);
            
            const formattedData = data.map(order => {
                // Extract the client name from potentially different data structures
                let clientName = "Unknown Client";
                
                if (order.clientName) {
                    clientName = order.clientName;
                } else if (order.client) {
                    if (typeof order.client === 'object' && order.client.name) {
                        clientName = order.client.name;
                    } else if (typeof order.client === 'string') {
                        clientName = order.client;
                    }
                } else if (order.clientId && typeof order.clientId === 'object' && order.clientId.name) {
                    clientName = order.clientId.name;
                }
                
                // If we still don't have a client name, try to find it in clientOptions
                if (clientName === "Unknown Client" && order.clientId && clientOptions.length > 0) {
                    const matchingClient = clientOptions.find(client => client.value === order.clientId);
                    if (matchingClient) {
                        clientName = matchingClient.label;
                    }
                }
                
                return {
                    ...order,
                    id: order._id || order.id || Math.random().toString(36).substring(2),
                    clientName,
                    displayOrderAmount: formatCurrency(order.orderAmount),
                    displaySourcingCost: formatCurrency(order.sourcingCost),
                    displayDate: order.formattedDate || (order.date ? new Date(order.date).toLocaleDateString('en-GB') : "Unknown Date"),
                };
            });
            
            console.log("Formatted data for display:", formattedData.length, "records");
            setOrdersData(formattedData);
            
            // Remove all toast notifications on normal page load
            // Only show success toast when explicitly refreshing after adding a new order
            if (refresh === 'newOrder' && formattedData.length > 0) {
                // Silent load without toast notification
                console.log(`Successfully loaded ${formattedData.length} order records`);
            }
        } catch (error) {
            console.error('Error fetching orders data:', error);
            // Only show error toast on critical failures
            if (error.message && error.message.includes('authentication')) {
                toast.error('Authentication error. Please log in again.');
            } else {
                console.error('Failed to fetch orders data: ' + (error.message || 'Unknown error'));
            }
            setOrdersData([]);
        } finally {
            setLoading(false);
        }
    }, [clientOptions]);

    // Fetch Client Data
    const fetchClientData = async () => {
        try {
            console.log("Fetching client data...");
            const clients = await getAllClients();
            console.log("Client data:", clients);

            if (!clients || !Array.isArray(clients)) {
                console.log("Invalid client data", clients);
                setClientOptions([]);
                return;
            }

            setClientOptions(clients.map(client => ({ value: client._id, label: client.name })));
        } catch (error) {
            console.error('Failed to fetch clients:', error);
            toast.error('Failed to fetch clients');
        }
    };

    const onSubmit = async (formData) => {
        setLoading(true);
        try {
            console.log("Submitted Form Data:", formData);

            // Validate required fields
            if (!formData.clientId) {
                throw new Error("Client is required");
            }
            
            if (!formData.orderAmount || isNaN(Number(formData.orderAmount)) || Number(formData.orderAmount) <= 0) {
                throw new Error("Valid order amount is required");
            }
            
            if (!formData.orderQty || isNaN(Number(formData.orderQty)) || Number(formData.orderQty) <= 0) {
                throw new Error("Valid order quantity is required");
            }

            // Get user details for debugging
            const token = localStorage.getItem('token');
            let userId = localStorage.getItem('userId');
            
            // If userId isn't stored, try to get it from token
            if (!userId && token) {
                try {
                    const tokenParts = token.split('.');
                    if (tokenParts.length === 3) {
                        const tokenPayload = JSON.parse(atob(tokenParts[1]));
                        if (tokenPayload.id) {
                            userId = tokenPayload.id;
                            localStorage.setItem('userId', userId);
                        }
                    }
                } catch (e) {
                    console.error("Error extracting user ID from token:", e);
                }
            }
            
            // Find the selected client name for better logging
            const selectedClient = clientOptions.find(c => c.value === formData.clientId);
            const clientName = selectedClient ? selectedClient.label : "Unknown Client";
            
            console.log(`Adding order for client "${clientName}" (${formData.clientId}) by user: ${userId || "Unknown"}`);

            const payload = {
                clientId: String(formData.clientId),
                clientName: clientName, // Include client name explicitly
                orderAmount: Number(formData.orderAmount),
                orderQty: Number(formData.orderQty),
                sourcingCost: Number(formData.sourcingCost || 0),
                date: formData.date,
                // Explicitly add employee info for backend processing
                employee: userId || "current",
                employeeId: userId,
                userId: userId,
                createdBy: userId,
                // Add timestamp for debugging
                timestamp: new Date().getTime()
            };

            console.log("Payload being sent to API:", payload);

            const response = await addOrder(payload);
            
            if (response) {
                console.log("Order added successfully, response:", response);
                toast.success('Order added successfully');
                reset(); // Reset form
                
                // Close modal before refreshing data
                setModalOpen(false);
                
                // Clear localStorage entry for orders data to force a fresh fetch
                localStorage.removeItem('ordersData');
                
                // Add a small delay before refreshing to ensure backend has processed it
                setTimeout(async () => {
                    try {
                        // Force refresh data with 'newOrder' parameter
                        await fetchOrdersData('newOrder');
                    } catch (refreshError) {
                        console.error("Error refreshing orders data:", refreshError);
                        toast.warning('Added successfully but could not refresh data.');
                    }
                }, 1000);
            } else {
                throw new Error("No response returned from server");
            }
        } catch (error) {
            console.error("Error while adding order:", error);
            toast.error(error.message || 'Error occurred while saving order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 bg-background min-h-screen">
            <ToastContainer />

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
                    <Loader className="animate-spin text-primary" size={50} />
                </div>
            )}

            {/* Orders Table */}
            <DataTable columns={[
                { header: 'Client Name', accessor: 'clientName' },
                { header: 'Order Amount', accessor: 'displayOrderAmount' },
                { header: 'Order Quantity', accessor: 'orderQty' },
                { header: 'Sourcing Cost', accessor: 'displaySourcingCost' },
                { header: 'Date', accessor: 'displayDate' },
            ]} data={ordersData} title="My Orders" onAddClick={() => { reset(); setModalOpen(true); }} />

            {/* Order Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Add New Order">
                <form onSubmit={handleSubmit(onSubmit)}>
                    {/* Client Dropdown */}
                    <div className="mb-3">
                        <label className="block text-gray-700 mb-1">Client</label>
                        <Select
                            options={clientOptions}
                            placeholder="Select Client"
                            onChange={(selected) => setValue("clientId", selected.value)}
                            className="mb-1"
                        />

                        {errors.clientId && <p className="text-red-500">{errors.clientId.message}</p>}
                    </div>

                    {/* Order Fields */}
                    <div className="mb-3">
                        <label className="block text-gray-700 mb-1">Order Amount</label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Order Amount"
                            {...register("orderAmount")}
                            className="w-full p-2 border rounded-xl"
                        />
                        {errors.orderAmount && <p className="text-red-500">{errors.orderAmount?.message}</p>}
                    </div>

                    <div className="mb-3">
                        <label className="block text-gray-700 mb-1">Order Quantity</label>
                        <input
                            type="number"
                            placeholder="Order Quantity"
                            {...register("orderQty")}
                            className="w-full p-2 border rounded-xl"
                        />
                        {errors.orderQty && <p className="text-red-500">{errors.orderQty?.message}</p>}
                    </div>

                    <div className="mb-3">
                        <label className="block text-gray-700 mb-1">Sourcing Cost</label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Sourcing Cost"
                            {...register("sourcingCost")}
                            className="w-full p-2 border rounded-xl"
                        />
                        {errors.sourcingCost && <p className="text-red-500">{errors.sourcingCost?.message}</p>}
                    </div>

                    <div className="mb-3">
                        <label className="block text-gray-700 mb-1">Date</label>
                        <input
                            type="date"
                            {...register("date")}
                            className="w-full p-2 border rounded-xl"
                        />
                        {errors.date && <p className="text-red-500">{errors.date?.message}</p>}
                    </div>

                    <Button type="submit" className="w-full bg-accent" disabled={loading}>
                        {loading ? 'Saving...' : 'Submit'}
                    </Button>
                </form>
            </Modal>
        </div>
    );
};

export default MyOrders; 