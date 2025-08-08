import axios from '../config/axios';

// Dashboard Services
export const dashboardService = {
    getDashboardData: () => axios.get('/api/dashboard/stats').then((res) => res.data),
    getRecentTests: (params) =>
        axios.get('/api/dashboard/recent-activity', { params }).then((res) => res.data),
};

// Application Services
export const applicationService = {
    getApplications: () => axios.get('/api/applications/list').then((res) => res.data),
    getApplication: (id) => axios.get(`/api/applications/list/${id}`).then((res) => res.data),
    createApplication: (data) =>
        axios.post('/api/applications/create', data).then((res) => res.data),
    deleteApplication: (id) => axios.delete(`/api/applications/${id}`).then((res) => res.data),
    getApplicationTests: (id) => axios.get(`/api/applications/${id}/tests`).then((res) => res.data),
    uploadTest: (id, formData) =>
        axios
            .post(`/api/applications/${id}/tests`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            .then((res) => res.data),
    deleteTest: (applicationId, testId) =>
        axios.delete(`/api/applications/${applicationId}/tests/${testId}`).then((res) => res.data),
    updateTest: (applicationId, testId, data) =>
        axios
            .put(`/api/applications/${applicationId}/tests/${testId}`, data)
            .then((res) => res.data),
};

// Test Services
export const testService = {
    getTestResults: (applicationId, params) =>
        axios
            .get(`/api/applications/${applicationId}/test-results`, { params })
            .then((res) => res.data),
    getTestMetrics: (applicationId, params) =>
        axios
            .get(`/api/applications/${applicationId}/test-metrics`, { params })
            .then((res) => res.data),
    runTests: (data) =>
        axios
            .post(`/api/applications/${data.applicationId}/run-tests`, data)
            .then((res) => res.data),
    runSingleTest: (applicationId, testId) =>
        axios
            .post(`/api/applications/${applicationId}/run-single-test`, { testId })
            .then((res) => res.data),
    getJobStatus: (jobId) => axios.get(`/api/jobs/${jobId}/status`).then((res) => res.data),
    cancelJob: (jobId) => axios.delete(`/api/jobs/${jobId}`).then((res) => res.data),
};

// Emulator Services
export const emulatorService = {
    startEmulator: (applicationId) =>
        axios.post(`/api/emulator/start/${applicationId}`).then((res) => res.data),
    stopEmulator: (applicationId) =>
        axios.post(`/api/emulator/stop/${applicationId}`).then((res) => res.data),
    getEmulatorStatus: (applicationId) =>
        axios.get(`/api/emulator/status/${applicationId}`).then((res) => res.data),
    checkAppInstalled: (applicationId, packageName) =>
        axios
            .get(`/api/emulator/is-installed/${applicationId}?package=${packageName}`)
            .then((res) => res.data),
    installApp: (applicationId, packageName) =>
        axios
            .post(`/api/emulator/install/${applicationId}`, { package: packageName })
            .then((res) => res.data),
};

// Container Services
export const containerService = {
    smartStart: (services = null) =>
        axios.post('/api/containers/smart-start', { services }).then((res) => res.data),
    getEmulatorHealth: () => axios.get('/api/containers/emulator-health').then((res) => res.data),
};

// AI Services
export const aiService = {
    generateTest: (data) => axios.post('/api/ai/generate-test', data).then((res) => res.data),
    modifyTest: (data) => axios.post('/api/ai/modify-test', data).then((res) => res.data),
};
