const { S3Client } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');

dotenv.config();

let s3Client;

try {
  s3Client = new S3Client({
    region: 'ap-south-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY || 'dummy',
      secretAccessKey: process.env.AWS_SECRET_KEY || 'dummy',
    },
    // Prevent immediate validation crash
    maxAttempts: 1
  });
} catch (err) {
  console.error('❌ AWS S3 Client Initialization Failed:', err.message);
  s3Client = null;
}

module.exports = s3Client;
