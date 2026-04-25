const documentManagementService = require("../services/DocumentManagementService");

class DocumentManagementController {
  async getPropertiesInReview(req, res) {
    try {
      const user = req.user;
      const properties = await documentManagementService.getPropertiesInReview(user);
      res.json(properties);
    } catch (error) {
      console.error("Error in getPropertiesInReview:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async getPropertyById(req, res) {
    try {
      const { propertyId } = req.params;
      const property = await documentManagementService.getPropertyById(propertyId);
      res.json(property);
    } catch (error) {
      console.error("Error in getPropertyById:", error);
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

  async getDocumentFile(req, res) {
    try {
      const { documentId } = req.params;
      const { fileBuffer, fileName, mimeType } = await documentManagementService.getDocumentFile(documentId);
      
      res.setHeader('Content-Type', mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${fileName || `documento_${documentId}.pdf`}"`);
      res.send(fileBuffer);
    } catch (error) {
      console.error("Error in getDocumentFile:", error);
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
      
      const result = await documentManagementService.approveAllDocuments(propertyId, reviewerId, observation);
      
      // Retornar también la URL de Gmail para abrir en el frontend
      res.json({ 
        success: true, 
        message: result.message,
        emailData: result.emailData,
        propertyTitle: result.propertyTitle
      });
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