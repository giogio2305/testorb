import { Smartphone, Plus } from 'lucide-react';

const EmptyState = ({ onCreateNew }) => (
  <div className="mt-8 text-center rounded-lg border-2 border-dashed border-gray-300 p-12">
    <Smartphone className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-lg font-medium text-gray-900">No applications</h3>
    <p className="mt-1 text-sm text-gray-500">Get started by creating your first application.</p>
    <div className="mt-6">
      <button
        type="button"
        onClick={onCreateNew}
        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
      >
        <Plus className="size-4 mr-2" />
        New Application
      </button>
    </div>
  </div>
);

export default EmptyState;