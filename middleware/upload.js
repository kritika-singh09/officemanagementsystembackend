const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const s3Client = require('../config/aws');

// Check if S3 should be used (if keys are not placeholders)
const isS3Configured = 
  process.env.AWS_ACCESS_KEY && 
  process.env.AWS_ACCESS_KEY !== 'your_aws_access_key_here' &&
  process.env.AWS_SECRET_KEY && 
  process.env.AWS_SECRET_KEY !== 'your_aws_secret_key_here';

let storage;

if (isS3Configured) {
  console.log('☁️  Using AWS S3 for file storage');
  storage = multerS3({
    s3: s3Client,
    bucket: 'kritika-project-storage',
    acl: 'public-read',
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    },
  });
} else {
  console.log('📂  AWS keys not configured. Falling back to LOCAL disk storage.');
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  });
}

const upload = multer({ storage });

module.exports = upload;
