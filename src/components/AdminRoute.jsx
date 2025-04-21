// src/components/AdminRoute.jsx
import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";

const AdminRoute = ({ children }) => {
    const location = useLocation();
    
    // Memoize role check to prevent unnecessary re-renders
    const isAdmin = useMemo(() => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('No token found for admin check');
                return false;
            }
            
            const decoded = jwtDecode(token);
            if (!decoded || !decoded.role) {
                console.log('Token missing role information');
                return false;
            }
            
            return decoded.role === 'Admin';
        } catch (error) {
            console.error('Admin route validation error:', error);
            return false;
        }
    }, [location.pathname]);
    
    return isAdmin ? children : <Navigate to="/" state={{ from: location }} replace />;
};

export default AdminRoute;
