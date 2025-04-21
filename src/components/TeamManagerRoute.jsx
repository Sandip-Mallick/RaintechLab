import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";

const TeamManagerRoute = ({ children }) => {
    const location = useLocation();
    
    // Memoize role check to prevent unnecessary re-renders
    const isTeamManager = useMemo(() => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('No token found for team manager check');
                return false;
            }
            
            const decoded = jwtDecode(token);
            if (!decoded || !decoded.role) {
                console.log('Token missing role information');
                return false;
            }
            
            const { role } = decoded;
            
            // Base check for team manager role
            if (role !== 'Team Manager') {
                return false;
            }
            
            // Check path to block sales and orders pages for team managers
            const path = location.pathname;
            
            // Block access to sales and orders pages
            if (path === '/manager/sales' || path === '/manager/orders') {
                console.log('Team Manager route restricted for this path');
                return false;
            }
            
            // For all other team manager routes, allow access
            return true;
            
        } catch (error) {
            console.error('Team Manager route validation error:', error);
            return false;
        }
    }, [location.pathname]);
    
    return isTeamManager ? children : <Navigate to="/" state={{ from: location }} replace />;
};

export default TeamManagerRoute; 