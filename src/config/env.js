// Environment configuration
// Import environment variables from Vite
const API_BASE_URL = import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== "" 
    ? import.meta.env.VITE_API_URL.trim()
    : 'http://localhost:3000/api';

// Use the correct API URL based on environment or fallback to local
export const API_URL = API_BASE_URL;

// Employees API URL with fallback
export const API_EMPLOYEES_URL = import.meta.env.VITE_API_EMPLOYEES_URL && import.meta.env.VITE_API_EMPLOYEES_URL.trim() !== "" 
    ? import.meta.env.VITE_API_EMPLOYEES_URL.trim() 
    : `${API_URL}/users/employees`;

// Derived URLs with consistent structure
export const API_AUTH_URL = `${API_URL}/auth`;
export const API_SALES_URL = `${API_URL}/sales`;
export const API_ORDERS_URL = `${API_URL}/orders`;
export const API_TEAMS_URL = `${API_URL}/teams`;
export const API_TARGETS_URL = `${API_URL}/targets`;
export const API_CLIENTS_URL = `${API_URL}/clients`; 