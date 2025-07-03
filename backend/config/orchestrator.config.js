module.exports = {
    mode: process.env.ORCHESTRATOR_MODE || 'local', // 'local' or 'remote'
    local: {
        dockerHost: 'unix:///var/run/docker.sock', // or 'npipe:////./pipe/docker_engine' on Windows
        network: 'mobile-e2e_default'
    },
    remote: {
        provider: process.env.REMOTE_PROVIDER || 'railway', // 'railway', 'render', 'fly'
        apiKey: process.env.REMOTE_API_KEY,
        prjectToken: process.env.REMOTE_PROJECT_TOKEN || '501903e3-ec7c-497b-928a-075f2a27d319',
        region: process.env.REMOTE_REGION || 'us-west1',
        containerRegistry: process.env.CONTAINER_REGISTRY || 'ghcr.io'
    }
};