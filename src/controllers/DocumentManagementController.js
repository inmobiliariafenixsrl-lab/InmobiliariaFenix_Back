const documentManagementService = require("../services/DocumentManagementService");

class DocumentManagementController {
  async getPropertiesInReview(req, res) {
    try {
      const properties = await documentManagementService.getPropertiesInReview();
      res.json(properties);
    } catch (error) {
      console.error("Error in getPropertiesInReview:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async getPropertyDocuments(req, res) {
    try {
      const { propertyId } = req.params;
      const documents = await documentManagementService.getPropertyDocuments(propertyId);
      res.json(documents);
    } catch (error) {
      console.error("Error in getPropertyDocuments:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async getReviewHistory(req, res) {
    try {
      const history = await documentManagementService.getReviewHistory(
        req.user.idagente, 
        req.user.rol
      );
      res.json(history);
    } catch (error) {
      console.error("Error in getReviewHistory:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async submitReview(req, res) {
    try {
      const { propertyId, status, observation, documents } = req.body;
      const reviewerId = req.user.idagente;
      
      await documentManagementService.submitReview(
        propertyId,
        status,
        observation,
        reviewerId,
        documents
      );
      
      res.json({ success: true, message: "Revisión completada exitosamente" });
    } catch (error) {
      console.error("Error in submitReview:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async approveAllDocuments(req, res) {
    try {
      const { propertyId, observation } = req.body;
      const reviewerId = req.user.idagente;
      
      await documentManagementService.approveAllDocuments(propertyId, reviewerId, observation);
      
      res.json({ success: true, message: "Todos los documentos aprobados exitosamente" });
    } catch (error) {
      console.error("Error in approveAllDocuments:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async rejectAllDocuments(req, res) {
    try {
      const { propertyId, observation } = req.body;
      const reviewerId = req.user.idagente;
      
      if (!observation || observation.trim() === "") {
        return res.status(400).json({ error: "La observación es requerida" });
      }
      
      await documentManagementService.rejectAllDocuments(propertyId, reviewerId, observation);
      
      res.json({ success: true, message: "Todos los documentos rechazados exitosamente" });
    } catch (error) {
      console.error("Error in rejectAllDocuments:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new DocumentManagementController();