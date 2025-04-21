// src/App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import TeamManagerDashboard from './pages/TeamManagerDashboard';
import SalesManagement from './pages/SalesManagement';
import TargetManagement from './pages/TargetManagement';
import TeamManagement from './pages/TeamManagement';
import PerformanceReports from './pages/PerformanceReports';
import Sidebar from './components/ui/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import EmployeeRoute from './components/EmployeeRoute';
import TeamManagerRoute from './components/TeamManagerRoute';
import MyTargets from './pages/MyTargets';
import MySales from './pages/MySales';
import MyOrders from './pages/MyOrders';
import UserManagement from './pages/UserManagement';
import ClientManagement from './pages/ClientManagement';
import OrderManagement from './pages/OrderManagement';
import TeamMemberTargets from './pages/TeamMemberTargets';
import TeamMembersManagement from './pages/TeamMembersManagement';

const App = () => {
    return (
        <Routes>
            <Route path="/" element={<Login />} />
            
            <Route 
                path="/*" 
                element={
                    <ProtectedRoute>
                        <Sidebar />
                    </ProtectedRoute>
                }
            >
                {/* Admin Routes */}
                <Route path="admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="admin/sales" element={<AdminRoute><SalesManagement /></AdminRoute>} />
                <Route path="admin/orders" element={<AdminRoute><OrderManagement /></AdminRoute>} />
                <Route path="admin/targets" element={<AdminRoute><TargetManagement /></AdminRoute>} />
                <Route path="admin/teams" element={<AdminRoute><TeamManagement /></AdminRoute>} />
                <Route path="admin/user" element={<AdminRoute><UserManagement /></AdminRoute>} />
                <Route path="admin/client" element={<AdminRoute><ClientManagement /></AdminRoute>} />
                <Route path="admin/performance" element={<AdminRoute><PerformanceReports /></AdminRoute>} />
                
                {/* Employee Routes */}
                <Route path="employee/dashboard" element={<EmployeeRoute><EmployeeDashboard /></EmployeeRoute>} />
                <Route path="employee/targets" element={<EmployeeRoute><MyTargets /></EmployeeRoute>} />
                <Route path="employee/sales" element={<EmployeeRoute><MySales /></EmployeeRoute>} />
                <Route path="employee/orders" element={<EmployeeRoute><MyOrders /></EmployeeRoute>} />
                <Route path="employee/performance" element={<EmployeeRoute><PerformanceReports /></EmployeeRoute>} />
                
                {/* Team Manager Routes */}
                <Route path="manager/dashboard" element={<TeamManagerRoute><TeamManagerDashboard /></TeamManagerRoute>} />
                <Route path="manager/team" element={<TeamManagerRoute><TeamMembersManagement /></TeamManagerRoute>} />
                <Route path="manager/targets" element={<TeamManagerRoute><TeamMemberTargets /></TeamManagerRoute>} />
                <Route path="manager/sales" element={<TeamManagerRoute><MySales /></TeamManagerRoute>} />
                <Route path="manager/orders" element={<TeamManagerRoute><MyOrders /></TeamManagerRoute>} />
                <Route path="manager/performance" element={<TeamManagerRoute><PerformanceReports /></TeamManagerRoute>} />
            </Route>
        </Routes>
    );
};

export default App;
