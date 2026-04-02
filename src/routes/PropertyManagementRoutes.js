// src/routes/PropertyManagementRoutes.js
const express = require("express");
const router = express.Router();
const propertyManagementController = require("../controllers/PropertyManagementController");

// Rutas para gestión de inmuebles
router.get("/properties", propertyManagementController.getAllProperties);
router.get("/properties/agent/:agentId", propertyManagementController.getPropertiesByAgent);
router.get("/properties/:id", propertyManagementController.getPropertyById);
router.post("/properties/save-progress", propertyManagementController.savePropertyProgress);
router.put("/properties/:id", propertyManagementController.updateProperty);
router.patch("/properties/:id/status", propertyManagementController.updatePropertyStatus);
router.delete("/properties/:id", propertyManagementController.deleteProperty);
router.get("/properties/:id/documents", propertyManagementController.getPropertyDocuments);

module.exports = router;