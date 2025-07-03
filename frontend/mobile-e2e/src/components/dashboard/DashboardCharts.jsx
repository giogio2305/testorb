import React from 'react';

const DashboardCharts = ({ passedTests, totalTests }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="bg-white border rounded-lg p-4 shadow">
      <h3 className="font-medium mb-2">Test Results (30 days)</h3>
      <div>Pass: {passedTests}  Fail: {totalTests - passedTests}</div>
    </div>
    <div className="bg-white border rounded-lg p-4 shadow">
      <h3 className="font-medium mb-2">Test Duration Trend</h3>
      <div>📈 Avg: 4m 23s</div>
    </div>
  </div>
);

export default DashboardCharts;