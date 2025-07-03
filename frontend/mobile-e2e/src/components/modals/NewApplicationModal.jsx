import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Transition, Listbox } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import useApplicationStore from '../../store/applicationStore';

const NewApplicationModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    platform: 'android',
    file: null
  });
  
  const { createApplication, isLoading, error, resetError } = useApplicationStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const newApplication = await createApplication(formData);
      onClose();
      navigate('/applications', { state: { newApplication } });
    } catch (error) {
      // Error is handled by the store
    }
  };

  // Reset error when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      resetError();
    }
  }, [isOpen, resetError]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all">
                <Dialog.Title as="div" className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">New Application</h2>
                  <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 rounded-full p-1 hover:bg-gray-100"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="text-red-500 text-sm rounded-md p-2 bg-red-50">
                      {error}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Application Name
                    </label>
                    <input
                      type="text"
                      required
                      className="input input-bordered w-full"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      className="textarea textarea-bordered w-full"
                      rows="3"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Platform
                    </label>
                    <Listbox
                      value={formData.platform}
                      onChange={(value) => setFormData({ ...formData, platform: value })}
                    >
                      <div className="relative">
                        <Listbox.Button className="select select-bordered w-full">
                          {formData.platform === 'android' ? 'Android' : 'iOS'}
                        </Listbox.Button>
                        <Listbox.Options className="absolute mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-10">
                          <Listbox.Option
                            value="android"
                            className={({ active }) =>
                              `${active ? 'bg-primary text-white' : 'text-gray-900'}
                              cursor-pointer select-none relative py-2 pl-3 pr-9`
                            }
                          >
                            Android
                          </Listbox.Option>
                          <Listbox.Option
                            value="ios"
                            disabled
                            className="text-gray-400 cursor-not-allowed select-none relative py-2 pl-3 pr-9"
                          >
                            iOS
                          </Listbox.Option>
                        </Listbox.Options>
                      </div>
                    </Listbox>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload Application
                    </label>
                    <input
                      type="file"
                      required
                      accept=".apk,.ipa"
                      className="file-input file-input-bordered w-full"
                      onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
                    />
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn btn-ghost"
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <span className="loading loading-spinner loading-sm"></span>
                          Creating...
                        </>
                      ) : (
                        'Create Application'
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default NewApplicationModal;