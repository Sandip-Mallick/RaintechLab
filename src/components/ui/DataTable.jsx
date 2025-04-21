// src/components/ui/DataTable.js
import React from 'react';
import { motion } from 'framer-motion';
import { slideUp, buttonHover } from '@/utils/motionVariants';
import Button from './Button';
import { Plus } from 'lucide-react';

const DataTable = ({ columns, data, title, onAddClick }) => {
    return (
        <motion.div className="p-6 bg-white shadow-card rounded-xl">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">{title}</h2>
                {onAddClick && (
                    <motion.div {...buttonHover}>
                        <Button onClick={onAddClick} className="bg-accent">
                            <Plus size={18} className="mr-1 inline-block" /> Add {title}
                        </Button>
                    </motion.div>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-200">
                        <tr>
                            {columns.map((col, index) => (
                                <th key={index} className="p-3 text-left font-semibold text-gray-700">
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                                {columns.map((col, colIndex) => (
                                    <td key={colIndex} className="p-3 border-t text-gray-600">
                                        {col.render ? col.render(row) : row[col.accessor]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
};

export default DataTable;

