import express from "express";
import { 
    createDocument, 
    getDocumentslist, 
    getSpecificDocument, 
    deleteDocument, 
    updateDocument, 
    generateDownloadLink,
    streamDocumentFromToken,
    searchDocuments, } from "../controllers/document.controller.ts";
import { upload } from "../middlewares/multer.middleware.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts"; 
import { canChangeDocument } from "../middlewares/canChangeDocument.middle.ts";
import { canCreateReadDocument } from "../middlewares/canCreate&ReadDocument.middleware.ts";

const router = express.Router();

router.route("/search").get(verifyJWT, canCreateReadDocument("READ_DOCUMENT"), searchDocuments);

router.route("/").post(verifyJWT, canCreateReadDocument("CREATE_DOCUMENT"), upload.single("file"), createDocument);  
router.route("/").get(verifyJWT, canCreateReadDocument("READ_DOCUMENT"), getDocumentslist); 
router.route("/:id").get(verifyJWT, canCreateReadDocument("READ_DOCUMENT"), getSpecificDocument);
router.route("/:id/metadata").patch(verifyJWT, canChangeDocument("UPDATE_DOCUMENT"), upload.none(), updateDocument); 
router.route("/:id").delete(verifyJWT, canChangeDocument("DELETE_DOCUMENT"), deleteDocument);   


router.route("/:id/download").get(verifyJWT, canCreateReadDocument("READ_DOCUMENT"), generateDownloadLink);
router.route("/download/:token").get(streamDocumentFromToken);

export default router;
