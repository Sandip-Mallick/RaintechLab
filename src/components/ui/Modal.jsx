// src/components/ui/Modal.js
import React from 'react';
import { motion } from 'framer-motion';

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="bg-white p-6 rounded-xl shadow-card w-96"
            >
                <h2 className="text-2xl font-semibold mb-4">{title}</h2>
                <div className="mb-4">{children}</div>
                <button 
                    onClick={onClose} 
                    className="w-full bg-red-500 text-white p-2 rounded-xl mt-4"
                >
                    Close
                </button>
            </motion.div>
        </div>
    );
};

export default Modal;
