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

const getOffers = async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    const offers = await crmManagementService.getOffers(propertyId);
    
    res.json({
      success: true,
      data: offers
    });
  } catch (error) {
    console.error("Error en getOffers:", error);
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

const getPriceChanges = async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    const priceChanges = await crmManagementService.getPriceChanges(propertyId);
    
    res.json({
      success: true,
      data: priceChanges
    });
  } catch (error) {
    console.error("Error en getPriceChanges:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

const getTimeline = async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    const timeline = await crmManagementService.getTimeline(propertyId);
    
    res.json({
      success: true,
      data: timeline
    });
  } catch (error) {
    console.error("Error en getTimeline:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

const addTimelineEvent = async (req, res) => {
  try {
    const eventData = req.body;
    
    if (!eventData.propertyId || !eventData.type || !eventData.title) {
      return res.status(400).json({
        success: false,
        message: "Datos incompletos: se requiere propertyId, type y title"
      });
    }
    
    const event = await crmManagementService.addTimelineEvent(eventData);
    
    res.status(201).json({
      success: true,
      message: "Evento agregado exitosamente",
      data: event
    });
  } catch (error) {
    console.error("Error en addTimelineEvent:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

const getAgents = async (req, res) => {
  try {
    const { searchTerm, sinGrupo, teamLeaderSinGrupo, page, limit } = req.query;
    const filters = { 
      searchTerm, 
      sinGrupo: sinGrupo === 'true',
      teamLeaderSinGrupo: teamLeaderSinGrupo === 'true'
    };
    
    const agents = await crmManagementService.getAgents(filters);
    
    let responseData = agents;
    let pagination = null;
    
    if (page && limit) {
      const start = (parseInt(page) - 1) * parseInt(limit);
      const end = start + parseInt(limit);
      const paginatedAgents = agents.slice(start, end);
      
      pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: agents.length,
        totalPages: Math.ceil(agents.length / parseInt(limit)),
        hasNextPage: end < agents.length,
        hasPrevPage: parseInt(page) > 1
      };
      responseData = paginatedAgents;
    }
    
    res.json({
      success: true,
      data: responseData,
      pagination
    });
  } catch (error) {
    console.error("Error en getAgents:", error);
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

const getFullCRMData = async (req, res) => {
  try {
    const crmData = await crmManagementService.getFullCRMData();
    
    res.json({
      success: true,
      data: crmData
    });
  } catch (error) {
    console.error("Error en getFullCRMData:", error);
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
  getOffers,
  createOffer,
  updateOfferStatus,
  getPriceChanges,
  getTimeline,
  addTimelineEvent,
  getAgents,
  getAgentById,
  getFullCRMData
};