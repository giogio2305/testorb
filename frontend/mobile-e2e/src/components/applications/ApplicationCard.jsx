import { Smartphone } from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Link } from 'react-router-dom';

const ApplicationCard = ({ application }) => {
  if (!application) return null;
  
  return (
    <div className="bg-white rounded-lg shadow hover:shadow-xs transition-shadow p-4 border border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-emerald-50 p-2 rounded-xl">
            <Smartphone className="size-5 stroke-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{application.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{application.description}</p>
          </div>
        </div>
        <Menu as="div" className="relative">
          <Menu.Button className="p-2 hover:bg-gray-50 rounded-full">
            <svg className="w-5 h-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </Menu.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                <Menu.Item>
                  {({ active }) => (
                    <Link
                    to={`/applications/${application._id}`}
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } block px-4 py-2 text-sm text-gray-700 w-full text-left`}
                    >
                      View Details
                    </Link>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } block px-4 py-2 text-sm text-red-700 w-full text-left hover:bg-red-50`}
                      onClick={() => {
                        // TODO: Implémenter la logique de suppression
                        console.log('Delete project:', application._id);
                      }}
                    >
                      Delete Project
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-blue-50 text-blue-800">
            {application.platform}
          </span>
          <span className="text-gray-500">
            Created {new Date(application.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ApplicationCard;