const express = require("express");
const router = express.Router();
const pingController = require("../controllers/pingController");

// Obtener registros de acceso (solo del día actual por defecto)
router.get("/ping", pingController.getPing);

module.exports = router;
