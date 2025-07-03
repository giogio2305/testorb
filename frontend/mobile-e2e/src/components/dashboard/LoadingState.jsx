import React from 'react';

const LoadingState = () => (
  <div className="w-full space-y-4 p-4">
    <div className="skeleton h-8 w-1/3"></div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <div className="skeleton h-4 w-3/4"></div>
            <div className="skeleton h-16"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default LoadingState;