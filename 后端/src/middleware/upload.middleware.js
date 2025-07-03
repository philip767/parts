const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, process.env.UPLOADS_DIR || 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const txtFileFilter = (req, file, cb) => {
    if (file.mimetype === 'text/plain') {
        cb(null, true);
    } else {
        cb(new Error('Only .txt files are allowed!'), false);
    }
};

const imageFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const MAX_IMAGE_SIZE_MB = 2;
const MAX_TXT_SIZE_MB = 1;

exports.uploadTxt = multer({
    storage,
    fileFilter: txtFileFilter,
    limits: { fileSize: MAX_TXT_SIZE_MB * 1024 * 1024 }
});

exports.uploadImage = multer({
    storage,
    fileFilter: imageFileFilter,
    limits: { fileSize: MAX_IMAGE_SIZE_MB * 1024 * 1024 }
});
