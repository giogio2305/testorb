const { Queue } = require('bullmq');

const testQueue = new Queue('test-queue', {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
    },
});

module.exports = { testQueue };
