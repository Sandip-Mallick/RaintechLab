// src/services/targetService.js
import axios from 'axios';
import { API_TARGETS_URL, API_URL } from '../config/env';
import { getTeamMembers } from './apiService';
import { jwtDecode } from "jwt-decode";

// Get All Targets (Admin)
export const getAllTargets = async (filters = {}) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(API_TARGETS_URL, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Cache-Control': 'no-cache'
            },
            params: filters
        });
        console.log("Successfully fetched targets with filters:", filters);
        console.log("Targets count:", response.data?.length || 0);
        return response.data;
    } catch (error) {
        console.error('Error fetching targets:', error);
        console.error('Error details:', error.response ? error.response.data : 'No response data');
        return [];
    }
};

// Get Assigned Targets (Employee)
export const getAssignedTargets = async (year = null) => {
    try {
        console.log(`Calling API to get assigned targets${year ? ` for year ${year}` : ''}`);
        const token = localStorage.getItem('token');
        console.log("Using auth token:", token ? `${token.substring(0, 10)}...` : 'No token');
        
        // Get user permissions from localStorage for debugging
        const userPermissions = localStorage.getItem('userPermissions');
        console.log("User permissions from localStorage:", userPermissions);
        
        // Construct API URL, add year as query parameter if provided
        const apiUrl = `${API_TARGETS_URL}/my-targets${year ? `?year=${year}` : ''}`;
        console.log("API URL being used:", apiUrl);
        
        const response = await axios.get(apiUrl, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache', // Added for older browsers
                'Expires': '0'       // Prevent caching
            },
            params: {
                timestamp: new Date().getTime() // Add timestamp to prevent caching
            }
        });
        
        console.log("API response for targets - Status:", response.status);
        console.log("API response for targets - Count:", response.data?.length || 0);
        
        // Check if the response has valid data
        if (response && response.data) {
            if (!Array.isArray(response.data)) {
                console.error("API returned non-array data for targets:", response.data);
                return [];
            }
            
            // Make sure all targets have the required fields and normalize target types
            const targets = response.data.map(target => {
                // Ensure each target has an ID for debugging
                const targetId = target._id || target.id || 'unknown';
                const rawTargetType = target.targetType || 'sale';
                
                // Normalize target types to lowercase
                let normalizedType = rawTargetType.toLowerCase();
                
                // Standardize target types - we'll use 'sale' and 'order' as our standard types
                // This ensures consistent filtering in the dashboard
                if (normalizedType === 'sales') normalizedType = 'sale';
                if (normalizedType === 'orders') normalizedType = 'order';
                
                // Parse numeric values to ensure they are numbers
                const targetAmount = parseFloat(target.targetAmount || 0);
                const targetQty = parseFloat(target.targetQty || 0);
                const month = parseInt(target.month || 1);
                const yearValue = parseInt(target.year || new Date().getFullYear());
                
                console.log(`Processing target ${targetId}: Type: "${normalizedType}", Month: ${month}, Year: ${yearValue}, Amount: ${targetAmount}`);
                
                return {
                    ...target,
                    targetType: normalizedType,
                    targetAmount: targetAmount,
                    targetQty: targetQty,
                    month: month,
                    year: yearValue
                };
            });
            
            console.log("Processed targets:", targets.length);
            
            // If a year was not provided in the API call, filter targets by year here
            let filteredTargets = targets;
            if (year && !apiUrl.includes('?year=')) {
                const yearInt = parseInt(String(year));
                console.log(`Filtering targets for year ${yearInt} client-side`);
                filteredTargets = targets.filter(target => {
                    const targetYear = parseInt(String(target.year || '0'));
                    return targetYear === yearInt;
                });
                console.log(`Filtered targets by year: ${filteredTargets.length} out of ${targets.length}`);
            }
            
            // Log target types for debugging
            const salesTargets = filteredTargets.filter(t => t.targetType === 'sale').length;
            const orderTargets = filteredTargets.filter(t => t.targetType === 'order').length;
            console.log(`Target types breakdown - Sales: ${salesTargets}, Orders: ${orderTargets}, Other: ${filteredTargets.length - salesTargets - orderTargets}`);
            
            if (filteredTargets.length > 0) {
                console.log("Sample targets:");
                filteredTargets.slice(0, 3).forEach((target, index) => {
                    console.log(`Target ${index + 1}:`, {
                        id: target._id,
                        type: target.targetType,
                        amount: target.targetAmount,
                        year: target.year,
                        month: target.month
                    });
                });
            } else {
                console.log("No targets found for the specified criteria");
            }
            
            return filteredTargets;
        }
        
        console.warn("API returned empty or invalid response for targets");
        return [];
    } catch (error) {
        console.error('Failed to fetch assigned targets:', error);
        console.error('Error details:', error.response ? error.response.data : 'No response data');
        console.error('Error status:', error.response ? error.response.status : 'No status');
        return [];
    }
};

