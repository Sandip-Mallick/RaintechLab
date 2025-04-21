// src/components/ui/Sidebar.js
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Home, Target, Users, DollarSign, PieChart, 
    LogOut, Menu, X, ClipboardList, User, ShoppingBag
} from 'lucide-react';
import {jwtDecode} from "jwt-decode";
import Header from './Header';

// Lazy load the Header component to reduce initial bundle size
const LazyHeader = lazy(() => import('./Header'));

const Sidebar = () => {
    const [isOpen, setIsOpen] = useState(window.innerWidth >= 768);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isAnimating, setIsAnimating] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Handle responsive behavior with debounce
    useEffect(() => {
        let timeoutId;
        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                const newIsMobile = window.innerWidth < 768;
                setIsMobile(newIsMobile);
                if (newIsMobile) {
                    setIsOpen(false);
                } else if (window.innerWidth >= 1024) {
                    setIsOpen(true);
                }
            }, 200);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);

    // Close sidebar on route change for mobile
    useEffect(() => {
        if (isMobile) {
            setIsOpen(false);
        }
    }, [location.pathname, isMobile]);

    // Memoize toggle function with animation state management
    const toggleSidebar = useCallback(() => {
        if (isAnimating) return; // Prevent multiple toggles during animation
        
        setIsAnimating(true);
        setIsOpen(prev => !prev);
        
        // Reset animation state after animation completes
        setTimeout(() => {
            setIsAnimating(false);
        }, 300); // Match this with animation duration
    }, [isAnimating]);

    // Decode JWT to get user role and permissions - memoized to prevent unnecessary decoding
    const token = useMemo(() => localStorage.getItem('token'), []);
    const userData = useMemo(() => {
        try {
            return token ? jwtDecode(token) : null;
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    }, [token]);
    
    const userRole = useMemo(() => userData?.role, [userData]);
    const userPermissions = useMemo(() => userData?.permissions || 'All Permissions', [userData]);
    
    // Check permission status for specific features
    const hasSalesPermission = useMemo(() => {
        return userPermissions === 'Sales' || 
               userPermissions === 'Sales & Orders' || 
               userPermissions === 'All Permissions';
    }, [userPermissions]);
    
    const hasOrdersPermission = useMemo(() => {
        return userPermissions === 'Orders' || 
               userPermissions === 'Sales & Orders' || 
               userPermissions === 'All Permissions';
    }, [userPermissions]);

    // Logout Functionality
    const handleLogout = useCallback(() => {
        localStorage.removeItem('token');
        navigate('/');
    }, [navigate]);

    // Define Role-Based Links - memoized to prevent recreation
    const adminLinks = useMemo(() => [
        { path: '/admin/dashboard', name: 'Dashboard', icon: <Home /> },
        { path: '/admin/user', name: 'Add Users', icon: <User /> },
        { path: '/admin/sales', name: 'Sales', icon: <DollarSign /> },
        { path: '/admin/orders', name: 'Orders', icon: <ShoppingBag /> },
        { path: '/admin/targets', name: 'Targets', icon: <Target /> },
        { path: '/admin/teams', name: 'Teams', icon: <Users /> },
        { path: '/admin/client', name: 'Client', icon: <Users /> },
        { path: '/admin/performance', name: 'Reports', icon: <PieChart /> },
    ], []);

    // Define employee links based on permissions
    const employeeLinks = useMemo(() => {
        const baseLinks = [
            { path: '/employee/dashboard', name: 'Dashboard', icon: <Home /> },
            { path: '/employee/targets', name: 'Targets', icon: <Target /> },
        ];
        
        // Add Sales link only if user has Sales permission
        if (hasSalesPermission) {
            baseLinks.push({ 
                path: '/employee/sales', 
                name: 'Add Sales', 
                icon: <DollarSign />, 
            });
        }
        
        // Add Orders link only if user has Orders permission
        if (hasOrdersPermission) {
            baseLinks.push({ 
                path: '/employee/orders', 
                name: 'Add Orders', 
                icon: <ShoppingBag />, 
            });
        }
        
        return baseLinks;
    }, [hasSalesPermission, hasOrdersPermission]);

    // Define team manager links based on permissions
    const teamManagerLinks = useMemo(() => {
        const baseLinks = [
            { path: '/manager/dashboard', name: 'Dashboard', icon: <Home /> },
            { path: '/manager/team', name: 'My Team', icon: <Users /> },
            { path: '/manager/targets', name: 'Targets', icon: <Target /> },
            {
                path: '/manager/performance',
                name: 'Team Performance',
                icon: <PieChart />
            }
        ];
        
        return baseLinks;
    }, []);

    const links = useMemo(() => {
        if (userRole === 'Admin') return adminLinks;
        if (userRole === 'Team Manager') return teamManagerLinks;
        return employeeLinks;
    }, [userRole, adminLinks, employeeLinks, teamManagerLinks]);

    // Memoize sidebar class to prevent recalculation
    const sidebarClass = useMemo(() => `
        h-screen bg-white shadow-card p-5 pt-4 
        fixed left-0 top-0
        z-30
        mt-14 md:mt-0
        ${isMobile && !isOpen ? '-translate-x-full' : ''}
    `, [isMobile, isOpen]);

    // Memoize main content class to prevent recalculation
    const mainClass = useMemo(() => `
        flex-1 flex flex-col bg-background overflow-auto
        ${isMobile ? '' : (isOpen ? 'md:ml-[250px]' : 'md:ml-[80px]')}
        pt-16 md:pt-16
    `, [isMobile, isOpen]);

    return (
        <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden">
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isMobile && isOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black bg-opacity-50 z-20"
                        onClick={toggleSidebar}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.div 
                animate={{ 
                    width: isOpen ? '250px' : (isMobile ? '0px' : '80px'),
                    x: isMobile && !isOpen ? '-100%' : 0
                }}
                initial={false}
                transition={{
                    duration: 0.3,
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                }}
                className={sidebarClass}
            >
                {/* Toggle Button */}
                <div className="flex justify-end mb-6">
                    <button 
                        onClick={toggleSidebar}
                        className="bg-primary text-white p-2 rounded-full shadow-button"
                        disabled={isAnimating}
                    >
                        {isOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex flex-col gap-4">
                    {links.map((link, index) => (
                        <NavLink 
                            key={index}
                            to={link.path}
                            onClick={() => isMobile && setIsOpen(false)}
                            className={({ isActive }) => 
                                `flex items-center ${isOpen ? 'gap-3' : 'justify-center'} p-2 rounded-md transition-colors ${
                                    isActive ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'
                                }`
                            }
                        >
                            <div className={`${!isOpen ? 'text-xl' : 'text-lg'}`}>{link.icon}</div>
                            <AnimatePresence mode="wait">
                                {isOpen && (
                                    <motion.span 
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: 'auto' }}
                                        exit={{ opacity: 0, width: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="text-md font-medium whitespace-nowrap overflow-hidden"
                                    >
                                        {link.name}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </NavLink>
                    ))}
                </nav>

                {/* Separator */}
                <div className="border-t my-6"></div>

                {/* Logout Button */}
                <button 
                    onClick={handleLogout} 
                    className={`flex items-center ${isOpen ? 'gap-3' : 'justify-center'} p-2 rounded-md text-red-500 transition hover:bg-red-100 w-full`}
                    disabled={isAnimating}
                >
                    <LogOut className={`${!isOpen ? 'text-xl' : ''}`} />
                    <AnimatePresence mode="wait">
                        {isOpen && (
                            <motion.span 
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                                className="text-md font-medium whitespace-nowrap overflow-hidden"
                            >
                                Logout
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </motion.div>

            {/* Page Content */}
            <motion.main 
                animate={{ 
                    marginLeft: isMobile ? '0px' : (isOpen ? '250px' : '80px')
                }}
                transition={{
                    duration: 0.3,
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                }}
                className={mainClass}
            >
                <Suspense fallback={<div className="h-14 bg-white shadow-md"></div>}>
                    <LazyHeader toggleSidebar={toggleSidebar} isMobile={isMobile} isOpen={isOpen} />
                </Suspense>
                <div className="p-2 sm:p-4 md:p-6 lg:p-8 mt-2">
                    <Outlet />
                </div>
            </motion.main>
        </div>
    );
};

export default Sidebar;