import React from 'react';

const StatCard = ({ icon, label, value, unit = '' }) => (
  <div className="flex flex-col bg-white border rounded-lg p-3 text-left shadow">
    <h4 className='text-sm my-1 text-zinc-900 font-normal'>
    {label}
    </h4>
    <div className='inline-flex items-center justify-start'>
    {icon}
    <h2 className="text-2xl mx-4 text-zinc-600">
      {value}{unit}
    </h2>
    </div>

  </div>
);

export default StatCard;