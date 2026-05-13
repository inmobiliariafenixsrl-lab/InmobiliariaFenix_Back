const express = require("express");
const router = express.Router();
const acmController = require("../controllers/acmController");
const { authenticate } = require("../middleware/loginmiddleware");

router.use(authenticate);

router.post("/calculate-value", acmController.calculateValue)
router.get("/departments", acmController.getDepartments);
router.get("/zones/:idmunicipio", acmController.getZonesByMunicipio);

module.exports = router;