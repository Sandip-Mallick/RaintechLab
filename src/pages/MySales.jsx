import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { getEmployeeSales, addSale } from '@/services/salesService';
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
    salesAmount: yup.number().positive().required('Sales amount is required'),
    salesQty: yup.number().positive().required('Sales quantity is required'),
    sourcingCost: yup.number().positive().required('Sourcing cost is required'),
    date: yup.date().required('Date is required'),
});

const MySales = () => {
    const [salesData, setSalesData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [clientOptions, setClientOptions] = useState([]);

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
    });

    useEffect(() => {
        fetchSalesData();
        fetchClientData();
    }, []);

    // Format number as currency
    const formatCurrency = (value) => {
        if (value === undefined || value === null) return '₹0';
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return '₹0';
        return '₹' + numValue.toLocaleString('en-IN');
    };

    // Fetch Sales Data with memoization
    const fetchSalesData = useCallback(async (refresh = false) => {
        setLoading(true);
        try {
            console.log("Fetching employee sales data...");
            localStorage.removeItem('salesData'); // Clear any cached data before fetching
            const data = await getEmployeeSales(refresh);
            console.log("Sales data received:", typeof data, Array.isArray(data) ? `Array with ${data.length} items` : 'Not an array');
            
            if (!data || !Array.isArray(data)) {
                console.warn("Invalid sales data format received:", data);
                setSalesData([]);
                toast.warning('No sales data available');
                setLoading(false);
                return;
            }
            
            if (data.length === 0) {
                console.log("No sales data found for the current user");
                setSalesData([]);
                setLoading(false);
                return;
            }
            
            console.log("Processing sales data for display:", data.length, "records");
            
            const formattedData = data.map(sale => {
                // Extract the client name from potentially different data structures
                let clientName = "Unknown Client";
                
                if (sale.clientName) {
                    clientName = sale.clientName;
                } else if (sale.client) {
                    if (typeof sale.client === 'object' && sale.client.name) {
                        clientName = sale.client.name;
                    } else if (typeof sale.client === 'string') {
                        clientName = sale.client;
                    }
                } else if (sale.clientId && typeof sale.clientId === 'object' && sale.clientId.name) {
                    clientName = sale.clientId.name;
                }
                
                return {
                    ...sale,
                    id: sale._id || sale.id || Math.random().toString(36).substring(2),
                    clientName,
                    displaySalesAmount: formatCurrency(sale.salesAmount),
                    displaySourcingCost: formatCurrency(sale.sourcingCost),
                    displayDate: sale.formattedDate || (sale.date ? new Date(sale.date).toLocaleDateString('en-GB') : "Unknown Date"),
                };
            });
            
            console.log("Formatted data for display:", formattedData.length, "records");
            setSalesData(formattedData);
            
            // Don't show success toast when loading data normally
            if (refresh === 'newSale' && formattedData.length > 0) {
                toast.success(`Successfully loaded ${formattedData.length} sales records`);
            }
        } catch (error) {
            console.error('Error fetching sales data:', error);
            toast.error('Failed to fetch sales data: ' + (error.message || 'Unknown error'));
            setSalesData([]);
        } finally {
            setLoading(false);
        }
    }, []);

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
            
            if (!formData.salesAmount || isNaN(Number(formData.salesAmount)) || Number(formData.salesAmount) <= 0) {
                throw new Error("Valid sales amount is required");
            }
            
            if (!formData.salesQty || isNaN(Number(formData.salesQty)) || Number(formData.salesQty) <= 0) {
                throw new Error("Valid sales quantity is required");
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
            
            console.log(`Adding sale for client "${clientName}" (${formData.clientId}) by user: ${userId || "Unknown"}`);

            const payload = {
                clientId: String(formData.clientId),
                clientName: clientName, // Include client name explicitly
                salesAmount: Number(formData.salesAmount),
                salesQty: Number(formData.salesQty),
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

            const response = await addSale(payload);
            
            if (response) {
                console.log("Sale added successfully, response:", response);
                toast.success('Sale added successfully');
                reset(); // Reset form
                
                // Close modal before refreshing data
                setModalOpen(false);
                
                // Clear localStorage entry for sales data to force a fresh fetch
                localStorage.removeItem('salesData');
                
                // Add a small delay before refreshing to ensure backend has processed it
                setTimeout(async () => {
                    try {
                        // Force refresh data with 'newSale' parameter
                        await fetchSalesData('newSale');
                    } catch (refreshError) {
                        console.error("Error refreshing sales data:", refreshError);
                        toast.warning('Added successfully but could not refresh data.');
                    }
                }, 1000);
            } else {
                throw new Error("No response returned from server");
            }
        } catch (error) {
            console.error("Error while adding sale:", error);
            toast.error(error.message || 'Error occurred while saving sale');
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

            {/* Sales Table */}
            <DataTable columns={[
                { header: 'Client Name', accessor: 'clientName' },
                { header: 'Sales Amount', accessor: 'displaySalesAmount' },
                { header: 'Sales Quantity', accessor: 'salesQty' },
                { header: 'Sourcing Cost', accessor: 'displaySourcingCost' },
                { header: 'Date', accessor: 'displayDate' },
            ]} data={salesData} title="My Sales" onAddClick={() => { reset(); setModalOpen(true); }} />

            {/* Sales Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Add New Sale">
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

                    {/* Sales Fields */}
                    <div className="mb-3">
                        <label className="block text-gray-700 mb-1">Sales Amount</label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Sales Amount"
                            {...register("salesAmount")}
                            className="w-full p-2 border rounded-xl"
                        />
                        {errors.salesAmount && <p className="text-red-500">{errors.salesAmount?.message}</p>}
                    </div>

                    <div className="mb-3">
                        <label className="block text-gray-700 mb-1">Sales Quantity</label>
                        <input
                            type="number"
                            placeholder="Sales Quantity"
                            {...register("salesQty")}
                            className="w-full p-2 border rounded-xl"
                        />
                        {errors.salesQty && <p className="text-red-500">{errors.salesQty?.message}</p>}
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

export default MySales;
