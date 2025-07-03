const ApplicationSkeleton = ({ count = 3 }) => (
  <div className="p-6 max-w-7xl mx-auto">
    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <div className="skeleton h-8 w-1/3 mb-4"></div>
            <div className="skeleton h-4 w-3/4 mb-2"></div>
            <div className="skeleton h-16"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ApplicationSkeleton;