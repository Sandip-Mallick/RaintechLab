// src/pages/PerformanceReports.js
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DataTable from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import Select from 'react-select';
import { getAllSales } from '@/services/salesService';
import { getEmployees } from '@/services/apiService';
import { getAllTeams } from '@/services/teamService';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Loader } from 'lucide-react';
import { slideUp } from '@/utils/motionVariants';

// Function to format month names
const monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
];

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: currentYear - i,
    label: (currentYear - i).toString()
}));

const PerformanceReports = () => {
    const [salesData, setSalesData] = useState([]);
    const [employeeOptions, setEmployeeOptions] = useState([]);
    const [teamOptions, setTeamOptions] = useState([]);
    const [loading, setLoading] = useState(false);

    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedYear, setSelectedYear] = useState(null);

    useEffect(() => {
        fetchReportData();
        fetchEmployeeData();
        fetchTeamData();
    }, []);

    // Fetch Sales Data for Reports
    const fetchReportData = async () => {
        setLoading(true);
        try {
            const sales = await getAllSales();
            setSalesData(sales);
        } catch (error) {
            toast.error('Failed to fetch performance data');
        }
        setLoading(false);
    };

    // Fetch Employees for Filter
    const fetchEmployeeData = async () => {
        const data = await getEmployees();
        setEmployeeOptions(data.map((emp) => ({ value: emp._id, label: emp.name })));
    };

    // Fetch Teams for Filter
    const fetchTeamData = async () => {
        const data = await getAllTeams();
        setTeamOptions(data.map((team) => ({ value: team._id, label: team.teamName })));
    };

    // Filter Sales Data by Month & Year
    const filteredData = salesData.filter((sale) => {
        const saleDate = new Date(sale.date);
        const matchMonth = selectedMonth ? saleDate.getMonth() + 1 === selectedMonth.value : true;
        const matchYear = selectedYear ? saleDate.getFullYear() === selectedYear.value : true;
        return matchMonth && matchYear;
    });

    // Aggregate Data by Month
    const aggregatedData = filteredData.reduce((acc, sale) => {
        const saleMonth = new Date(sale.date).getMonth() + 1;
        const saleYear = new Date(sale.date).getFullYear();
        const key = `${saleMonth}-${saleYear}`;

        if (!acc[key]) {
            acc[key] = {
                month: saleMonth,
                year: saleYear,
                totalSalesAmount: 0,
                totalSalesQty: 0
            };
        }

        acc[key].totalSalesAmount += sale.salesAmount;
        acc[key].totalSalesQty += sale.salesQty;
        return acc;
    }, {});

    // Convert aggregated data to array
    const aggregatedTableData = Object.values(aggregatedData).map(data => {
        // Find the month name from monthOptions
        const monthName = monthOptions.find(option => option.value === data.month)?.label || `Month ${data.month}`;
        return {
            ...data,
            month: monthName, // Replace month number with month name
            totalSalesAmount: Number(data.totalSalesAmount.toFixed(3)) // Limit decimal places to 3
        };
    });

    // Define Columns for DataTable
    const columns = [
        { header: 'Month', accessor: 'month' },
        { header: 'Year', accessor: 'year' },
        { header: 'Total Sales Amount', accessor: 'totalSalesAmount' },
        { header: 'Total Sales Quantity', accessor: 'totalSalesQty' },
    ];

    return (
        <motion.div initial="hidden" animate="visible" className="p-8 bg-background min-h-screen">
            <ToastContainer />

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
                    <Loader className="animate-spin text-primary" size={50} />
                </div>
            )}

            <div className="bg-white p-6 shadow-card rounded-xl mb-8">
                <h2 className="text-2xl font-semibold mb-4">Filter Reports by Month & Year</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Select
                        options={monthOptions}
                        placeholder="Select Month"
                        value={selectedMonth}
                        onChange={setSelectedMonth}
                        isClearable
                    />
                    <Select
                        options={yearOptions}
                        placeholder="Select Year"
                        value={selectedYear}
                        onChange={setSelectedYear}
                        isClearable
                    />
                </div>
            </div>

            <motion.div variants={slideUp} className="mt-8 bg-white p-6 shadow-card rounded-xl">
                <DataTable columns={columns} data={aggregatedTableData} title="Monthly Sales Report" />
            </motion.div>
        </motion.div>
    );
};

export default PerformanceReports;
