// src/components/ui/Header.js
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, User, ChevronRight, Loader, Menu } from 'lucide-react';
import { getUserProfile } from '@/services/apiService';

const Header = ({ toggleSidebar, isMobile, isOpen }) => {
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Map routes to display names - memoized to prevent re-creation
    const routeNames = useMemo(() => ({
        // Admin routes
        '/admin/dashboard': 'Admin Dashboard',
        '/admin/sales': 'Sales Management',
        '/admin/orders': 'Orders Management',
        '/admin/targets': 'Targets Management',
        '/admin/teams': 'Team Management',
        '/admin/user': 'User Management',
        '/admin/client': 'Client Management',
        '/admin/performance': 'Performance Reports',
        
        // Employee routes
        '/employee/dashboard': 'Employee Dashboard',
        '/employee/targets': 'Targets Management',
        '/employee/sales': 'Sales Management',
        '/employee/orders': 'Orders Management',
        '/employee/performance': 'My Performance',
        
        // Team Manager routes
        '/manager/dashboard': 'Team Manager Dashboard',
        '/manager/targets': 'Targets Management',
        '/manager/sales': 'Sales Management',
        '/manager/orders': 'Orders Management',
        '/manager/performance': 'Team Performance',
    }), []);

    // Get the current route name - memoized to prevent recalculation
    const currentRoute = useMemo(() => 
        routeNames[location.pathname] || 'Sales Tracker CRM',
        [location.pathname, routeNames]
    );

    // Fetch user profile only once on component mount
    useEffect(() => {
        let isMounted = true;
        
        const fetchUserProfile = async () => {
            try {
                setIsLoading(true);
                const profileData = await getUserProfile();
                if (isMounted) {
                    setUser(profileData);
                }
            } catch (error) {
                console.error('Failed to fetch user profile', error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchUserProfile();
        
        return () => {
            isMounted = false;
        };
    }, []);

    // Memoize the header class to prevent recalculation
    const headerClass = useMemo(() => `
        flex items-center justify-between p-2 sm:p-3 md:p-4 bg-white shadow-md
        fixed top-0 z-50
        ${!isMobile ? (isOpen ? 'md:left-[250px]' : 'md:left-[80px]') : 'left-0'}
        right-0
        w-auto
    `, [isMobile, isOpen]);

    return (
        <motion.header 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={headerClass}
        >
            {/* Mobile Hamburger Icon */}
            {isMobile && (
                <button 
                    onClick={toggleSidebar}
                    className="mr-3 bg-primary text-white p-2 rounded-full shadow-button"
                >
                    <Menu size={20} />
                </button>
            )}
            
            {/* Logo and Page Title */}
            <div className="flex items-center gap-2 md:gap-3">
                <div className="bg-primary text-white p-1 md:p-2 rounded-md">
                    <Loader size={isMobile ? 16 : 20} />
                </div>
                <div className="flex flex-col md:flex-row md:items-center md:gap-2">
                    <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-primary truncate max-w-[150px] sm:max-w-xs md:max-w-md">
                        {currentRoute}
                    </h1>
                    <div className="hidden md:flex items-center gap-1 text-gray-500">
                        <ChevronRight />
                        <span>{user?.role}</span>
                    </div>
                </div>
            </div>

            {/* User Info & Notifications */}
            <div className="flex items-center gap-2 md:gap-4">
                {/* Notifications */}
                <div className="relative">
                    <Bell className="text-gray-600 cursor-pointer" size={isMobile ? 18 : 20} />
                </div>

                {/* User Profile */}
                <div className="flex items-center gap-1 md:gap-2">
                    <User className="text-gray-600" size={isMobile ? 18 : 20} />
                    <span className="text-sm md:text-md font-medium text-gray-700 truncate max-w-[80px] sm:max-w-[120px] md:max-w-full">
                        {user?.name || 'User'}
                    </span>
                </div>
            </div>

            {/* Notification Dropdown */}
            {notifications.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-10 top-14 bg-white shadow-lg rounded-lg p-4 w-60 z-50"
                >
                    <h3 className="text-lg font-semibold mb-2">Notifications</h3>
                    <ul className="space-y-2">
                        {notifications.map((notification) => (
                            <li 
                                key={notification.id} 
                                className={`p-2 rounded-md transition-colors cursor-pointer 
                                ${notification.type === 'info' ? 'bg-blue-50' : 
                                   notification.type === 'warning' ? 'bg-yellow-50' : 
                                   'bg-green-50'}`}
                            >
                                {notification.message}
                            </li>
                        ))}
                    </ul>
                </motion.div>
            )}
        </motion.header>
    );
};

export default Header;
