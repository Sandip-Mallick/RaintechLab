import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Select from 'react-select';
import { addTarget, updateTarget } from '@/services/targetService';
import { toast } from 'react-toastify';

const schema = yup.object().shape({
    assignedTo: yup.object().required('Please select a team member'),
    targetType: yup.string().oneOf(['sales', 'order']).required('Target type is required'),
    targetAmount: yup.number()
        .typeError('Please enter a valid number')
        .positive('Target amount must be greater than zero')
        .required('Target amount is required'),
    targetQty: yup.number()
        .typeError('Please enter a valid number')
        .positive('Target quantity must be greater than zero')
        .required('Target quantity is required'),
    month: yup.number().min(1).max(12).required('Month is required'),
    year: yup.number().positive().required('Year is required'),
});

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
    { value: 12, label: 'December' },
];

const targetTypeOptions = [
    { value: 'sales', label: 'Sales Target' },
    { value: 'order', label: 'Order Target' },
];

const TargetForm = ({ target, isEditMode, teamMembers, onSuccess }) => {
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            assignedTo: target?.assignedTo ? teamMembers.find(m => m.value === target.assignedTo) : null,
            targetType: target?.targetType || '',
            targetAmount: target?.targetAmount || '',
            targetQty: target?.targetQty || '',
            month: target?.month || new Date().getMonth() + 1,
            year: target?.year || new Date().getFullYear(),
        },
    });

    const onSubmit = async (data) => {
        try {
            const targetData = {
                assignedTo: data.assignedTo.value,
                assignedToModel: 'User',
                targetType: data.targetType,
                targetAmount: parseFloat(data.targetAmount),
                targetQty: parseInt(data.targetQty),
                month: parseInt(data.month),
                year: parseInt(data.year),
                createdBy: localStorage.getItem('employeeId')
            };

            console.log("Submitting target data:", targetData);

            if (isEditMode) {
                await updateTarget(target._id, targetData);
                toast.success('Target updated successfully');
            } else {
                await addTarget(targetData);
                toast.success('Target added successfully');
            }

            onSuccess();
        } catch (error) {
            console.error('Error saving target:', error);
            toast.error('Failed to save target');
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Team Member</label>
                <Select
                    options={teamMembers}
                    value={watch('assignedTo')}
                    onChange={(option) => setValue('assignedTo', option)}
                    className="mt-1"
                    isDisabled={isEditMode}
                />
                {errors.assignedTo && (
                    <p className="mt-1 text-sm text-red-600">{errors.assignedTo.message}</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Target Type</label>
                <Select
                    options={targetTypeOptions}
                    value={targetTypeOptions.find(option => option.value === watch('targetType'))}
                    onChange={(option) => setValue('targetType', option.value)}
                    className="mt-1"
                />
                {errors.targetType && (
                    <p className="mt-1 text-sm text-red-600">{errors.targetType.message}</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Target Amount</label>
                <input
                    type="number"
                    {...register('targetAmount')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
                {errors.targetAmount && (
                    <p className="mt-1 text-sm text-red-600">{errors.targetAmount.message}</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Target Quantity</label>
                <input
                    type="number"
                    {...register('targetQty')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
                {errors.targetQty && (
                    <p className="mt-1 text-sm text-red-600">{errors.targetQty.message}</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Month</label>
                <Select
                    options={monthOptions}
                    value={monthOptions.find(option => option.value === watch('month'))}
                    onChange={(option) => setValue('month', option.value)}
                    className="mt-1"
                />
                {errors.month && (
                    <p className="mt-1 text-sm text-red-600">{errors.month.message}</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Year</label>
                <input
                    type="number"
                    {...register('year')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
                {errors.year && (
                    <p className="mt-1 text-sm text-red-600">{errors.year.message}</p>
                )}
            </div>

            <div className="flex justify-end space-x-3">
                <button
                    type="button"
                    onClick={() => onSuccess()}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark"
                >
                    {isEditMode ? 'Update' : 'Add'} Target
                </button>
            </div>
        </form>
    );
};

export default TargetForm; 