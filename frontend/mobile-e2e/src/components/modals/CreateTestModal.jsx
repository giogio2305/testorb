import React, { useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";

export default function CreateTestModal({ isOpen, onClose, onTestCreated, applicationId }) {
  const [testName, setTestName] = useState("");
  const [testScript, setTestScript] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSaveTest = async () => {
    if (!testName.trim() || !testScript.trim()) {
      setError("Please provide both a test name and script.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      // TODO: Replace with actual API call to save the test
      // Example:
      // const response = await fetch('/api/tests', { ... })
      // onTestCreated(response.data)
      await new Promise(resolve => setTimeout(resolve, 1000));
      onTestCreated({ id: Date.now(), name: testName, script: testScript, type: "manual" });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save the test.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setTestName("");
    setTestScript("");
    setError(null);
    setIsSaving(false);
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Create Manual Test
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
                      onChange={e => setTestName(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                      placeholder="e.g., Login Success Test"
                      disabled={isSaving}
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="testScript" className="block text-sm font-medium text-gray-700">
                      Test Script (JavaScript)
                    </label>
                    <textarea
                      id="testScript"
                      name="testScript"
                      rows={10}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm font-mono"
                      placeholder={"// Write your Appium test script here\n"}
                      value={testScript}
                      onChange={e => setTestScript(e.target.value)}
                      disabled={isSaving}
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
                      onClick={handleClose}
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-50"
                      onClick={handleSaveTest}
                      disabled={isSaving || !testName.trim() || !testScript.trim()}
                    >
                      {isSaving ? "Saving..." : "Save Test"}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}