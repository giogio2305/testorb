import React from 'react';
import StatCard from './StatCard';
import { AppWindowMac, ChartNoAxesCombined, FlaskConical, TabletSmartphone } from 'lucide-react';

const DashboardStats = ({ dashboardData }) => {
  if (!dashboardData) return null;

  const stats = [
    {
      icon: <AppWindowMac className='size-6 stroke-emerald-500'/>,
      label: 'Applications',
      value: dashboardData.applications || 0
    },
    {
      icon: <FlaskConical className='size-6 stroke-emerald-500'/>,
      label: 'Tests (30j)',
      value: dashboardData.tests || 0
    },
    {
      icon: <TabletSmartphone className='size-6 stroke-emerald-500'/>,
      label: 'Durée Moy.',
      value: Math.round((dashboardData.avgDuration || 0) / 1000),
      unit: 's'
    },
    {
      icon: <ChartNoAxesCombined className='size-6 stroke-emerald-500'/>,
      label: 'Taux Succès',
      value: dashboardData.successRate || 0,
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