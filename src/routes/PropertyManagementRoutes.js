const express = require("express");
const router = express.Router();
const propertyManagementController = require("../controllers/PropertyManagementController");
const upload = require("../middleware/upload");
const { authenticate } = require('../middleware/loginmiddleware');

router.use(authenticate);

router.get('/departments', propertyManagementController.getUbications);

// Rutas para gestión de inmuebles
router.get("/", propertyManagementController.getAllProperties);
router.get("/agent/:agentId", propertyManagementController.getPropertiesByAgent);
router.get("/team/:groupId", propertyManagementController.getPropertiesByTeam);
router.get("/:id", propertyManagementController.getPropertyById);
router.post("/save-progress", propertyManagementController.savePropertyProgress);
router.put("/:id", propertyManagementController.updateProperty);
router.patch("/:id/status", propertyManagementController.updatePropertyStatus);
router.delete("/:id", propertyManagementController.deleteProperty);
router.get("/:id/documents", propertyManagementController.getPropertyDocuments);

// Rutas para documentos
router.post("/:id/documents", upload.single("pdf"), propertyManagementController.uploadDocument);
router.get("/documents/:id/file", propertyManagementController.getDocumentFile);
router.delete("/documents/:id", propertyManagementController.deleteDocument);

// Rutas para agentes
router.get("/agentes/all-active", propertyManagementController.getAllActiveAgentes);
router.get("/agentes/by-group/:groupId", propertyManagementController.getAgentesByGroup);
router.get("/agentes/:id", propertyManagementController.getAgenteById);

module.exports = router;