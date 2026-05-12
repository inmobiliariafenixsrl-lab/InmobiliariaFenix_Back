const express = require("express");
const router = express.Router();
const acmController = require("../controllers/acmController");
const { authenticate } = require("../middleware/loginmiddleware");

router.use(authenticate);

router.get("/departments", acmController.getDepartments);

module.exports = router;