
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const ensureDirectoryExists = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};


const documentsDir = path.join(__dirname, "../../public/uploads/documents");
ensureDirectoryExists(documentsDir);


const profilesDir = path.join(__dirname, "../../public/uploads/profiles");
ensureDirectoryExists(profilesDir);


const documentsStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, documentsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${uniqueSuffix}-${name}${ext}`);
    },
});


const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, profilesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `profile-${uniqueSuffix}${ext}`);
    },
});


const documentFileFilter = (req: any, file: any, cb: any) => {
    const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "application/vnd.oasis.opendocument.text",
        "application/rtf",
    ];
    
    const allowedExtensions = [".pdf", ".docx", ".doc", ".txt", ".odt", ".rtf"];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`File type not supported. Please upload: ${allowedExtensions.join(", ")}`));
    }
};


const imageFileFilter = (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed"));
    }
};


export const uploadDocument = multer({
    storage: documentsStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, 
    },
    fileFilter: documentFileFilter,
});

export const uploadProfile = multer({
    storage: profileStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, 
    },
    fileFilter: imageFileFilter,
});


export const upload = uploadDocument;