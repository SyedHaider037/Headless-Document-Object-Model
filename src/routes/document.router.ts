import express from "express";
import { 
    createDocument, 
    getDocumentslist, 
    getSpecificDocument, 
    deleteDocument, 
    updateDocument, 
    generateDownloadLink,
    streamDocumentFromToken,
    searchDocuments,
    grantPermission,
    revokePermission } from "../controllers/document.controller.ts";
import { upload } from "../middlewares/multer.middleware.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts"; 
import { checkAdminRole } from "../middlewares/checkRole.middleware.ts";

const router = express.Router();

router.route("/search").get(verifyJWT, searchDocuments);

router.route("/").post(verifyJWT, upload.single("file"), createDocument);  
router.route("/").get(verifyJWT, getDocumentslist); 
router.route("/:id").get(verifyJWT, getSpecificDocument);
router.route("/:id/metadata").patch(verifyJWT, upload.none(), updateDocument); 
router.route("/:id").delete(verifyJWT, deleteDocument);   

router.route("/:id/permissions").post(verifyJWT, checkAdminRole, grantPermission);
router.route("/:id/permissions/:userId").delete(verifyJWT, checkAdminRole, revokePermission);

router.route("/:id/download").get(verifyJWT, generateDownloadLink);
router.route("/download/:token").get(streamDocumentFromToken);

export default router;
