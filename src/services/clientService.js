import axios from 'axios';
import { API_CLIENTS_URL, API_URL } from '../config/env';

// ✅ Fetch all clients with improved error handling
export const getAllClients = async () => {
    console.log('Fetching all clients...');
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            return [];
        }

        try {
            const response = await fetch(`${API_URL}/clients`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log(`Clients API response status: ${response.status}`);

            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Unauthorized: Token may be invalid');
                    return [];
                } else if (response.status === 403) {
                    console.error('Forbidden: Not enough permissions to access clients');
                    return [];
                } else {
                    console.error(`Error fetching clients: ${response.status}`);
                    return [];
                }
            }

            const data = await response.json();
            
            if (!Array.isArray(data)) {
                console.error('Expected clients data to be an array but got:', typeof data);
                return [];
            }
            
            // Sanitize and standardize the client data
            const clientsData = data.map(client => ({
                id: client._id || client.id || `temp-${Math.random().toString(36).substring(2, 9)}`,
                _id: client._id || client.id,
                name: client.name || 'Unnamed Client',
                email: client.email || '',
                phone: client.phone || '',
                address: client.address || '',
                city: client.city || '',
                state: client.state || '',
                zip: client.zip || '',
                country: client.country || '',
                notes: client.notes || '',
                createdAt: client.createdAt || new Date().toISOString(),
                updatedAt: client.updatedAt || new Date().toISOString()
            }));

            console.log(`Successfully fetched ${clientsData.length} clients`);
            return clientsData;
        } catch (fetchError) {
            console.error('Error fetching clients data:', fetchError);
            return [];
        }
    } catch (error) {
        console.error('Unexpected error in getAllClients:', error);
        return [];
    }
};

// ✅ Add a new client (Admin Only)
export const addClient = async (clientData) => {
    try {
        const { data } = await axios.post(API_CLIENTS_URL, clientData, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return data;
    } catch (error) {
        console.error('Failed to add client:', error);
        return null;
    }
};
export const updateClient = async (clientId, clientData) => {
    try {
        const { data } = await axios.put(`${API_CLIENTS_URL}/${clientId}`, clientData, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return data;
    } catch (error) {
        console.error('Failed to update sale:', error);
        return null;
    }
};

// Delete Employee's Own Sale
export const deleteClient = async (clientId) => {
    try {
        await axios.delete(`${API_CLIENTS_URL}/${clientId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return true;
    } catch (error) {
        console.error('Failed to delete sale:', error);
        return false;
    }
};

