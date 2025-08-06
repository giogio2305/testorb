import { AlertCircle, Database, TestTube } from 'lucide-react';
import DashboardCharts from '../components/dashboard/DashboardCharts';
import DashboardStats from '../components/dashboard/DashboardStats';
import LoadingState from '../components/dashboard/LoadingState';
import QuickActions from '../components/dashboard/QuickActions';
import useAuthStore from '../store/authStore';
import { useDashboardData, useRecentTests, useRefreshDashboard } from '../hooks/useQueryDashboard';

const EmptyTestsTable = () => (
    <div className='bg-white border rounded-lg overflow-hidden shadow'>
        <div className='p-8 text-center'>
            <TestTube className='w-12 h-12 text-gray-400 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-gray-900 mb-2'>Aucun test récent</h3>
            <p className='text-gray-500 mb-4'>
                Aucun test n'a été exécuté récemment. Commencez par uploader une application et
                lancer vos premiers tests.
            </p>
        </div>
    </div>
);

const ErrorState = ({ error, onRetry }) => (
    <div className='bg-white border border-red-200 rounded-lg p-6 shadow'>
        <div className='flex items-center justify-center mb-4'>
            <AlertCircle className='w-12 h-12 text-red-500' />
        </div>
        <div className='text-center'>
            <h3 className='text-lg font-medium text-gray-900 mb-2'>Erreur de chargement</h3>
            <p className='text-gray-600 mb-4'>
                {error || 'Une erreur est survenue lors du chargement des données du dashboard.'}
            </p>
            <button
                onClick={onRetry}
                className='inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors'
            >
                Réessayer
            </button>
        </div>
    </div>
);

const GlobalEmptyState = () => (
    <div className='text-center py-12'>
        <Database className='w-16 h-16 text-gray-400 mx-auto mb-4' />
        <h2 className='text-2xl font-bold text-gray-900 mb-2'>Bienvenue sur votre Dashboard</h2>
        <p className='text-gray-600 mb-6 max-w-md mx-auto'>
            Votre plateforme de test mobile est prête ! Commencez par uploader votre première
            application pour démarrer les tests.
        </p>
        <button className='inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium'>
            📱 Uploader une application
        </button>
    </div>
);

const TestList = ({ tests, loading, error }) => {
    if (loading) {
        return (
            <div className='bg-white border rounded-lg overflow-hidden shadow'>
                <div className='p-4'>
                    <div className='animate-pulse space-y-3'>
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className='flex items-center space-x-4'>
                                <div className='h-4 bg-gray-200 rounded w-1/4'></div>
                                <div className='h-4 bg-gray-200 rounded w-20'></div>
                                <div className='h-4 bg-gray-200 rounded w-1/3'></div>
                                <div className='h-4 bg-gray-200 rounded w-16'></div>
                                <div className='h-4 bg-gray-200 rounded w-24'></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className='bg-white border border-red-200 rounded-lg p-4 shadow'>
                <div className='text-center py-6'>
                    <AlertCircle className='w-8 h-8 text-red-500 mx-auto mb-2' />
                    <p className='text-red-600 text-sm'>Erreur lors du chargement des tests</p>
                </div>
            </div>
        );
    }

    if (!tests || tests.length === 0) {
        return <EmptyTestsTable />;
    }

    return (
        <div className='bg-white border rounded-lg overflow-hidden shadow'>
            <div className='bg-gray-50 px-4 py-2 font-medium text-gray-600'>Tests récents</div>
            {tests.map((test, index) => (
                <div
                    key={test.id || index}
                    className='px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors'
                >
                    <div className='flex items-center justify-between'>
                        <div className='flex-1'>
                            <h4 className='font-medium text-gray-900'>
                                {test.testName || 'Test sans nom'}
                            </h4>
                            <p className='text-sm text-gray-500'>
                                {test.application?.name || 'Application inconnue'}
                            </p>
                        </div>
                        <div className='flex items-center space-x-4 text-sm'>
                            <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    test.status === 'passed'
                                        ? 'bg-green-100 text-green-800'
                                        : test.status === 'failed'
                                        ? 'bg-red-100 text-red-800'
                                        : test.status === 'running'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                }`}
                            >
                                {test.status || 'unknown'}
                            </span>
                            <span className='text-gray-500'>
                                {test.duration ? `${Math.round(test.duration / 1000)}s` : '-'}
                            </span>
                            <span className='text-gray-500'>
                                {test.executedAt
                                    ? new Date(test.executedAt).toLocaleDateString('fr-FR')
                                    : '-'}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const DashboardContent = ({ dashboardData, recentTests, onRefresh, isRefreshing }) => (
    <div className='space-y-6'>
        <QuickActions onRefresh={onRefresh} isRefreshing={isRefreshing} />
        <DashboardStats dashboardData={dashboardData} />
        <DashboardCharts 
            passedTests={dashboardData?.successRate} 
            totalTests={dashboardData?.tests} 
        />
        <TestList tests={recentTests} />
    </div>
);

export default function Home() {
    const { isAuthenticated } = useAuthStore();
    
    // Hooks React Query
    const {
        data: dashboardData,
        isLoading: isDashboardLoading,
        error: dashboardError,
        refetch: refetchDashboard
    } = useDashboardData();
    
    const {
        data: recentTests,
        isLoading: isTestsLoading,
        error: testsError
    } = useRecentTests({ limit: 10 });
    
    const refreshDashboard = useRefreshDashboard();
    
    // Fonction de rafraîchissement unifiée
    const handleRefresh = async () => {
        await refreshDashboard.mutateAsync();
    };
    
    // États combinés
    const isLoading = isDashboardLoading || isTestsLoading;
    const error = dashboardError || testsError;
    const isRefreshing = refreshDashboard.isPending;
    
    // Pas d'authentification
    if (!isAuthenticated) {
        return null;
    }
    
    // État de chargement
    if (isLoading) {
        return (
            <div className='p-4 max-w-7xl mx-auto'>
                <LoadingState />
            </div>
        );
    }
    
    // État d'erreur
    if (error) {
        return (
            <div className='p-4 max-w-7xl mx-auto'>
                <ErrorState 
                    error={error?.message || 'Erreur de chargement'} 
                    onRetry={refetchDashboard} 
                />
            </div>
        );
    }
    
    // État vide (pas d'applications/tests)
    if (!dashboardData || (dashboardData.applications === 0 && dashboardData.tests === 0)) {
        return (
            <div className='p-4 max-w-7xl mx-auto'>
                <GlobalEmptyState />
            </div>
        );
    }
    
    // Contenu principal
    // Dans le return de Home :
    return (
        <div className='p-4 max-w-7xl mx-auto'>
            <DashboardContent 
                dashboardData={dashboardData}
                recentTests={recentTests}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
            />
        </div>
    );
}
