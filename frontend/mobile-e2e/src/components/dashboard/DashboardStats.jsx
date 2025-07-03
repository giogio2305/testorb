import React from 'react';
import StatCard from './StatCard';
import { AppWindowMac, ChartNoAxesCombined, FlaskConical, TabletSmartphone } from 'lucide-react';

const DashboardStats = ({ tests }) => {
  const runningTests = tests.filter(t => t.status === 'running').length;
  const passedTests = tests.filter(t => t.status === 'passed').length;
  const successRate = Math.round((passedTests / tests.length) * 100);

  const stats = [
    {
      icon: <AppWindowMac className='size-6 stroke-emerald-500'/>,
      label: 'Applications',
      value: 0
    },
    {
      icon: <FlaskConical className='size-6 stroke-emerald-500'/>,
      label: 'Tests',
      value: tests.length
    },
    {
      icon: <TabletSmartphone className='size-6 stroke-emerald-500'/>,
      label: 'Emulators',
      value: runningTests
    },
    {
      icon: <ChartNoAxesCombined className='size-6 stroke-emerald-500'/>,
      label: 'Success Rate',
      value: successRate,
      unit: '%'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          icon={stat.icon}
          label={stat.label}
          value={stat.value}
          unit={stat.unit}
        />
      ))}
    </div>
  );
};

export default DashboardStats;