export const queryKeys = {
  // Dashboard
  dashboard: ['dashboard'],
  dashboardData: () => [...queryKeys.dashboard, 'data'],
  recentTests: (params) => [...queryKeys.dashboard, 'recent-tests', params],
  
  // Applications
  applications: ['applications'],
  applicationsList: () => [...queryKeys.applications, 'list'],
  applicationDetail: (id) => [...queryKeys.applications, 'detail', id],
  applicationTests: (id) => [...queryKeys.applications, 'tests', id],
  
  // Tests
  tests: ['tests'],
  testResults: (applicationId, params) => [...queryKeys.tests, 'results', applicationId, params],
  testMetrics: (applicationId, params) => [...queryKeys.tests, 'metrics', applicationId, params],
  jobStatus: (jobId) => [...queryKeys.tests, 'job-status', jobId],
  
  // Emulator
  emulator: ['emulator'],
  emulatorStatus: (applicationId) => [...queryKeys.emulator, 'status', applicationId],
  appInstallStatus: (applicationId, packageName) => [...queryKeys.emulator, 'app-install', applicationId, packageName],
  emulatorHealth: () => [...queryKeys.emulator, 'health'],
  
  // Containers
  containers: ['containers'],
  containerStatus: () => [...queryKeys.containers, 'status'],
};

// Helper function pour invalider des groupes de queries
export const invalidateQueries = {
  dashboard: (queryClient) => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  applications: (queryClient) => queryClient.invalidateQueries({ queryKey: queryKeys.applications }),
  tests: (queryClient) => queryClient.invalidateQueries({ queryKey: queryKeys.tests }),
  emulator: (queryClient) => queryClient.invalidateQueries({ queryKey: queryKeys.emulator }),
  containers: (queryClient) => queryClient.invalidateQueries({ queryKey: queryKeys.containers }),
};