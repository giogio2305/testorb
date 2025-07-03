import React, { useEffect } from 'react';
import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import axios from '../../config/axios'; // Assuming your axios instance is here
import toast from 'react-hot-toast';

export default function UploadTestModal({ isOpen, onClose, applicationId }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [testName, setTestName] = useState('');

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.js')) {
      setSelectedFile(file);
      // Optionally prefill test name from filename (without .js)
      setTestName(file.name.replace(/\.js$/, '')); 
    } else {
      setSelectedFile(null);
      setTestName('');
      toast.error('Please select a JavaScript (.js) file.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a file to upload.');
      return;
    }
    if (!testName.trim()) {
      toast.error('Please enter a name for the test.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('testFile', selectedFile);
    formData.append('testName', testName);
    formData.append('applicationId', applicationId);
    // You might want to add other metadata like 'testType: appium_js'

    try {
      // Replace with your actual API endpoint for uploading tests
      const response = await axios.post(`/api/tests/upload/appium`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success(response.data.message || 'Test uploaded successfully!');
      // TODO: Add logic to update the tests list in ApplicationDetails.jsx
      // e.g., by calling a function passed via props or using a global state manager
      onClose(); // Close modal on success
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload test.');
      console.error('Error uploading test:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Reset state when modal is closed/opened
  useEffect(() => {
    if (!isOpen) {
        setSelectedFile(null);
        setTestName('');
        setIsUploading(false);
    }
  }, [isOpen]);

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
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center"
                >
                  Upload Appium Test File
                  <button
                    type="button"
                    className="p-1 rounded-full hover:bg-gray-200"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </Dialog.Title>
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="testName" className="block text-sm font-medium text-gray-700">
                      Test Name
                    </label>
                    <input
                      type="text"
                      name="testName"
                      id="testName"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      className="mt-1 block w-full input input-bordered"
                      placeholder="e.g., Login Flow Test"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">
                      Test File (.js only)
                    </label>
                    <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
                      <div className="space-y-1 text-center">
                        <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer rounded-md bg-white font-medium text-emerald-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-2 hover:text-emerald-500"
                          >
                            <span>Upload a file</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".js" onChange={handleFileChange} />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">JavaScript up to 10MB</p>
                        {selectedFile && (
                          <p className="text-sm text-gray-700 mt-2">Selected: {selectedFile.name}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-2">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={onClose}
                      disabled={isUploading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isUploading || !selectedFile || !testName.trim()}
                    >
                      {isUploading ? (
                        <>
                          <span className="loading loading-spinner loading-sm mr-2"></span>
                          Uploading...
                        </>
                      ) : (
                        'Upload Test'
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
}