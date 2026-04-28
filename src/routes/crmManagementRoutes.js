const express = require("express");
const router = express.Router();
const crmManagementController = require("../controllers/crmManagementController");
const { authenticate } = require('../middleware/loginmiddleware');

// Propiedades
router.get("/properties", authenticate, crmManagementController.getProperties);
router.get("/properties/:id", authenticate, crmManagementController.getPropertyById);
router.put("/properties/:id", authenticate, crmManagementController.updateProperty);
router.patch("/properties/:id/price", authenticate, crmManagementController.updatePropertyPrice);

// Ofertas
router.post("/offers", authenticate, crmManagementController.createOffer);
router.patch("/offers/:id/status", authenticate, crmManagementController.updateOfferStatus);

// Agentes
router.get("/agents/:id", authenticate, crmManagementController.getAgentById);

module.exports = router;