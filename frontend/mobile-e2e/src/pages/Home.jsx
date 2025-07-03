import { useState, useEffect } from 'react';
import LoadingState from '../components/dashboard/LoadingState';
import EmptyState from '../components/dashboard/EmptyState';
import TestTable from '../components/dashboard/TestCard';
import DashboardStats from '../components/dashboard/DashboardStats';
import QuickActions from '../components/dashboard/QuickActions';
import DashboardCharts from '../components/dashboard/DashboardCharts';

const TestList = ({ tests }) => (
  <div className="bg-white border rounded-lg overflow-hidden shadow">
    <div className="bg-gray-50 px-4 py-2 font-medium text-gray-600">
      ID | Test Name | Status | Device | Date | Actions
    </div>
    {tests.map((test, index) => (
      <TestCard 
        key={index}
        id={1242 - index}
        title={test.title}
        status={test.status}
        date={test.date}
        device={test.device}
      />
    ))}
    <div className="bg-gray-50 px-4 py-2 text-blue-500 cursor-pointer hover:underline">
      View All Tests ({tests.length}) →
    </div>
  </div>
);

const PopulatedState = ({ tests }) => (
  <div className="space-y-6">
    <QuickActions />
    <DashboardStats tests={tests} />
    <DashboardCharts 
      passedTests={tests.filter(t => t.status === 'passed').length}
      totalTests={tests.length}
    />
    <TestTable tests={tests} />
  </div>
);

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState([]);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setTests([
        { title: 'Login Flow Test', status: 'passed', date: '2024-02-20', device: 'iPhone 14' },
        { title: 'Checkout Process', status: 'failed', date: '2024-02-19', device: 'Pixel 7' },
        { title: 'User Registration', status: 'running', date: '2024-02-18', device: 'Galaxy S23' },
        { title: 'Payment Integration', status: 'passed', date: '2024-02-17', device: 'Pixel 6' },
        { title: 'Profile Update', status: 'running', date: '2024-02-16', device: 'iPhone 13' },
      ]);
      setLoading(false);
    }, 1500);
  }, []);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {loading ? (
        <LoadingState />
      ) : tests.length === 0 ? (
        <EmptyState />
      ) : (
        <PopulatedState tests={tests} />
      )}
    </div>
  );
}