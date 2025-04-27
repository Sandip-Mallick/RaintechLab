// src/pages/Login.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { slideUp, buttonHover } from '@/utils/motionVariants';
import { API_AUTH_URL } from '../config/env';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Loader } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            const { data } = await axios.post(`${API_AUTH_URL}/login`, { email, password });
            localStorage.setItem('token', data.token);
            const { role, _id, id } = data.user;
            
            // Store user role and ID in localStorage for future reference
            localStorage.setItem('userRole', role);
            localStorage.setItem('userId', _id || id);
            
            console.log("Stored user info in localStorage:", {
                role,
                userId: _id || id
            });

            toast.success('Login successful!');
            
            if (role === 'Admin') navigate('/admin/dashboard');
            if (role === 'Employee') navigate('/employee/dashboard');
            if (role === 'Team Manager') navigate('/manager/dashboard');
        } catch (err) {
            console.error('Login failed:', err);
            
            if (err.response) {
                // Server responded with an error
                const errorMsg = err.response.data.msg || 'Login failed';
                const errorDetails = err.response.data.details || '';
                
                toast.error(
                    <div>
                        <div className="font-bold">{errorMsg}</div>
                        {errorDetails && <div className="text-sm">{errorDetails}</div>}
                    </div>
                );
            } else if (err.request) {
                // Request was made but no response received
                toast.error('Could not connect to server. Please check your internet connection.');
            } else {
                // Something happened in setting up the request
                toast.error('An unexpected error occurred. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-background">
            <ToastContainer position="top-right" autoClose={5000} />
            <motion.div 
                initial="hidden"
                animate="visible"
                variants={slideUp}
                className="bg-white p-8 shadow-card rounded-xl w-96"
            >
                <h2 className="text-3xl font-semibold mb-6 text-primary">Login</h2>
                <form onSubmit={handleSubmit}>
                    <input 
                        type="email" 
                        placeholder="Email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 mb-4 border rounded-xl focus:outline-primary"
                        required 
                        disabled={isLoading}
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 mb-4 border rounded-xl focus:outline-primary"
                        required 
                        disabled={isLoading}
                    />
                    <motion.button 
                        type="submit" 
                        className="w-full bg-primary text-white p-3 rounded-xl shadow-button hover:bg-opacity-90 transition flex items-center justify-center"
                        {...buttonHover}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader className="animate-spin mr-2" size={18} />
                                Logging in...
                            </>
                        ) : (
                            'Login'
                        )}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
};

export default Login;
