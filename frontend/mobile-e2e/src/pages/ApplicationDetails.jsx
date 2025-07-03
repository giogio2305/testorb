import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useApplicationStore from '../store/applicationStore';
import ApplicationSkeleton from '../components/applications/ApplicationSkeleton';
import axios from '../config/axios'; // Make sure you have this or use your axios instance
import EmulatorViewer from '../components/applications/EmulatorViewer';
import AppInstallSection from '../components/applications/AppInstallSection';
import { Tab } from '@headlessui/react';
import { ServerCrash, Smartphone, FlaskConical, Server, Sparkles, Wand2, FileUp, PlayCircle } from "lucide-react";

import toast from 'react-hot-toast';
import CreateTestWithAIModal from '../components/modals/CreateTestWithAIModal';
import CreateTestModal from '../components/modals/CreateTestModal';
import UploadTestModal from '../components/modals/UploadTestModal';
import TestStatusDashboard from '../components/applications/TestStatusDashboard';
import ContainerStatus from '../components/ContainerStatus';

export default function ApplicationDetails() {
  const { id } = useParams();
  const fetchApplication = useApplicationStore(state => state.fetchApplication);
  const isLoading = useApplicationStore(state => state.isLoading);
  const error = useApplicationStore(state => state.error);
  const [application, setApplication] = useState(null);
  const navigate = useNavigate();
  const [noVncUrl, setNoVncUrl] = useState(null);
  const [emulator, setEmulator] = useState({ running: false, loading: false, error: null, status: 'idle' });
  const [isAppInstalled, setIsAppInstalled] = useState(null);
  const [installing, setInstalling] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isCreateTestModalOpen, setIsCreateTestModalOpen] = useState(false);
  const [isManualTestModalOpen, setIsManualTestModalOpen] = useState(false);
  const [isUploadTestModalOpen, setIsUploadTestModalOpen] = useState(false);
  const [tests, setTests] = useState([]);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [jobLogs, setJobLogs] = useState([]);
  const [isPollingStatus, setIsPollingStatus] = useState(false);
  const [containersReady, setContainersReady] = useState(false);

  function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
  }

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await fetchApplication(id);
        if (isMounted) setApplication(data);
      } catch (e) {}
    };
    load();
    return () => { isMounted = false; };
  }, [id, fetchApplication]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      setIsPollingStatus(false);
    };
  }, []);

  const handleEmulatorAction = async () => {
    setEmulator(e => ({ ...e, loading: true, error: null }));
    try {
      if (!emulator.running) {
        const res = await axios.post(`/api/emulator/start/${id}`);
        setNoVncUrl(res.data.noVncUrl);
        setEmulator(e => ({ ...e, running: true }));
      } else {
        await axios.delete(`/api/emulator/stop/${id}`);
        setNoVncUrl(null);
        setEmulator(e => ({ ...e, running: false }));
      }
    } catch (e) {
      const message = e?.response?.data?.message || e.message || 'Failed to control emulator';
      setEmulator(em => ({ ...em, error: message }));
      toast.custom((t) => (
        <div className="max-w-xs w-full bg-red-100 text-red-700 px-4 py-3 rounded shadow-lg flex items-center space-x-2" role="alert">
          <ServerCrash className="w-5 h-5 text-red-700"/>
          <span className="block text-sm">{message}</span>
          <button onClick={() => toast.dismiss(t.id)} className="ml-auto hover:text-red-900">✕</button>
        </div>
      ));
    } finally {
      setEmulator(e => ({ ...e, loading: false }));
    }
  };

  useEffect(() => {
    const checkInstalled = async () => {
      if (emulator.running && application?.packageName) {
        try {
          const res = await axios.get(`/api/emulator/is-installed/${id}?package=${application.packageName}`);
          setIsAppInstalled(res.data.installed.installed);
        } catch (e) {
          setIsAppInstalled(null);
        }
      } else {
        setIsAppInstalled(null);
      }
    };
    checkInstalled();
  }, [emulator.running, application, id]);

  useEffect(() => {
    let interval;
    if (emulator.running) {
      setEmulator(e => ({ ...e, status: 'booting' }));
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`/api/emulator/status/${id}`);
          if (res.data.status === 'ready') {
            setEmulator(e => ({ ...e, status: 'ready' }));
            clearInterval(interval);
          }
        } catch {
          setEmulator(e => ({ ...e, status: 'error' }));
        }
      }, 20000);
    } else {
      setEmulator(e => ({ ...e, status: 'idle' }));
    }
    return () => clearInterval(interval);
  }, [emulator.running, id]);

  const handleCheckApp = async () => {
    setChecking(true);
    try {
      const res = await axios.get(`/api/emulator/is-installed/${id}?package=${application.packageName}`);
      setIsAppInstalled(res.data.installed.installed);
      toast.success(res.data.installed.installed ? 'App is installed' : 'App is not installed');
    } catch (e) {
      setIsAppInstalled(null);
      toast.error('Failed to check app status');
    } finally {
      setChecking(false);
    }
  };

  const handleInstallApp = async () => {
    setInstalling(true);
    try {
      const res = await axios.post(`/api/emulator/install/${id}`, { package: application.packageName });
      if (res.data.success) {
        toast.success('App installed successfully!');
        setIsAppInstalled(true);
      } else {
        toast.error(res.data.message || 'App installation failed');
      }
    } catch (e) {
      const errorMessage = e?.response?.data?.error || e?.response?.data?.message || 'App installation failed';
      if (errorMessage.includes('APK file not found')) {
        toast.error('APK file is missing. Please re-upload the application.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleActualRunTests = async () => {
    if (!application || !application._id) {
      toast.error('Application details not loaded yet.');
      return;
    }
    setIsTesting(true);
    toast.loading('Queueing test run...', { id: 'test-run-toast' });
    try {
      const response = await axios.post(`/api/tests/${application._id}/run-tests`);
      const jobId = response.data.jobId;
      setCurrentJobId(jobId);
      setJobStatus({ state: 'waiting', progress: 0 });
      setJobLogs([]);
      setIsPollingStatus(true);
      toast.success(`Test run queued! Job ID: ${jobId}`, { id: 'test-run-toast' });
      
      // Start polling for job status
      pollJobStatus(jobId);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to queue test run.';
      toast.error(message, { id: 'test-run-toast' });
      console.error('Error running tests:', error);
      setIsTesting(false);
    }
  };

  const pollJobStatus = async (jobId) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/jobs/${jobId}/status`);
        const { state, progress, logs, failedReason, returnValue } = response.data.data;
        
        setJobStatus({ state, progress, failedReason, returnValue });
        setJobLogs(logs || []);
        
        // Stop polling if job is completed or failed
        if (state === 'completed' || state === 'failed') {
          clearInterval(pollInterval);
          setIsPollingStatus(false);
          setIsTesting(false);
          
          if (state === 'completed') {
            toast.success('Tests completed successfully!', { id: 'test-run-toast' });
          } else {
            toast.error(`Tests failed: ${failedReason || 'Unknown error'}`, { id: 'test-run-toast' });
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        // Continue polling even if there's an error, unless it's a 404
        if (error.response?.status === 404) {
          clearInterval(pollInterval);
          setIsPollingStatus(false);
          setIsTesting(false);
          toast.error('Job not found', { id: 'test-run-toast' });
        }
      }
    }, 2000); // Poll every 2 seconds
    
    // Stop polling after 10 minutes to prevent infinite polling
    setTimeout(() => {
      clearInterval(pollInterval);
      setIsPollingStatus(false);
      if (isTesting) {
        setIsTesting(false);
        toast.error('Test monitoring timed out', { id: 'test-run-toast' });
      }
    }, 600000); // 10 minutes
  };

  const cancelCurrentJob = async () => {
    if (!currentJobId) return;
    
    try {
      await axios.delete(`/api/jobs/${currentJobId}`);
      setCurrentJobId(null);
      setJobStatus(null);
      setJobLogs([]);
      setIsPollingStatus(false);
      setIsTesting(false);
      toast.success('Test job cancelled');
    } catch (error) {
      toast.error('Failed to cancel job');
    }
  };

  const handleOpenCreateTestModal = () => setIsCreateTestModalOpen(true);
  const handleOpenManualTestModal = () => setIsManualTestModalOpen(true);
  const handleOpenUploadTestModal = () => setIsUploadTestModalOpen(true);

  // Optionally, check APK-DB sync on mount (pseudo-code)
  useEffect(() => {
    // Replace with your actual API for APK-DB sync check
    // setApkSynced(true/false) based on backend response
  }, [id]);

  const handleDeleteTest = async (testId) => {
    if (!application?._id) return;
    try {
      await axios.delete(`/api/applications/${application._id}/tests/${testId}`);
      setTests(tests => tests.filter(t => t._id !== testId));
      toast.success('Test deleted');
    } catch (e) {
      toast.error('Failed to delete test');
    }
  };

  useEffect(() => {
    if (!application?._id) return;
    axios.get(`/api/applications/${application._id}/tests`).then(res => setTests(res.data)).catch(() => setTests([]));
  }, [application]);

  const handleUploadTest = async (file) => {
    const formData = new FormData();
    formData.append('testScript', file);
    try {
      const res = await axios.post(`/api/applications/${application._id}/tests`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setTests(tests => [...tests, res.data]);
      toast.success('Test uploaded');
    } catch (e) {
      toast.error('Failed to upload test');
    }
  };

  if (isLoading) return <ApplicationSkeleton count={1} />;
  if (error) return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="rounded-lg bg-red-50 p-4">
        <h3 className="text-sm font-medium text-red-800">Error</h3>
        <div className="mt-2 text-sm text-red-700">{error.toString()}</div>
        <button className="mt-4 btn btn-ghost" onClick={() => navigate(-1)}>Back</button>
      </div>
    </div>
  );
  if (!application) return null;

  return (
    <>
      <div className="p-4 w-full mx-auto">
        <button className="mb-4 btn btn-xs btn-ghost" onClick={() => navigate(-1)}>← Back</button>
        <div className='w-full flex'>
          {/* Emulator Viewer */}
          <div className="w-1/2 h-[772px]">
            <div className="w-full h-full bg-gray-100">
              {/* show and empty screen when not running */}
              {!emulator.running && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <img 
                    src="https://developer.android.com/images/cluster-illustrations/samples.svg"
                    alt="Android Developer Sample"
                    className="size-64 mb-4"
                  />
                  Waiting for emulator to start
                </div>
              )}
              {/* Only show EmulatorViewer if running */}
              {emulator.running && <EmulatorViewer applicationId={id} />}
            </div>
          </div>
          <div className="bg-white shadow p-6 w-1/2">
            <div className="w-full flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold mb-2">{application.name}</h1>
              <div className='inline-flex items-center space-x-2'>
                <span className="inline-flex items-center px-3 py-1 bg-white ring-1 ring-gray-100 shadow text-green-700 rounded-full text-xs font-medium capitalize">
                  <svg xmlns="http://www.w3.org/2000/svg" className='size-4 mr-2' preserveAspectRatio="xMidYMid" viewBox="0 0 256 150"><path fill="#34A853" d="M255.285 143.47c-.084-.524-.164-1.042-.251-1.56a128.119 128.119 0 0 0-12.794-38.288 128.778 128.778 0 0 0-23.45-31.86 129.166 129.166 0 0 0-22.713-18.005c.049-.08.09-.168.14-.25 2.582-4.461 5.172-8.917 7.755-13.38l7.576-13.068c1.818-3.126 3.632-6.26 5.438-9.386a11.776 11.776 0 0 0 .662-10.484 11.668 11.668 0 0 0-4.823-5.536 11.85 11.85 0 0 0-5.004-1.61 11.963 11.963 0 0 0-2.218.018 11.738 11.738 0 0 0-8.968 5.798c-1.814 3.127-3.628 6.26-5.438 9.386l-7.576 13.069c-2.583 4.462-5.173 8.918-7.755 13.38-.282.487-.567.973-.848 1.467-.392-.157-.78-.313-1.172-.462-14.24-5.43-29.688-8.4-45.836-8.4-.442 0-.879 0-1.324.006-14.357.143-28.152 2.64-41.022 7.12a119.434 119.434 0 0 0-4.42 1.642c-.262-.455-.532-.911-.79-1.367-2.583-4.462-5.173-8.918-7.755-13.38L65.123 15.25c-1.818-3.126-3.632-6.259-5.439-9.386A11.736 11.736 0 0 0 48.5.048 11.71 11.71 0 0 0 43.49 1.66a11.716 11.716 0 0 0-4.077 4.063c-.281.474-.532.967-.742 1.473a11.808 11.808 0 0 0-.365 8.188c.259.786.594 1.554 1.023 2.296a3973.32 3973.32 0 0 1 5.439 9.386c2.53 4.357 5.054 8.713 7.58 13.069 2.582 4.462 5.168 8.918 7.75 13.38.02.038.046.075.065.112A129.184 129.184 0 0 0 45.32 64.38a129.693 129.693 0 0 0-22.2 24.015 127.737 127.737 0 0 0-9.34 15.24 128.238 128.238 0 0 0-10.843 28.764 130.743 130.743 0 0 0-1.951 9.524c-.087.518-.167 1.042-.247 1.56A124.978 124.978 0 0 0 0 149.118h256c-.205-1.891-.449-3.77-.734-5.636l.019-.012Z" /><path fill="#202124" d="M194.59 113.712c5.122-3.41 5.867-11.3 1.661-17.62-4.203-6.323-11.763-8.682-16.883-5.273-5.122 3.41-5.868 11.3-1.662 17.621 4.203 6.322 11.764 8.682 16.883 5.272ZM78.518 108.462c4.206-6.321 3.46-14.21-1.662-17.62-5.123-3.41-12.68-1.05-16.886 5.27-4.203 6.323-3.458 14.212 1.662 17.622 5.122 3.41 12.683 1.05 16.886-5.272Z" /></svg>
                  {application.platform}
                </span>
                <button 
                  className={`btn btn-sm ${emulator.running ? 'bg-red-600' : 'bg-green-600'} text-white`}
                  onClick={handleEmulatorAction}
                  disabled={emulator.loading}
                >
                  {emulator.loading
                    ? (emulator.running ? 'Shutting down...' : 'Starting...')
                    : (emulator.running ? 'Shut down' : 'Start Emulator')}
                </button>
              </div>
            </div>

            <div className="mt-4">
              <Tab.Group>
                <Tab.List className="flex gap-4 border-b-2 border-gray-200 p-0">
                  {[
                    { id: 1, name: 'Details', icon: <Smartphone className='size-5 mr-2' /> },
                    { id: 2, name: 'Tests', icon: <FlaskConical className='size-5 mr-2' /> },
                    { id: 3, name: 'Logs', icon: <Server className='size-5 mr-2' /> },
                    { id: 4, name: 'Assistant', icon: <Sparkles className='size-5 mr-2' /> },
                  ].map((tab) => (
                    <Tab
                      key={tab.id}
                      className={({ selected }) => classNames(
                        'w-[100px] inline-flex items-center justify-start px-2 py-1 text-sm/6 font-semibold bg-white focus:outline-none hover:bg-zinc-100',
                        selected && 'border-1 border-b-2 border-blue-500 text-blue-500 hover:bg-zinc-50'
                      )}
                    >
                      {tab.icon} {tab.name}
                    </Tab>
                  ))}
                </Tab.List>
                <Tab.Panels className="mt-2">
                  {/* Details Tab */}
                  <Tab.Panel
                    className={classNames(
                      'rounded-xl bg-white p-3',
                      'ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'
                    )}
                  >
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Package Name</h3>
                        <p className="mt-1 text-sm text-gray-500">{application.packageName}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Container Status</h3>
                        <div className="mt-2">
                          <ContainerStatus onStatusChange={setContainersReady} />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">App ready</h3>
                      </div>
                      {emulator.running && (
                        <div className="mt-4">
                          <AppInstallSection
                            isAppInstalled={isAppInstalled}
                            installing={installing}
                            checking={checking}
                            onCheckApp={handleCheckApp}
                            onInstallApp={handleInstallApp}
                          />
                        </div>
                      )}
                    </div>
                  </Tab.Panel>

                  {/* Tests Tab */}
                  <Tab.Panel
                    className={classNames(
                      'rounded-xl bg-white p-3',
                      'ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'
                    )}
                  >
                    {tests.length === 0 ? (
                      <div className="text-center py-12">
                        <FlaskConical className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">No tests found</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by creating your first test.</p>
                        <div className="mt-6 space-x-2">
                          <button
                            type="button"
                            onClick={handleOpenCreateTestModal}
                            disabled={!emulator.running}
                            className="btn btn-primary btn-sm inline-flex items-center"
                          >
                            <Wand2 className="size-4 mr-2" />
                            Create Test with AI
                          </button>
                          <button
                            type="button"
                            onClick={handleOpenManualTestModal}
                            disabled={!emulator.running}
                            className="btn btn-outline btn-primary btn-sm inline-flex items-center"
                          >
                            <Wand2 className="size-4 mr-2" />
                            Create Manual Test
                          </button>
                          <button
                            type="button"
                            onClick={handleOpenUploadTestModal}
                            disabled={!emulator.running}
                            className="btn btn-outline btn-primary btn-sm inline-flex items-center"
                          >
                            <FileUp className="size-4 mr-2" />
                            Upload Appium Test
                          </button>
                        </div>
                        {!emulator.running && (
                          <p className="text-xs text-gray-500 mt-2">Emulator must be running to create or upload tests.</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">Your Tests</h3>
                          <div className="space-x-2">
                            <button
                              type="button"
                              onClick={handleOpenCreateTestModal}
                              disabled={!emulator.running}
                              className="btn btn-primary btn-sm inline-flex items-center"
                            >
                              <Wand2 className="size-4 mr-2" />
                              Create Test with AI
                            </button>
                            <button
                              type="button"
                              onClick={handleOpenManualTestModal}
                              disabled={!emulator.running}
                              className="btn btn-outline btn-primary btn-sm inline-flex items-center"
                            >
                              <Wand2 className="size-4 mr-2" />
                              Create Manual Test
                            </button>
                            <button
                              type="button"
                              onClick={handleOpenUploadTestModal}
                              disabled={!emulator.running}
                              className="btn btn-outline btn-primary btn-sm inline-flex items-center"
                            >
                              <FileUp className="size-4 mr-2" />
                              Upload Test
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-4">
                          <button
                            onClick={handleActualRunTests}
                            disabled={isTesting || !emulator.running || !containersReady} 
                            className="btn btn-success btn-sm inline-flex items-center"
                          >
                            <PlayCircle className="size-4 mr-2" />
                            {isTesting ? 'Queueing Tests...' : 'Run All Tests on Emulator'}
                          </button>
                          {isTesting && currentJobId && (
                            <button
                              onClick={cancelCurrentJob}
                              className="btn btn-error btn-sm inline-flex items-center"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                        {!emulator.running && (
                          <p className="text-xs text-gray-500 mt-2">Emulator must be running to run tests.</p>
                        )}
                        {!containersReady && emulator.running && (
                          <p className="text-xs text-amber-600 mt-2">⚠️ Docker containers must be ready before running tests.</p>
                        )}
                        
                        {/* Test Status Display */}
                        {jobStatus && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-gray-900">Test Execution Status</h4>
                              {currentJobId && (
                                <span className="text-xs text-gray-500">Job ID: {currentJobId}</span>
                              )}
                            </div>
                            
                            {/* Status Badge */}
                            <div className="flex items-center space-x-2 mb-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                jobStatus.state === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                                jobStatus.state === 'active' ? 'bg-blue-100 text-blue-800' :
                                jobStatus.state === 'completed' ? 'bg-green-100 text-green-800' :
                                jobStatus.state === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {jobStatus.state === 'waiting' && '⏳ Waiting'}
                                {jobStatus.state === 'active' && '🔄 Running'}
                                {jobStatus.state === 'completed' && '✅ Completed'}
                                {jobStatus.state === 'failed' && '❌ Failed'}
                                {!['waiting', 'active', 'completed', 'failed'].includes(jobStatus.state) && jobStatus.state}
                              </span>
                              {jobStatus.progress !== undefined && (
                                <span className="text-sm text-gray-600">{jobStatus.progress}%</span>
                              )}
                            </div>
                            
                            {/* Progress Bar */}
                            {jobStatus.progress !== undefined && (
                              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    jobStatus.state === 'completed' ? 'bg-green-600' :
                                    jobStatus.state === 'failed' ? 'bg-red-600' :
                                    'bg-blue-600'
                                  }`}
                                  style={{ width: `${jobStatus.progress}%` }}
                                ></div>
                              </div>
                            )}
                            
                            {/* Error Message */}
                            {jobStatus.failedReason && (
                              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                <strong>Error:</strong> {jobStatus.failedReason}
                              </div>
                            )}
                            
                            {/* Success Message */}
                            {jobStatus.state === 'completed' && jobStatus.returnValue && (
                              <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                                <strong>Result:</strong> {jobStatus.returnValue.message || 'Tests completed successfully'}
                              </div>
                            )}
                            
                            {/* Logs */}
                            {jobLogs.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-900 mb-2">Execution Logs</h5>
                                <div className="bg-black text-green-400 p-3 rounded text-xs font-mono max-h-40 overflow-y-auto">
                                  {jobLogs.map((log, index) => (
                                    <div key={index} className="mb-1">
                                      {log}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {!jobStatus && (
                          <div className="mt-4 text-sm text-gray-500">
                            <p>Test results will appear here when you run tests.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Tab.Panel>
                  {/* Logs Tab */}
                  <Tab.Panel
                    className={classNames(
                      'rounded-xl bg-white p-3',
                      'ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'
                    )}
                  >
                    <TestStatusDashboard applicationId={application._id} />
                  </Tab.Panel>
                  
                  {/* Assistant Tab */}
                  <Tab.Panel
                    className={classNames(
                      'rounded-xl bg-white p-3',
                      'ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'
                    )}
                  >
                    <div className="text-center py-12">
                      <Sparkles className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">AI Assistant</h3>
                      <p className="mt-1 text-sm text-gray-500">AI-powered testing assistance coming soon.</p>
                    </div>
                  </Tab.Panel>
                </Tab.Panels>
              </Tab.Group>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal Components */}
      <CreateTestWithAIModal
        isOpen={isCreateTestModalOpen}
        setIsOpen={setIsCreateTestModalOpen}
        onTestCreated={(test) => setTests(tests => [...tests, test])}
        applicationId={application._id}
      />
      <CreateTestModal
        isOpen={isManualTestModalOpen}
        onClose={() => setIsManualTestModalOpen(false)}
        onTestCreated={(test) => setTests(tests => [...tests, test])}
        applicationId={application._id}
      />
      <UploadTestModal
        isOpen={isUploadTestModalOpen}
        onClose={() => setIsUploadTestModalOpen(false)}
        onTestCreated={(test) => setTests(tests => [...tests, test])}
        applicationId={application._id}
      />
    </>
  );
}