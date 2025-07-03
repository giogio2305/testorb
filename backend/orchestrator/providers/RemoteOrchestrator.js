const axios = require('axios');
const { BaseOrchestrator } = require('../orchestrator');
const config = require('../../config/orchestrator.config');

class RemoteOrchestrator extends BaseOrchestrator {
    constructor() {
        super();
        this.railwayApi = axios.create({
            baseURL: 'https://backboard.railway.app/graphql/v2',
            headers: {
                'Project-Access-Token': config.remote.projectToken, // Use your project token here
                'Content-Type': 'application/json'
            }
        });
    }

    async startEmulator(applicationId) {
        const serviceName = `android-emulator-${applicationId}`;
        
        try {
            // Check if service already exists
            const existingService = await this.getService(serviceName);
            
            if (existingService) {
                const deployment = await this.deployService(existingService.id);
                return {
                    vncUrl: `https://${deployment.domain}:6080/?autoconnect=true`,
                    serviceId: existingService.id,
                    deploymentId: deployment.id,
                    mode: 'remote'
                };
            }
            
            // Create new service
            const service = await this.createService(serviceName);
            const deployment = await this.deployService(service.id);
            
            return {
                vncUrl: `https://${deployment.domain}:6080/?autoconnect=true`,
                serviceId: service.id,
                deploymentId: deployment.id,
                mode: 'remote'
            };
            
        } catch (error) {
            console.error('Failed to start remote emulator:', error);
            throw error;
        }
    }

    async createService(serviceName) {
        const mutation = `
            mutation {
                serviceCreate(input: {
                    name: "${serviceName}"
                    source: {
                        image: "budtmo/docker-android:emulator_11.0"
                    }
                    variables: [
                        { key: "DEVICE", value: "Samsung Galaxy S10" },
                        { key: "WEB_VNC", value: "true" },
                        { key: "APPIUM", value: "true" }
                    ]
                }) {
                    id
                    name
                }
            }
        `;
        const response = await this.railwayApi.post('', { query: mutation });
        return response.data.data.serviceCreate;
    }

    async deployService(serviceId) {
        const mutation = `
            mutation {
                serviceInstanceDeploy(serviceId: "${serviceId}") {
                    id
                    url
                }
            }
        `;
        
        const response = await this.railwayApi.post('', { query: mutation });
        return response.data.data.serviceInstanceDeploy;
    }

    async getService(serviceName) {
        const query = `
            query {
                services(where: { name: "${serviceName}" }) {
                    edges {
                        node {
                            id
                            name
                        }
                    }
                }
            }
        `;
        
        const response = await this.railwayApi.post('', { query });
        const services = response.data.data.services.edges;
        return services.length > 0 ? services[0].node : null;
    }
}

module.exports = RemoteOrchestrator;