// Get Team Member Targets (Team Manager)
export const getTeamMemberTargets = async () => {
    try {
        const token = localStorage.getItem('token');
        console.log("API URL for team targets:", `${API_TARGETS_URL}/team-members`);
        
        // Add timestamp to avoid caching issues
        const timestamp = new Date().getTime();
        const response = await axios.get(`${API_TARGETS_URL}/team-members?_t=${timestamp}`, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Cache-Control': 'no-cache'
            }
        });
        
        console.log("API response for team member targets:", {
            status: response.status,
            dataLength: response.data?.length || 0
        });
        
        // If no data or empty array, return empty array
        if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
            console.log("No team member targets found in API response");
            
            // Try alternative endpoint as fallback
            try {
                console.log("Trying alternative endpoint for team member targets");
                const altResponse = await axios.get(`${API_TARGETS_URL}/team`, {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Cache-Control': 'no-cache'
                    }
                });
                
                if (altResponse.data && Array.isArray(altResponse.data) && altResponse.data.length > 0) {
                    console.log("Found targets from alternative endpoint:", altResponse.data.length);
                    return altResponse.data;
                }
            } catch (altError) {
                console.warn("Alternative endpoint also failed:", altError.message);
            }
            
            return [];
        }
        
        // Process targets to ensure they have all required fields
        const targets = response.data.map(target => {
            // Ensure each target has an ID for debugging
            const targetId = target._id || target.id || 'unknown';
            console.log(`Processing team target ${targetId} with type: ${target.targetType}, amount: ${target.targetAmount}`);
            
            // Prevent null values and ensure proper types
            return {
                ...target,
                _id: targetId,
                targetType: (target.targetType || 'sales').toLowerCase(), // Ensure lowercase for consistent filtering
                targetAmount: parseFloat(target.targetAmount) || 0,
                targetQty: parseFloat(target.targetQty) || 0,
                month: parseInt(target.month) || new Date().getMonth() + 1,
                year: parseInt(target.year) || new Date().getFullYear()
            };
        });
        
        console.log("Processed team targets:", targets.length);
        
        // If we have targets, log a sample for debugging
        if (targets.length > 0) {
            console.log("Sample target:", targets[0]);
        }
        
        return targets;
    } catch (error) {
        console.error('Error fetching team member targets:', error);
        console.error('Error details:', error.response ? error.response.data : 'No response data');
        
        // Try alternative endpoint as fallback
        try {
            console.log("Error with primary endpoint, trying alternative endpoint");
            const token = localStorage.getItem('token');
            const altResponse = await axios.get(`${API_TARGETS_URL}/team`, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (altResponse.data && Array.isArray(altResponse.data)) {
                console.log("Found targets from alternative endpoint after error:", altResponse.data.length);
                return altResponse.data;
            }
        } catch (altError) {
            console.warn("Alternative endpoint also failed:", altError.message);
        }
        
        return [];
    }
};

// Add New Target
export const addTarget = async (targetData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(API_TARGETS_URL, targetData, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Cache-Control': 'no-cache'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error adding target:', error);
        console.error('Error details:', error.response ? error.response.data : 'No response data');
        throw error;
    }
};

// Update Target
export const updateTarget = async (targetId, targetData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.put(`${API_TARGETS_URL}/${targetId}`, targetData, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Cache-Control': 'no-cache'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error updating target:', error);
        console.error('Error details:', error.response ? error.response.data : 'No response data');
        throw error;
    }
};

// Delete Target
export const deleteTarget = async (targetId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.delete(`${API_TARGETS_URL}/${targetId}`, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Cache-Control': 'no-cache'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error deleting target:', error);
        console.error('Error details:', error.response ? error.response.data : 'No response data');
        throw error;
    }
};

/**
 * Get team members for current manager to assign targets
 * This function fetches all team members that the current manager is responsible for
 * @returns {Promise<Array>} Array of team members
 */
