const express = require("express");
const router = express.Router();
const crmManagementController = require("../controllers/crmManagementController");
const { authenticate } = require('../middleware/loginmiddleware');

// Propiedades
router.get("/properties", authenticate, crmManagementController.getProperties);
router.get("/properties/:id", authenticate, crmManagementController.getPropertyById);
router.put("/properties/:id", authenticate, crmManagementController.updateProperty);
router.patch("/properties/:id/price", authenticate, crmManagementController.updatePropertyPrice);
router.get("/properties/:id/offers", authenticate, crmManagementController.getOffers);
router.get("/properties/:id/timeline", authenticate, crmManagementController.getTimeline);
router.get("/properties/:id/price-changes", authenticate, crmManagementController.getPriceChanges);

// Ofertas
router.post("/offers", authenticate, crmManagementController.createOffer);
router.patch("/offers/:id/status", authenticate, crmManagementController.updateOfferStatus);

// Timeline
router.post("/timeline", authenticate, crmManagementController.addTimelineEvent);

// Agentes
router.get("/agents", authenticate, crmManagementController.getAgents);
router.get("/agents/:id", authenticate, crmManagementController.getAgentById);

// Datos completos
router.get("/full-data", authenticate, crmManagementController.getFullCRMData);

module.exports = router;