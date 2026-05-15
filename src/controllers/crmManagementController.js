const crmManagementService = require("../services/crmManagementService");

const getProperties = async (req, res) => {
  try {
    const { status, agentId, type, searchTerm } = req.query;
    const filters = { 
      status, 
      agentId, 
      type,
      searchTerm 
    };
    
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
    const user = req.user;
    
    const property = await crmManagementService.getPropertyById(id, user);
    
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
    const { newPrice } = req.body;
    const user = req.user;
    
    if (!newPrice) {
      return res.status(400).json({
        success: false,
        message: "El nuevo precio es requerido"
      });
    }
    
    const property = await crmManagementService.updatePropertyPrice(id, newPrice, user);
    
    if (property?.error) {
      switch (property.error) {
        case 'PERMISSION_DENIED':
          return res.status(403).json({
            success: false,
            message: "Permiso para editar el precio denegado",
          });
        
        default:
          return res.status(400).json({
            success: false,
            message: "Error al modificar el precio",
          });
      }
    }

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
    const user = req.user;
    
    if (!offerData.propertyId || !offerData.amount || !offerData.offeredBy) {
      return res.status(400).json({
        success: false,
        message: "Datos incompletos: se requiere propertyId, amount y offeredBy"
      });
    }
    
    const offer = await crmManagementService.createOffer(offerData, user);

    if (offer?.error) {
      switch (offer.error) {
        case 'CONFLICT':
          return res.status(409).json({
            success: false,
            message: "Ya no se aceptan nuevas solicitudes de ofertas",
          });

        default:
          return res.status(400).json({
            success: false,
            message: "Error al crear una oferta",
          });
      }
    }
    
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
    const { status, propertyId, reason } = req.body;
    const user = req.user;
    
    if (!status || !propertyId) {
      return res.status(400).json({
        success: false,
        message: "Se requiere status y propertyId"
      });
    }
    
    const offer = await crmManagementService.updateOfferStatus(id, propertyId, status, reason, user);
    
    if (offer?.error) {
      switch (offer.error) {
        case 'CONFLICT':
          return res.status(409).json({
            success: false,
            message: "Ya se acepto otra oferta",
          });

        case 'MISSING_REASON':
          return res.status(400).json({
            success: false,
            message: "Falta el motivo del rechazo",
          });

        default:
          return res.status(400).json({
            success: false,
            message: "Error al aceptar la oferta",
          });
      }
    }
    
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

const getNegotiationHistory = async (req, res) => {
  try {
    const { offerId, propertyId } = req.params;
    const user = req.user;

    // Validaciones de parámetros
    if (!offerId || !propertyId) {
      return res.status(400).json({
        success: false,
        message: "Se requiere offerId y propertyId"
      });
    }

    // Validar que sean números válidos
    if (isNaN(offerId) || isNaN(propertyId)) {
      return res.status(400).json({
        success: false,
        message: "offerId y propertyId deben ser números válidos"
      });
    }

    const negotiationThread = await crmManagementService.getNegotiationHistory(
      parseInt(offerId),
      parseInt(propertyId),
      user
    );

    if (!negotiationThread) {
      return res.status(404).json({
        success: false,
        message: "No se encontró el historial de negociaciones"
      });
    }

    res.status(200).json({
      success: true,
      data: negotiationThread
    });

  } catch (error) {
    console.error("Error en getNegotiationHistory:", error);
    
    // Manejo específico de errores
    if (error.message === 'PROPERTY_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: "Propiedad no encontrada"
      });
    }
    
    if (error.message === 'OFFER_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: "Oferta no encontrada en esta propiedad"
      });
    }

    if (error.message === 'ACCESS_DENIED') {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para ver este historial"
      });
    }

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
  getNegotiationHistory
};