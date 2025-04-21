// src/components/ProtectedRoute.js
import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";

const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    
    // Memoize token validation to prevent unnecessary re-renders
    const isValid = useMemo(() => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('No token found in localStorage');
                return false;
            }
            
            const decoded = jwtDecode(token);
            const currentTime = Date.now() / 1000;
            
            if (!decoded.exp) {
                console.log('Token has no expiration');
                return false;
            }
            
            if (decoded.exp <= currentTime) {
                console.log('Token expired');
                localStorage.removeItem('token'); // Clean up expired token
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Token validation error:', error);
            localStorage.removeItem('token'); // Clean up invalid token
            return false;
        }
    }, [location.pathname]);
    
    return isValid ? children : <Navigate to="/" state={{ from: location }} replace />;
};

export default ProtectedRoute;