export const getTeamMembersForTarget = async () => {
  try {
    console.log('Getting team members for target assignment');
    
    // Get auth token
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      throw new Error('Authentication required');
    }
    
    // Check if user is admin - only admins can set targets
    const decoded = jwtDecode(token);
    if (decoded.role !== 'Admin') {
      throw new Error('Only administrators can view and set targets');
    }
    
    // Get employees for target assignment
    const employeesResponse = await axios.get(`${API_URL}/auth/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
    if (!employeesResponse.data || !Array.isArray(employeesResponse.data)) {
      throw new Error('Failed to fetch employees');
    }
    
    // Filter out team managers - only include regular employees
    const filteredEmployees = employeesResponse.data.filter(employee => 
      employee.role === 'Employee'
    );
    
    console.log(`Found ${filteredEmployees.length} employees for target assignment (excluding team managers)`);
    return filteredEmployees;
    
  } catch (error) {
    console.error('Error in getTeamMembersForTarget:', error);
    throw error;
  }
};

/**
 * Add a target for a team member
 * @param {Object} targetData - The target data to add
 * @returns {Promise<Object>} The added target
 */
export const addTeamMemberTarget = async (targetData) => {
  try {
    console.log('Adding team member target with data:', targetData);
    
    // Validate input
    if (!targetData.employeeId) {
      throw new Error('Employee ID is required');
    }
    
    if (!targetData.type && !targetData.targetType) {
      throw new Error('Target type is required');
    }
    
    if ((!targetData.amount && targetData.amount !== 0) && 
        (!targetData.targetAmount && targetData.targetAmount !== 0)) {
      throw new Error('Target amount is required');
    }
    
    if (!targetData.month) {
      throw new Error('Month is required');
    }
    
    if (!targetData.year) {
      throw new Error('Year is required');
    }
    
    // Get auth token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Check if user is admin - only admins can set targets
    const decoded = jwtDecode(token);
    if (decoded.role !== 'Admin') {
      throw new Error('Only administrators can set targets');
    }
    
    // Standardize the data format
    const formattedData = {
      employeeId: targetData.employeeId,
      targetType: targetData.targetType || targetData.type,
      targetAmount: parseFloat(targetData.targetAmount || targetData.amount),
      month: parseInt(targetData.month, 10),
      year: parseInt(targetData.year, 10),
      // Include who set this target
      setBy: 'admin'
    };
    
    // Add target quantity if needed (fallback to amount if not provided)
    if (targetData.targetQty !== undefined) {
      formattedData.targetQty = parseFloat(targetData.targetQty);
    } else {
      formattedData.targetQty = parseFloat(targetData.targetAmount || targetData.amount);
    }
    
    console.log('Formatted target data for API:', formattedData);
    
    // Make API call
    const response = await axios.post(`${API_TARGETS_URL}`, formattedData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Target added successfully, API response:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('Error in addTeamMemberTarget:', error);
    
    // Create a more helpful error message
    let errorMessage = 'Failed to add target';
    
    if (error.response) {
      // The request was made and the server responded with an error status
      console.error('Response error data:', error.response.data);
      errorMessage = error.response.data.message || `Server error: ${error.response.status}`;
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response from server. Please check your connection';
    } else {
      // Something happened in setting up the request
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Update a team member's target
 * @param {string} targetId - The ID of the target to update
 * @param {Object} targetData - The updated target data
 * @returns {Promise<Object>} The updated target
 */
export const updateTeamMemberTarget = async (targetId, targetData) => {
  try {
    console.log(`Updating target ${targetId} with data:`, targetData);
    
    if (!targetId) {
      throw new Error('Target ID is required');
    }
    
    // Get auth token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Check if user is admin - only admins can update targets
    const decoded = jwtDecode(token);
    if (decoded.role !== 'Admin') {
      throw new Error('Only administrators can update targets');
    }
    
    // Standardize the data format
    const formattedData = {
      employeeId: targetData.employeeId,
      targetType: targetData.targetType || targetData.type,
      targetAmount: parseFloat(targetData.targetAmount || targetData.amount),
      month: parseInt(targetData.month, 10),
      year: parseInt(targetData.year, 10),
      // Include who updated this target
      updatedBy: 'admin'
    };
    
    // Add target quantity if needed
    if (targetData.targetQty !== undefined) {
      formattedData.targetQty = parseFloat(targetData.targetQty);
    }
    
    console.log('Formatted update data for API:', formattedData);
    
    // Make API call
    const response = await axios.put(`${API_TARGETS_URL}/team-members/${targetId}`, formattedData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Target updated successfully, API response:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('Error in updateTeamMemberTarget:', error);
    
    let errorMessage = 'Failed to update target';
    
    if (error.response) {
      console.error('Response error data:', error.response.data);
      errorMessage = error.response.data.message || `Server error: ${error.response.status}`;
    } else if (error.request) {
      errorMessage = 'No response from server. Please check your connection';
    } else {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Delete a team member's target
 * @param {string} targetId - The ID of the target to delete
 * @returns {Promise<Object>} The result of the deletion
 */
export const deleteTeamMemberTarget = async (targetId) => {
  try {
    console.log(`Deleting target ${targetId}`);
    
    if (!targetId) {
      throw new Error('Target ID is required');
    }
    
    // Get auth token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Check if user is admin - only admins can delete targets
    const decoded = jwtDecode(token);
    if (decoded.role !== 'Admin') {
      throw new Error('Only administrators can delete targets');
    }
    
    // Make API call
    const response = await axios.delete(`${API_TARGETS_URL}/team-members/${targetId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Target deleted successfully, API response:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('Error in deleteTeamMemberTarget:', error);
    
    let errorMessage = 'Failed to delete target';
    
    if (error.response) {
      console.error('Response error data:', error.response.data);
      errorMessage = error.response.data.message || `Server error: ${error.response.status}`;
    } else if (error.request) {
      errorMessage = 'No response from server. Please check your connection';
    } else {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};

