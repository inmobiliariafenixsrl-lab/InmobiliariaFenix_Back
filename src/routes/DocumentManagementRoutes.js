const express = require("express");
const router = express.Router();
const documentManagementController = require("../controllers/DocumentManagementController");
const { authenticate, authorize } = require("../middleware/loginmiddleware");

// Todas las rutas requieren autenticación
// Solo moderadores y administradores pueden acceder a la gestión de documentos
router.use(authenticate);
router.use(authorize(['moderador', 'administrador', 'team_leader']));

// Obtener inmuebles en revisión
router.get(
  "/en-revision",
  documentManagementController.getPropertiesInReview
);

// Obtener documentos de un inmueble
router.get(
  "/propiedad/:propertyId/documentos",
  documentManagementController.getPropertyDocuments
);

// Obtener archivo de un documento
router.get(
  "/archivo/:documentId",
  documentManagementController.getDocumentFile
);

// Obtener historial de revisiones
router.get(
  "/historial",
  documentManagementController.getReviewHistory
);

// Revisar inmueble completo
router.post(
  "/revisar",
  documentManagementController.submitReview
);

// Aprobar todos los documentos
router.post(
  "/aprobar-todos",
  documentManagementController.approveAllDocuments
);

// Rechazar todos los documentos
router.post(
  "/rechazar-todos",
  documentManagementController.rejectAllDocuments
);
router.get("/propiedad/:propertyId", documentManagementController.getPropertyById);
module.exports = router;