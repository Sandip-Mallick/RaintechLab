// src/components/EmployeeRoute.jsx
import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";

const EmployeeRoute = ({ children }) => {
    const location = useLocation();
    
    // Memoize role check to prevent unnecessary re-renders
    const isEmployee = useMemo(() => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('No token found for employee check');
                return false;
            }
            
            const decoded = jwtDecode(token);
            if (!decoded || !decoded.role) {
                console.log('Token missing role information');
                return false;
            }
            
            return decoded.role === 'Employee';
        } catch (error) {
            console.error('Employee route validation error:', error);
            return false;
        }
    }, [location.pathname]);
    
    return isEmployee ? children : <Navigate to="/" state={{ from: location }} replace />;
};

export default EmployeeRoute;
