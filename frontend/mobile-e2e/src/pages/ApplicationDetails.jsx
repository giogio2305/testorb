import { Tab } from '@headlessui/react';
import {
    FileCheck2,
    FileUp,
    FlaskConical,
    PlayCircle,
    Server,
    Smartphone,
    Sparkles,
    Wand2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import AppInstallSection from '../components/applications/AppInstallSection';
import EmulatorViewer from '../components/applications/EmulatorViewer';
import TestStatusDashboard from '../components/applications/TestStatusDashboard';
import ContainerStatus from '../components/ContainerStatus';
import TestResults from '../components/dashboard/TestResults';
import CreateTestModal from '../components/modals/CreateTestModal';
import CreateTestWithAIModal from '../components/modals/CreateTestWithAIModal';
import EditTestModal from '../components/modals/EditTestModal';
import UploadTestModal from '../components/modals/UploadTestModal';
import axios from '../config/axios';
import {
    useApplicationDetail,
    useApplicationTests,
    useDeleteTest,
    useUpdateTest,
} from '../hooks/useQueryApplications';
import { useAppInstallStatus, useInstallApp } from '../hooks/useQueryEmulator';
import { useCancelJob, useRunTests } from '../hooks/useQueryTests';
import { useSmartEmulator } from '../hooks/useSmartEmulator';
import { testService } from '../services/api'; // Ajouter cette ligne

export default function ApplicationDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    // 🚀 REACT QUERY HOOKS - Remplacement de la gestion d'état manuelle
    const {
        data: application,
        isLoading,
        error,
        refetch: refetchApplication,
    } = useApplicationDetail(id);

    const {
        data: tests = [],
        isLoading: testsLoading,
        refetch: refetchTests,
    } = useApplicationTests(id);

    // ✅ AJOUT DES HOOKS POUR L'INSTALLATION D'APPLICATIONS
    const {
        data: installStatus,
        isLoading: checkingInstallStatus,
        refetch: refetchInstallStatus,
    } = useAppInstallStatus(application?._id, application?.packageName);

    const installAppMutation = useInstallApp();

    // États locaux pour l'interface utilisateur
    const [emulator, setEmulator] = useState({
        running: false,
        loading: false,
        error: null,
        status: 'idle',
    });

    const [currentJobId, setCurrentJobId] = useState(null);
    const [jobLogs, setJobLogs] = useState([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // États pour les modales
    const [isCreateTestModalOpen, setIsCreateTestModalOpen] = useState(false);
    const [isManualTestModalOpen, setIsManualTestModalOpen] = useState(false);
    const [isUploadTestModalOpen, setIsUploadTestModalOpen] = useState(false);
    const [editTestModal, setEditTestModal] = useState({ isOpen: false, test: null });

    // Hooks pour la gestion des tests
    const deleteTestMutation = useDeleteTest();
    const updateTestMutation = useUpdateTest();

    // ✅ REMPLACEMENT DES ÉTATS LOCAUX PAR DES VALEURS DÉRIVÉES
    const isAppInstalled = installStatus?.installed || false;
    const installing = installAppMutation.isPending;
    const checking = checkingInstallStatus;
    const [containersReady, setContainersReady] = useState(false);

    // 🚀 REACT QUERY MUTATIONS
    const runTestsMutation = useRunTests();
    const cancelJobMutation = useCancelJob();

    // Hook pour le suivi du job en cours
    // Remplacer les lignes 83-107 par :

    // État pour le suivi du job en cours (remplace useJobStatus)
    const [jobStatus, setJobStatus] = useState(null);
    const [jobStatusLoading, setJobStatusLoading] = useState(false);

    // Fonction pour récupérer le statut du job
    const fetchJobStatus = useCallback(async () => {
        if (!currentJobId) {
            setJobStatus(null);
            return;
        }

        try {
            setJobStatusLoading(true);
            const response = await axios.get(`/api/jobs/${currentJobId}/status`);
            const data = response.data.data;

            console.log('=== JOB STATUS DEBUG ===');
            console.log('Current Job ID:', currentJobId);
            console.log('Job Status Data:', data);
            console.log('Progress value:', data?.progress);
            console.log('Progress type:', typeof data?.progress);
            console.log('Progress !== undefined:', data?.progress !== undefined);
            console.log('========================');

            setJobStatus(data);

            // Arrêter le polling si le job est terminé
            if (data?.state === 'completed' || data?.state === 'failed') {
                setCurrentJobId(null);
                setRefreshTrigger((prev) => prev + 1);
            }
        } catch (error) {
            console.error('Error fetching job status:', error);
            if (error.response?.status === 404) {
                setCurrentJobId(null);
                setJobStatus(null);
            }
        } finally {
            setJobStatusLoading(false);
        }
    }, [currentJobId]);

    // Effet pour le polling du statut du job
    useEffect(() => {
        let interval = null;

        if (currentJobId) {
            // Premier appel immédiat
            fetchJobStatus();

            // Démarrer le polling toutes les 2 secondes
            interval = setInterval(() => {
                fetchJobStatus();
            }, 2000);
        } else {
            setJobStatus(null);
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [currentJobId, fetchJobStatus]);

    // Nouveau hook pour la gestion intelligente des émulateurs
    const {
        smartStartEmulator,
        smartStopEmulator,
        forceStopEmulator,
        loading: emulatorLoading,
        optimizationStats: emulatorStats,
    } = useSmartEmulator();

    // Ajouter cette fonction après handleActualRunTests
    const handleRunSingleTest = async (testId) => {
        console.log('=== DIAGNOSTIC RUN SINGLE TEST ===');
        console.log('Test ID:', testId);
        console.log('Application._id:', application?._id);
    
        if (!application?._id) {
            toast.error('Application non trouvée');
            return;
        }
    
        try {
            console.log('Calling runSingleTest for test:', testId);
            const result = await testService.runSingleTest(application._id, testId);
    
            if (result?.jobId) {
                setCurrentJobId(result.jobId);
                toast.success(`Test "${result.testFile}" lancé avec succès!`);
            } else {
                console.error('Aucun jobId retourné par le backend');
                toast.error('Erreur lors du lancement du test');
            }
        } catch (error) {
            console.error('Erreur lors du lancement du test:', error);
            toast.error('Erreur lors du lancement du test');
        }
    };

    const handleActualRunTests = async () => {
        console.log('=== DIAGNOSTIC RUN TESTS ===');
        console.log('URL ID:', id);
        console.log('Application:', application);
        console.log('Application._id:', application?._id);
        console.log('Tests length:', tests.length);

        if (!application?._id || tests.length === 0) {
            toast.error('Aucun test disponible pour cette application');
            return;
        }

        try {
            // ✅ CORRECTION : Passer un objet au lieu d'une string
            const requestData = {
                applicationId: application._id,
                tests: tests.map((test) => test._id), // Inclure les IDs des tests
            };

            console.log('Calling runTestsMutation with:', requestData);
            const result = await runTestsMutation.mutateAsync(requestData);

            // Ajouter ce log pour diagnostiquer
            console.log('Réponse de runTests:', result);
            console.log('JobId reçu:', result?.jobId);

            if (result?.jobId) {
                setCurrentJobId(result.jobId);
                toast.success('Tests lancés avec succès!');
            } else {
                console.error('Aucun jobId retourné par le backend');
                toast.error('Erreur: Aucun ID de job retourné');
            }
        } catch (error) {
            console.error('Erreur lors du lancement des tests:', error);
        }
    };

    const cancelCurrentJob = async () => {
        if (!currentJobId) return;

        try {
            await cancelJobMutation.mutateAsync(currentJobId);
            setCurrentJobId(null);
        } catch (error) {
            console.error("Erreur lors de l'annulation:", error);
        }
    };

    // Gestion de l'émulateur (conservée car utilise déjà useSmartEmulator)
    const handleEmulatorAction = async () => {
        if (emulator.running) {
            await handleStopEmulator();
        } else {
            await handleStartEmulator();
        }
    };

    const handleStartEmulator = async () => {
        if (!application?._id) return;

        setEmulator((e) => ({ ...e, loading: true, error: null }));

        try {
            const result = await smartStartEmulator(application._id);
            if (result.success) {
                setEmulator((e) => ({ ...e, running: true, loading: false, status: 'running' }));
                toast.success('Émulateur démarré avec succès');
            }
        } catch (error) {
            setEmulator((e) => ({ ...e, loading: false, error: error.message }));
            toast.error(`Erreur: ${error.message}`);
        }
    };

    const handleStopEmulator = async () => {
        if (!application?._id) return;

        setEmulator((e) => ({ ...e, loading: true }));

        try {
            await smartStopEmulator(application._id);
            setEmulator((e) => ({ ...e, running: false, loading: false, status: 'stopped' }));
            toast.success('Émulateur arrêté avec succès');
        } catch (error) {
            setEmulator((e) => ({ ...e, loading: false, error: error.message }));
            toast.error(`Erreur: ${error.message}`);
        }
    };

    const handleForceStopEmulator = async () => {
        if (!application?._id) return;

        setEmulator((e) => ({ ...e, loading: true }));

        try {
            await forceStopEmulator(application._id);
            setEmulator((e) => ({ ...e, running: false, loading: false, status: 'stopped' }));
            toast.success('Émulateur et conteneurs arrêtés avec succès');
        } catch (error) {
            setEmulator((e) => ({ ...e, loading: false, error: error.message }));
            toast.error(`Erreur lors de l'arrêt forcé: ${error.message}`);
        }
    };

    // Fonctions pour les modales
    const handleOpenCreateTestModal = () => setIsCreateTestModalOpen(true);
    const handleOpenUploadTestModal = () => setIsUploadTestModalOpen(true);
    // Gestionnaires pour les actions sur les tests
    const handleEditTest = (test) => {
        setEditTestModal({ isOpen: true, test });
    };

    const handleDeleteTest = async (testId) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce test ?')) {
            return;
        }

        try {
            await deleteTestMutation.mutateAsync({
                applicationId: application._id,
                testId: testId,
            });
        } catch (error) {
            console.error('Erreur lors de la suppression du test:', error);
        }
    };

    // ✅ FONCTION CORRIGÉE handleCheckApp
    const handleCheckApp = async () => {
        if (!application?.packageName || !application?._id) return;

        try {
            await refetchInstallStatus();
        } catch (error) {
            console.error('Erreur lors de la vérification:', error);
            toast.error("Erreur lors de la vérification de l'installation");
        }
    };

    // ✅ FONCTION CORRIGÉE handleInstallApp
    const handleInstallApp = async () => {
        if (!application?.packageName || !application?._id) return;

        try {
            await installAppMutation.mutateAsync({
                applicationId: application._id,
                packageName: application.packageName,
            });
            // Le hook invalidera automatiquement le cache et rafraîchira le statut
        } catch (error) {
            console.error("Erreur lors de l'installation:", error);
            // L'erreur est déjà gérée par le hook avec un toast
        }
    };

    // 🛡️ GESTION DES ÉTATS DE CHARGEMENT ET D'ERREUR
    if (isLoading) {
        return (
            <div className='flex justify-center items-center min-h-screen'>
                <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500'></div>
                <p className='ml-4 text-gray-600'>Chargement de l'application...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className='flex justify-center items-center min-h-screen'>
                <div className='text-red-500 text-center p-8'>
                    <h2 className='text-xl font-bold mb-2'>❌ Erreur de Chargement</h2>
                    <p className='mb-4'>{error.message || error}</p>
                    <button
                        onClick={() => refetchApplication()}
                        className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
                    >
                        🔄 Réessayer
                    </button>
                </div>
            </div>
        );
    }

    if (!application) {
        return (
            <div className='flex justify-center items-center min-h-screen'>
                <div className='text-gray-500 text-center p-8'>
                    <h2 className='text-xl font-bold mb-2'>🔍 Application Non Trouvée</h2>
                    <p className='mb-4'>
                        L'application avec l'ID{' '}
                        <code className='bg-gray-100 px-2 py-1 rounded'>{id}</code> n'existe pas ou
                        n'a pas pu être chargée.
                    </p>
                    <button
                        onClick={() => navigate('/applications')}
                        className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
                    >
                        ← Retour aux Applications
                    </button>
                </div>
            </div>
        );
    }

    const isTesting = runTestsMutation.isPending || !!currentJobId;

    return (
        <>
            <div className='p-4 w-full mx-auto'>
                <button className='mb-4 btn btn-xs btn-ghost' onClick={() => navigate(-1)}>
                    ← Back
                </button>
                <div className='w-full flex'>
                    {/* Emulator Viewer */}
                    <div className='w-1/2 h-[772px]'>
                        <div className='w-full h-full bg-gray-100'>
                            {!emulator.running && (
                                <div className='flex flex-col items-center justify-center h-full text-gray-400'>
                                    <img
                                        src='https://developer.android.com/images/cluster-illustrations/samples.svg'
                                        alt='Android Developer Sample'
                                        className='size-64 mb-4'
                                    />
                                    Waiting for emulator to start
                                </div>
                            )}
                            {emulator.running && <EmulatorViewer applicationId={id} />}
                        </div>
                    </div>

                    <div className='bg-white shadow p-6 w-1/2'>
                        <div className='w-full flex items-center justify-between mb-2'>
                            <h1 className='text-2xl font-bold mb-2'>{application.name}</h1>
                            <div className='inline-flex items-center space-x-2'>
                                <span className='inline-flex items-center px-3 py-1 bg-white ring-1 ring-gray-100 shadow text-green-700 rounded-full text-xs font-medium capitalize'>
                                    <svg
                                        xmlns='http://www.w3.org/2000/svg'
                                        className='size-4 mr-2'
                                        preserveAspectRatio='xMidYMid'
                                        viewBox='0 0 256 150'
                                    >
                                        <path
                                            fill='#34A853'
                                            d='M255.285 143.47c-.084-.524-.164-1.042-.251-1.56a128.119 128.119 0 0 0-12.794-38.288 128.778 128.778 0 0 0-23.45-31.86 129.166 129.166 0 0 0-22.713-18.005c.049-.08.09-.168.14-.25 2.582-4.461 5.172-8.917 7.755-13.38l7.576-13.068c1.818-3.126 3.632-6.26 5.438-9.386a11.776 11.776 0 0 0 .662-10.484 11.668 11.668 0 0 0-4.823-5.536 11.85 11.85 0 0 0-5.004-1.61 11.963 11.963 0 0 0-2.218.018 11.738 11.738 0 0 0-8.968 5.798c-1.814 3.127-3.628 6.26-5.438 9.386l-7.576 13.069c-2.583 4.462-5.173 8.918-7.755 13.38-.282.487-.567.973-.848 1.467-.392-.157-.78-.313-1.172-.462-14.24-5.43-29.688-8.4-45.836-8.4-.442 0-.879 0-1.324.006-14.357.143-28.152 2.64-41.022 7.12a119.434 119.434 0 0 0-4.42 1.642c-.262-.455-.532-.911-.79-1.367-2.583-4.462-5.173-8.918-7.755-13.38L65.123 15.25c-1.818-3.126-3.632-6.259-5.439-9.386A11.736 11.736 0 0 0 48.5.048 11.71 11.71 0 0 0 43.49 1.66a11.716 11.716 0 0 0-4.077 4.063c-.281.474-.532.967-.742 1.473a11.808 11.808 0 0 0-.365 8.188c.259.786.594 1.554 1.023 2.296a3973.32 3973.32 0 0 1 5.439 9.386c2.53 4.357 5.054 8.713 7.58 13.069 2.582 4.462 5.168 8.918 7.75 13.38.02.038.046.075.065.112A129.184 129.184 0 0 0 45.32 64.38a129.693 129.693 0 0 0-22.2 24.015 127.737 127.737 0 0 0-9.34 15.24 128.238 128.238 0 0 0-10.843 28.764 130.743 130.743 0 0 0-1.951 9.524c-.087.518-.167 1.042-.247 1.56A124.978 124.978 0 0 0 0 149.118h256c-.205-1.891-.449-3.77-.734-5.636l.019-.012Z'
                                        />
                                        <path
                                            fill='#202124'
                                            d='M194.59 113.712c5.122-3.41 5.867-11.3 1.661-17.62-4.203-6.323-11.763-8.682-16.883-5.273-5.122 3.41-5.868 11.3-1.662 17.621 4.203 6.322 11.764 8.682 16.883 5.272ZM78.518 108.462c4.206-6.321 3.46-14.21-1.662-17.62-5.123-3.41-12.68-1.05-16.886 5.27-4.203 6.323-3.458 14.212 1.662 17.622 5.122 3.41 12.683 1.05 16.886-5.272Z'
                                        />
                                    </svg>
                                    {application.platform}
                                </span>
                                <div className='flex gap-2'>
                                    <button
                                        onClick={handleEmulatorAction}
                                        disabled={emulator.loading || emulatorLoading}
                                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                            emulator.running
                                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                                : 'bg-green-600 hover:bg-green-700 text-white'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {emulator.loading || emulatorLoading
                                            ? emulator.running
                                                ? 'Arrêt...'
                                                : 'Démarrage intelligent...'
                                            : emulator.running
                                            ? 'Arrêt intelligent'
                                            : 'Démarrage intelligent'}
                                    </button>

                                    {emulator.running && (
                                        <button
                                            onClick={handleForceStopEmulator}
                                            disabled={emulator.loading || emulatorLoading}
                                            className='px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed'
                                            title="Arrêter l'émulateur et tous les conteneurs"
                                        >
                                            Arrêt forcé
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className='mt-4'>
                            <Tab.Group>
                                <Tab.List className='flex gap-4 border-b-2 border-gray-200 p-0'>
                                    {[
                                        {
                                            id: 'emulator',
                                            name: 'Emulator',
                                            icon: <Smartphone className='size-4 mr-1' />,
                                        },
                                        {
                                            id: 'tests',
                                            name: 'Tests',
                                            icon: <FlaskConical className='size-4 mr-1' />,
                                        },
                                        {
                                            id: 'results',
                                            name: 'Results',
                                            icon: <FileCheck2 className='size-4 mr-1' />,
                                        },
                                        {
                                            id: 'logs',
                                            name: 'Logs',
                                            icon: <Server className='size-4 mr-1' />,
                                        },
                                        {
                                            id: 'assistant',
                                            name: 'Assistant',
                                            icon: <Sparkles className='size-4 mr-1' />,
                                        },
                                    ].map((tab) => (
                                        <Tab
                                            key={tab.id}
                                            className={({ selected }) =>
                                                `w-[100px] inline-flex items-center justify-start px-2 py-1 text-sm/6 font-semibold bg-white focus:outline-none hover:bg-zinc-100 ${
                                                    selected &&
                                                    'border-1 border-b-2 border-blue-500 text-blue-500 hover:bg-zinc-50'
                                                }`
                                            }
                                        >
                                            {tab.icon} {tab.name}
                                        </Tab>
                                    ))}
                                </Tab.List>
                                <Tab.Panels className='mt-2'>
                                    {/* Emulator Tab */}
                                    <Tab.Panel className='rounded-xl bg-white p-3 ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'>
                                        <div className='space-y-4'>
                                            <div className='flex items-center space-x-8'>
                                                <div>
                                                    <h3 className='text-sm font-medium text-gray-900'>
                                                        Package Name
                                                    </h3>
                                                    <p className='mt-2 text-xs text-gray-500'>
                                                        {application.packageName}
                                                    </p>
                                                </div>

                                                <div>
                                                    <div>
                                                        <h3 className='text-sm font-medium text-gray-900'>
                                                            App status
                                                        </h3>
                                                        {!emulator.running && (
                                                            <p className='mt-2 text-xs text-gray-500'>
                                                                Start emulator
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className='mt-2'>
                                                        <AppInstallSection
                                                            isAppInstalled={isAppInstalled}
                                                            installing={installing}
                                                            checking={checking}
                                                            onCheckApp={handleCheckApp}
                                                            onInstallApp={handleInstallApp}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className='mt-2'>
                                                    <ContainerStatus
                                                        onStatusChange={setContainersReady}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </Tab.Panel>

                                    {/* Tests Tab */}
                                    <Tab.Panel className='rounded-xl bg-white p-3 ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'>
                                        {testsLoading ? (
                                            <div className='flex justify-center py-8'>
                                                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
                                            </div>
                                        ) : tests.length === 0 ? (
                                            <div className='text-center py-12'>
                                                <FlaskConical className='mx-auto h-12 w-12 text-gray-400' />
                                                <h3 className='mt-2 text-sm font-semibold text-gray-900'>
                                                    No tests found
                                                </h3>
                                                <p className='mt-1 text-sm text-gray-500'>
                                                    Get started by creating your first test.
                                                </p>
                                                <div className='mt-6 space-x-2'>
                                                    <button
                                                        type='button'
                                                        onClick={handleOpenCreateTestModal}
                                                        disabled={!emulator.running}
                                                        className='btn btn-primary btn-sm inline-flex items-center'
                                                    >
                                                        <Wand2 className='size-4 mr-2' />
                                                        Create Test with AI
                                                    </button>
                                                    <button
                                                        type='button'
                                                        onClick={handleOpenUploadTestModal}
                                                        disabled={!emulator.running}
                                                        className='btn btn-outline btn-primary btn-sm inline-flex items-center'
                                                    >
                                                        <FileUp className='size-4 mr-2' />
                                                        Upload Appium Test
                                                    </button>
                                                </div>
                                                {!emulator.running && (
                                                    <p className='text-xs text-gray-500 mt-2'>
                                                        Emulator must be running to create or upload
                                                        tests.
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className='space-y-6'>
                                                {/* Test Management Header */}
                                                <div className='flex justify-between items-center'>
                                                    <div>
                                                        <h3 className='text-lg font-semibold text-gray-900'>
                                                            Test Management
                                                        </h3>
                                                        <p className='text-sm text-gray-500 mt-1'>
                                                            {tests.length} test
                                                            {tests.length !== 1 ? 's' : ''}{' '}
                                                            available
                                                        </p>
                                                    </div>

                                                    <div className='flex items-center space-x-2'>
                                                        {!emulator.running && (
                                                            <span className='text-xs text-red-600 bg-red-50 px-2 py-1 rounded'>
                                                                ⚠️ Emulator offline
                                                            </span>
                                                        )}
                                                        {!containersReady && emulator.running && (
                                                            <span className='text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded'>
                                                                ⚠️ Containers not ready
                                                            </span>
                                                        )}
                                                        {emulator.running && containersReady && (
                                                            <span className='text-xs text-green-600 bg-green-50 px-2 py-1 rounded'>
                                                                ✅ Ready to test
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className='space-x-2'>
                                                        <button
                                                            type='button'
                                                            onClick={handleOpenCreateTestModal}
                                                            disabled={!emulator.running}
                                                            className='btn btn-primary btn-sm inline-flex items-center'
                                                        >
                                                            <Wand2 className='size-4 mr-0.5' />
                                                            AI TestGen
                                                        </button>
                                                        <button
                                                            type='button'
                                                            onClick={handleOpenUploadTestModal}
                                                            disabled={!emulator.running}
                                                            className='btn btn-outline btn-primary btn-sm inline-flex items-center'
                                                        >
                                                            <FileUp className='size-4 mr-0.5' />
                                                            Test Upload
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Available Tests List */}
                                                <div className='bg-white border rounded-lg overflow-hidden'>
                                                    <div className='flex justify-between bg-gray-50 px-4 py-3 border-b'>
                                                        <h4 className='text-sm font-medium text-gray-900'>
                                                            Available Tests
                                                        </h4>
                                                        <div className='flex items-center space-x-2'>
                                                            <button
                                                                onClick={handleActualRunTests}
                                                                disabled={
                                                                    isTesting ||
                                                                    !emulator.running ||
                                                                    !containersReady
                                                                }
                                                                className='btn btn-success btn-sm inline-flex items-center text-white'
                                                            >
                                                                <PlayCircle className='size-4 mr-0.5' />
                                                                {isTesting
                                                                    ? 'Queueing Tests...'
                                                                    : `Run All Tests`}
                                                            </button>
                                                            {isTesting && currentJobId && (
                                                                <button
                                                                    onClick={cancelCurrentJob}
                                                                    className='btn btn-error btn-sm inline-flex items-center'
                                                                >
                                                                    Cancel
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className='divide-y divide-gray-200'>
                                                        {tests.map((test, index) => (
                                                            <div
                                                                key={test._id || index}
                                                                className='p-4 hover:bg-gray-50'
                                                            >
                                                                <div className='flex items-center justify-between'>
                                                                    <div className='flex-1'>
                                                                        <h5 className='text-sm font-medium text-gray-900'>
                                                                            {test.name}
                                                                        </h5>
                                                                        <p className='text-xs text-gray-500 mt-1 capitalize'>
                                                                            {test.type || 'Appium'}
                                                                        </p>
                                                                    </div>
                                                                    <div className='flex items-center space-x-2'>
                                                                        {/* run test button */}
                                                                        <button
                                                                            onClick={() =>
                                                                                handleRunSingleTest(
                                                                                    test._id
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                isTesting ||
                                                                                !emulator.running ||
                                                                                !containersReady
                                                                            }
                                                                            className='btn btn-outline btn-xs'
                                                                        >
                                                                            {isTesting &&
                                                                            currentJobId
                                                                                ? 'Running...'
                                                                                : 'Run'}
                                                                        </button>

                                                                        <button
                                                                            onClick={() =>
                                                                                handleEditTest(test)
                                                                            }
                                                                            disabled={
                                                                                isTesting ||
                                                                                !emulator.running ||
                                                                                !containersReady
                                                                            }
                                                                            className='btn btn-outline btn-xs'
                                                                        >
                                                                            Edit
                                                                        </button>

                                                                        <button
                                                                            onClick={() =>
                                                                                handleDeleteTest(
                                                                                    test._id
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                deleteTestMutation.isPending
                                                                            }
                                                                            className='btn btn-error btn-xs text-white hover:text-red-100'
                                                                        >
                                                                            Delete test
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Test Status Display */}
                                                {jobStatus && (
                                                    <div className='bg-gray-50 p-4 rounded-lg border'>
                                                        {/* Ajout de logs de diagnostic */}
                                                        {console.log('=== RENDER DEBUG ===')}
                                                        {console.log('jobStatus:', jobStatus)}
                                                        {console.log(
                                                            'jobStatus.progress:',
                                                            jobStatus.progress
                                                        )}
                                                        {console.log(
                                                            'progress !== undefined:',
                                                            jobStatus.progress !== undefined
                                                        )}
                                                        {console.log('==================')}

                                                        <div className='flex items-center justify-between mb-2'>
                                                            <h4 className='text-sm font-medium text-gray-900'>
                                                                Test Execution Status
                                                            </h4>
                                                            {currentJobId && (
                                                                <span className='text-xs text-gray-500'>
                                                                    Job ID: {currentJobId}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Status Badge */}
                                                        <div className='flex items-center space-x-2 mb-3'>
                                                            <span
                                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                    jobStatus.state === 'waiting'
                                                                        ? 'bg-yellow-100 text-yellow-800'
                                                                        : jobStatus.state ===
                                                                          'active'
                                                                        ? 'bg-blue-100 text-blue-800'
                                                                        : jobStatus.state ===
                                                                          'completed'
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : jobStatus.state ===
                                                                          'failed'
                                                                        ? 'bg-red-100 text-red-800'
                                                                        : 'bg-gray-100 text-gray-800'
                                                                }`}
                                                            >
                                                                {jobStatus.state === 'waiting' &&
                                                                    '⏳ Waiting'}
                                                                {jobStatus.state === 'active' &&
                                                                    '🔄 Running'}
                                                                {jobStatus.state === 'completed' &&
                                                                    '✅ Completed'}
                                                                {jobStatus.state === 'failed' &&
                                                                    '❌ Failed'}
                                                                {![
                                                                    'waiting',
                                                                    'active',
                                                                    'completed',
                                                                    'failed',
                                                                ].includes(jobStatus.state) &&
                                                                    jobStatus.state}
                                                            </span>
                                                            {jobStatus.progress !== undefined && (
                                                                <span className='text-sm text-gray-600'>
                                                                    {jobStatus.progress}%
                                                                </span>
                                                            )}
                                                        </div>
                                                        {/* Progress Bar */}
                                                        {jobStatus.progress !== undefined && (
                                                            <div className='w-full bg-gray-200 rounded-full h-2 mb-3'>
                                                                <div
                                                                    className={`h-2 rounded-full transition-all duration-300 ${
                                                                        jobStatus.state ===
                                                                        'completed'
                                                                            ? 'bg-green-600'
                                                                            : jobStatus.state ===
                                                                              'failed'
                                                                            ? 'bg-red-600'
                                                                            : 'bg-blue-600'
                                                                    }`}
                                                                    style={{
                                                                        width: `${jobStatus.progress}%`,
                                                                    }}
                                                                ></div>
                                                            </div>
                                                        )}

                                                        {/* Error Message */}
                                                        {jobStatus.failedReason && (
                                                            <div className='mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700'>
                                                                <strong>Error:</strong>{' '}
                                                                {jobStatus.failedReason}
                                                            </div>
                                                        )}

                                                        {/* Success Message */}
                                                        {jobStatus.state === 'completed' &&
                                                            jobStatus.returnValue && (
                                                                <div className='mb-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700'>
                                                                    <strong>Result:</strong>{' '}
                                                                    {jobStatus.returnValue
                                                                        .message ||
                                                                        'Tests completed successfully'}
                                                                </div>
                                                            )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </Tab.Panel>

                                    {/* Results Tab */}
                                    <Tab.Panel className='rounded-xl bg-white p-3 ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'>
                                        <TestResults
                                            applicationId={application._id}
                                            jobStatus={jobStatus}
                                            refreshTrigger={refreshTrigger}
                                        />
                                    </Tab.Panel>

                                    {/* Logs Tab */}
                                    <Tab.Panel className='rounded-xl bg-white p-3 ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'>
                                        <TestStatusDashboard applicationId={application._id} />
                                    </Tab.Panel>

                                    {/* Assistant Tab */}
                                    <Tab.Panel className='rounded-xl bg-white p-3 ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'>
                                        <div className='text-center py-12'>
                                            <Sparkles className='mx-auto h-12 w-12 text-gray-400' />
                                            <h3 className='mt-2 text-sm font-semibold text-gray-900'>
                                                AI Assistant
                                            </h3>
                                            <p className='mt-1 text-sm text-gray-500'>
                                                AI-powered testing assistance coming soon.
                                            </p>
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
                onTestCreated={(test) => refetchTests()}
                applicationId={application._id}
            />
            <CreateTestModal
                isOpen={isManualTestModalOpen}
                onClose={() => setIsManualTestModalOpen(false)}
                onTestCreated={(test) => refetchTests()}
                applicationId={application._id}
            />
            <UploadTestModal
                isOpen={isUploadTestModalOpen}
                onClose={() => setIsUploadTestModalOpen(false)}
                onTestCreated={(test) => refetchTests()}
                applicationId={application._id}
            />
            <EditTestModal
                isOpen={editTestModal.isOpen}
                setIsOpen={(isOpen) => setEditTestModal({ isOpen, test: null })}
                test={editTestModal.test}
                applicationId={id}
            />
        </>
    );
}
