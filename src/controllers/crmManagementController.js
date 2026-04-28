const crmManagementService = require("../services/crmManagementService");

const getProperties = async (req, res) => {
  try {
    const { status, agentId, type } = req.query;
    const filters = { status, agentId, type };
    
    const properties = await crmManagementService.getProperties(filters);
    
    res.json({
      success: true,
      data: properties
    });
  } catch (error) {
    console.error("Error en getProperties:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

const getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const property = await crmManagementService.getPropertyById(id);
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Propiedad no encontrada"
      });
    }
    
    res.json({
      success: true,
      data: property
    });
  } catch (error) {
    console.error("Error en getPropertyById:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const property = await crmManagementService.updateProperty(id, updateData);
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Propiedad no encontrada"
      });
    }
    
    res.json({
      success: true,
      message: "Propiedad actualizada exitosamente",
      data: property
    });
  } catch (error) {
    console.error("Error en updateProperty:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

const updatePropertyPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPrice, reason } = req.body;
    const userId = req.user?.id || 1;
    
    if (!newPrice) {
      return res.status(400).json({
        success: false,
        message: "El nuevo precio es requerido"
      });
    }
    
    const property = await crmManagementService.updatePropertyPrice(id, newPrice, reason, userId);
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Propiedad no encontrada"
      });
    }
    
    res.json({
      success: true,
      message: "Precio actualizado exitosamente",
      data: property
    });
  } catch (error) {
    console.error("Error en updatePropertyPrice:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

const createOffer = async (req, res) => {
  try {
    const offerData = req.body;
    
    if (!offerData.propertyId || !offerData.amount || !offerData.offeredBy) {
      return res.status(400).json({
        success: false,
        message: "Datos incompletos: se requiere propertyId, amount y offeredBy"
      });
    }
    
    const offer = await crmManagementService.createOffer(offerData);
    
    res.status(201).json({
      success: true,
      message: "Oferta creada exitosamente",
      data: offer
    });
  } catch (error) {
    console.error("Error en createOffer:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

const updateOfferStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, propertyId } = req.body;
    
    if (!status || !propertyId) {
      return res.status(400).json({
        success: false,
        message: "Se requiere status y propertyId"
      });
    }
    
    const offer = await crmManagementService.updateOfferStatus(id, propertyId, status);
    
    res.json({
      success: true,
      message: "Estado de oferta actualizado exitosamente",
      data: offer
    });
  } catch (error) {
    console.error("Error en updateOfferStatus:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

const getAgentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const agent = await crmManagementService.getAgentById(id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agente no encontrado"
      });
    }
    
    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error("Error en getAgentById:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

module.exports = {
  getProperties,
  getPropertyById,
  updateProperty,
  updatePropertyPrice,
  createOffer,
  updateOfferStatus,
  getAgentById,
};