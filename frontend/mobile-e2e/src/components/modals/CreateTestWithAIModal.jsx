import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import axios from '../../config/axios';

export default function CreateTestWithAIModal({ isOpen, setIsOpen, onTestCreated, applicationId }) {
  const [testDescription, setTestDescription] = useState('');
  const [generatedTest, setGeneratedTest] = useState('');
  const [testName, setTestName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const closeModal = () => {
    setIsOpen(false);
    // Reset states when closing
    setTestDescription('');
    setGeneratedTest('');
    setTestName('');
    setIsLoading(false);
    setError(null);
  };

  const handleGenerateTest = async () => {
    if (!testDescription.trim()) {
      setError('Please provide a description for the test.');
      return;
    }
    if (!testName.trim()) {
        setError('Please provide a name for the test.');
        return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedTest(''); // Clear previous generation

    try {
      const response = await axios.post('/api/ai/generate-test', {
        description: testDescription,
        name: testName,
        applicationId
      });
      setGeneratedTest(response.data.testScript);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTest = async () => {
    if (!generatedTest) {
        setError('No test script has been generated or an error occurred.');
        return;
    }
    if (!testName.trim()) {
        setError('Please ensure the test has a name.');
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
        // TODO: API call to save the generatedTest (string) and testName to backend
        // This would be similar to the upload modal's save logic, but with text content
        console.log('Saving test:', { testName, script: generatedTest, applicationId });
        // const response = await fetch('/api/tests', { // Or a more specific endpoint
        // method: 'POST',
        // headers: { 'Content-Type': 'application/json' },
        // body: JSON.stringify({ name: testName, scriptContent: generatedTest, type: 'ai-generated', applicationId }),
        // });
        // if (!response.ok) {
        //     const errData = await response.json();
        //     throw new Error(errData.message || 'Failed to save test');
        // }
        // const savedTest = await response.json();
        // onTestCreated(savedTest); // Callback to update parent component's state

        // Simulate save
        await new Promise(resolve => setTimeout(resolve, 1000));
        onTestCreated({ id: Date.now(), name: testName, type: 'ai-generated' }); // Simulate callback
        closeModal();
    } catch (err) {
        setError(err.message || 'Failed to save the test.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  Create Test with AI
                </Dialog.Title>
                <div className="mt-4">
                  <div className="mb-4">
                    <label htmlFor="testName" className="block text-sm font-medium text-gray-700">
                      Test Name
                    </label>
                    <input
                      type="text"
                      name="testName"
                      id="testName"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="e.g., Login Success Test"
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="testDescription" className="block text-sm font-medium text-gray-700">
                      Describe the test you want to create:
                    </label>
                    <textarea
                      id="testDescription"
                      name="testDescription"
                      rows={4}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="For example: 'Test successful login with username user@example.com and password secret'"
                      value={testDescription}
                      onChange={(e) => setTestDescription(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  {error && (
                    <div className="my-3 p-3 bg-red-100 text-red-700 rounded-md">
                      <p>{error}</p>
                    </div>
                  )}

                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                      onClick={closeModal}
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
                      onClick={handleGenerateTest}
                      disabled={isLoading || !testDescription.trim() || !testName.trim()}
                    >
                      {isLoading && !generatedTest ? 'Generating...' : 'Generate Test Script'}
                    </button>
                  </div>
                </div>

                {generatedTest && (
                  <div className="mt-6">
                    <Dialog.Title
                        as="h4"
                        className="text-md font-medium leading-6 text-gray-900 mb-2"
                    >
                        Generated Test Script (Review and Save)
                    </Dialog.Title>
                    <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-sm">
                      {generatedTest}
                    </pre>
                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            className="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:opacity-50"
                            onClick={handleSaveTest}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Saving...' : 'Save Test'}
                        </button>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}