const express = require("express");
const router = express.Router();
const propertyManagementController = require("../controllers/PropertyManagementController");
const upload = require("../middleware/upload");

// Rutas para gestión de inmuebles
router.get("/properties", propertyManagementController.getAllProperties);
router.get("/properties/agent/:agentId", propertyManagementController.getPropertiesByAgent);
router.get("/properties/team/:groupId", propertyManagementController.getPropertiesByTeam);
router.get("/properties/:id", propertyManagementController.getPropertyById);
router.post("/properties/save-progress", propertyManagementController.savePropertyProgress);
router.put("/properties/:id", propertyManagementController.updateProperty);
router.patch("/properties/:id/status", propertyManagementController.updatePropertyStatus);
router.delete("/properties/:id", propertyManagementController.deleteProperty);
router.get("/properties/:id/documents", propertyManagementController.getPropertyDocuments);

// Rutas para documentos
router.post("/properties/:id/documents", upload.single("pdf"), propertyManagementController.uploadDocument);
router.get("/documents/:id/file", propertyManagementController.getDocumentFile);
router.delete("/documents/:id", propertyManagementController.deleteDocument);

module.exports = router;