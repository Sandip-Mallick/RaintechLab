import axios from 'axios';
import { API_EMPLOYEES_URL, API_AUTH_URL } from '../config/env';

export const getAllEmployees = async () => {
    try {
        const { data } = await axios.get(API_EMPLOYEES_URL, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return data;
    } catch (error) {
        console.error('Failed to fetch employee data:', error);
        return [];
    }
};

// **Fetch All Users**
export const getAllUsers = async () => {
    try {
        const { data } = await axios.get(`${API_AUTH_URL}/users`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });      
          return data;
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return [];
    }
};

// **Add a New User**
export const addUser = async (userData) => {
    try {
        const response = await axios.post(`${API_AUTH_URL}/register`, userData, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            // Server responded with an error
            const errorMessage = error.response.data.msg || error.response.data.error || 'Failed to add user';
            throw new Error(errorMessage);
        } else if (error.request) {
            throw new Error('Could not connect to server');
        } else {
            throw new Error('Request configuration error');
        }
    }
};

// **Update a User**
export const updateUser = async (id, userData) => {
    try {
        const { data } = await axios.put(`${API_AUTH_URL}/users/${id}`, userData, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return data;
    } catch (error) {
        if (error.response) {
            // Server responded with an error
            const errorMessage = error.response.data.msg || error.response.data.error || 'Failed to update user';
            throw new Error(errorMessage);
        } else if (error.request) {
            throw new Error('Could not connect to server');
        } else {
            throw new Error('Request configuration error');
        }
    }
};

// **Delete a User**
export const deleteUser = async (id) => {
    try {
        const response = await axios.delete(`${API_AUTH_URL}/users/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            const errorMessage = error.response.data.msg || error.response.data.error || 'Failed to delete user';
            throw new Error(errorMessage);
        } else if (error.request) {
            throw new Error('Could not connect to server');
        } else {
            throw new Error('Request configuration error');
        }
    }
};

