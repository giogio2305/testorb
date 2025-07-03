import React from 'react';

const TestTable = ({ tests = [] }) => {
  const tableHeaders = [
    { id: 'id', label: 'ID' },
    { id: 'title', label: 'Test Name' },
    { id: 'status', label: 'Status' },
    { id: 'device', label: 'Device' },
    { id: 'date', label: 'Date' },
    { id: 'actions', label: 'Actions' }
  ];

  const renderStatus = (status) => (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-medium capitalize leading-tight text-center ${
      status === 'passed' ? 'bg-green-100 text-green-700' : 
      status === 'failed' ? 'bg-red-100 text-red-700' : 
      'bg-amber-100 text-amber-800'
    } gap-2`}>
      {status}
    </span>
  );

  const renderActions = () => (
    <div className="flex gap-2">
      <button className="btn btn-ghost btn-xs">View</button>
      <button className="btn btn-ghost btn-xs">Run</button>
      <div className="dropdown dropdown-end">
        <button tabIndex={0} className="btn btn-ghost btn-xs">···</button>
        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
          <li><a>Delete</a></li>
          <li><a>Export Report</a></li>
          <li><a>Share</a></li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="overflow-x-auto bg-white border rounded-lg shadow">
      <table className="table w-full">
        <thead>
          <tr>
            {tableHeaders.map(header => (
              <th key={header.id} className="bg-gray-50">{header.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tests.length === 0 ? (
            <tr>
              <td colSpan={tableHeaders.length} className="text-center py-8 text-gray-600">
                No tests available
              </td>
            </tr>
          ) : (
            tests.map((test, index) => (
              <tr key={test.id || index} className="hover:bg-gray-50">
                <td>#{test.id || (1242 - index)}</td>
                <td className="font-medium">{test.title}</td>
                <td>{renderStatus(test.status)}</td>
                <td>{test.device}</td>
                <td>{test.date}</td>
                <td>{renderActions()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TestTable;