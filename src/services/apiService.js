// src/services/apiService.js
import axios from 'axios';
import { API_AUTH_URL, API_URL } from '../config/env';
import { getManagerTeam } from './teamService';
import { jwtDecode } from 'jwt-decode';

// Get all employees (Admin only)
export const getEmployees = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('Authentication token is missing');
            return [];
        }

        const { data } = await axios.get(`${API_AUTH_URL}/employees`, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Cache-Control': 'no-cache'
            }
        });
        return data;
    } catch (error) {
        console.error('Failed to fetch employee data:', error);
        
        // Handle specific error types
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Server error response:', error.response.status, error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received:', error.request);
        }
        
        return [];
    }
};

// Get team members for the current team manager's team
export const getTeamMembers = async () => {
    try {
        console.log('Fetching team members for team manager');
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.error('No authentication token found');
            return [];
        }
        
        // Extract user information from token
        let userId = null;
        let userRole = null;
        
        try {
            const decoded = jwtDecode(token);
            userId = decoded.id;
            userRole = decoded.role;
            console.log(`User ID from token: ${userId}, Role: ${userRole}`);
        } catch (e) {
            console.error('Error extracting user info from token:', e);
            return [];
        }
        
        // If user is not a team manager, don't attempt to fetch team members
        if (userRole !== 'Team Manager' && userRole !== 'Admin') {
            console.warn(`User role ${userRole} is not authorized to fetch team members`);
            return [];
        }
        
        // First attempt: Try to get the team by team manager ID
        try {
            console.log(`Fetching team for team manager ID: ${userId}`);
            const { data } = await axios.get(`${API_URL}/teams/manager/${userId}`, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (data && (data.members || data.employees)) {
                const members = data.members || data.employees || [];
                console.log(`Successfully fetched ${members.length} team members`);
                return members;
            }
        } catch (error) {
            console.warn('Failed to fetch team by manager ID, trying alternate approach');
        }
        
        // Second attempt: Get manager's team from teamService
        const teamData = await getManagerTeam();
        
        if (teamData && Array.isArray(teamData) && teamData.length > 0) {
            const team = teamData[0];
            
            if (team.members && Array.isArray(team.members) && team.members.length > 0) {
                console.log(`Found ${team.members.length} team members via team data`);
                return team.members;
            }
        }
        
        // Third attempt: Try to get employees assigned to this manager directly
        try {
            console.log(`Trying to fetch employees assigned to manager: ${userId}`);
            const { data } = await axios.get(`${API_URL}/employees/manager/${userId}`, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (data && Array.isArray(data) && data.length > 0) {
                console.log(`Found ${data.length} employees assigned to this manager`);
                return data;
            }
        } catch (error) {
            console.warn('Failed to fetch employees by manager ID');
        }
        
        // If all specific approaches fail, just return an empty array
        console.error('Could not fetch team members through any method');
        return [];
    } catch (error) {
        console.error('Error in getTeamMembers:', error);
        return [];
    }
};

// Get user profile
export const getUserProfile = async () => {
    try {
        const { data } = await axios.get(`${API_AUTH_URL}/profile`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return data;
    } catch (error) {
        console.error('Failed to fetch user profile:', error);
        return null;
    }
};

// Get all team managers (Admin only)
export const getTeamManagers = async () => {
    try {
        const { data } = await axios.get(`${API_AUTH_URL}/managers`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return data;
    } catch (error) {
        console.error('Failed to fetch team managers:', error);
        return [];
    }
};

// Login
export const login = async (credentials) => {
    try {
        const { data } = await axios.post(`${API_AUTH_URL}/login`, credentials);
        
        // Validate token
        if (data.token) {
            // Store the token in localStorage
            localStorage.setItem('token', data.token);
        }
        
        return data;
    } catch (error) {
        console.error('Login failed:', error);
        
        // Provide more meaningful error message based on response
        if (error.response && error.response.data) {
            throw new Error(error.response.data.msg || 'Authentication failed');
        }
        
        throw error;
    }
};

// Register
export const register = async (userData) => {
    try {
        const { data } = await axios.post(`${API_AUTH_URL}/register`, userData);
        return data;
    } catch (error) {
        console.error('Registration failed:', error);
        throw error;
    }
};

// Get User By ID
export const getUserById = async (userId) => {
    try {
        if (!userId) {
            console.error('Cannot fetch user: No userId provided');
            return null;
        }
        
        console.log(`Fetching user with ID: ${userId}`);
        const { data } = await axios.get(`${API_URL}/auth/users/${userId}`, {
            headers: { 
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Cache-Control': 'no-cache' 
            }
        });
        
        console.log(`User data received for ID ${userId}:`, data);
        return data;
    } catch (error) {
        console.error(`Failed to fetch user with ID ${userId}:`, error);
        
        // If the specific endpoint doesn't exist, try the general users endpoint
        try {
            console.log('Trying alternative endpoint to get user');
            const { data } = await axios.get(`${API_URL}/users/${userId}`, {
                headers: { 
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Cache-Control': 'no-cache' 
                }
            });
            return data;
        } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            return null;
        }
    }
};

// Get team members for current user (works for both admin and team manager)
export const getTeamMembersForCurrentUser = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            return [];
        }
        
        // Get user role from token
        let userRole = null;
        try {
            const decoded = jwtDecode(token);
            userRole = decoded.role;
            console.log(`User role from token: ${userRole}`);
        } catch (error) {
            console.error('Error decoding token:', error);
            return [];
        }
        
        // For team managers, use the dedicated endpoint
        if (userRole === 'Team Manager') {
            console.log('Using team manager endpoint to fetch team members');
            try {
                const { data } = await axios.get(`${API_URL}/teams/my-team`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                // Extract members from the team data
                if (data && data.members && Array.isArray(data.members)) {
                    console.log(`Found team with ${data.members.length} members`);
                    return data.members;
                } else {
                    console.log('No team members found in response:', data);
                    return [];
                }
            } catch (error) {
                console.error('Error fetching team members:', error);
                return [];
            }
        }
        
        // For admins, get all employees
        if (userRole === 'Admin') {
            try {
                const { data } = await axios.get(`${API_URL}/employees`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log(`Admin: Found ${data?.length || 0} employees`);
                return data || [];
            } catch (error) {
                console.error('Error fetching employees for admin:', error);
                return [];
            }
        }
        
        // Fallback: return empty array for other roles
        console.log(`User role ${userRole} not authorized to fetch team members`);
        return [];
    } catch (error) {
        console.error('Failed to fetch team members for current user:', error);
        return [];
    }
};