// src/controllers/PropertyManagementController.js
const propertyManagementService = require("../services/PropertyManagementService");

const getAllProperties = async (req, res) => {
  try {
    const properties = await propertyManagementService.getAllProperties();
    res.status(200).json(properties);
  } catch (error) {
    console.error("Error in getAllProperties:", error);
    res.status(500).json({ error: "Error al obtener los inmuebles" });
  }
};

const getPropertiesByAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    const properties = await propertyManagementService.getPropertiesByAgent(agentId);
    res.status(200).json(properties);
  } catch (error) {
    console.error("Error in getPropertiesByAgent:", error);
    res.status(500).json({ error: "Error al obtener los inmuebles del agente" });
  }
};

const getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await propertyManagementService.getPropertyById(id);
    if (!property) {
      return res.status(404).json({ error: "Inmueble no encontrado" });
    }
    res.status(200).json(property);
  } catch (error) {
    console.error("Error in getPropertyById:", error);
    res.status(500).json({ error: "Error al obtener el inmueble" });
  }
};

const savePropertyProgress = async (req, res) => {
  try {
    console.log("=== savePropertyProgress recibido ===");
    console.log("Body recibido:", JSON.stringify(req.body, null, 2));
    
    const propertyData = req.body;
    
    // Validaciones básicas
    if (!propertyData.titulo) {
      console.log("Error: Título faltante");
      return res.status(400).json({ error: "El título es obligatorio" });
    }
    
    if (!propertyData.operacion) {
      console.log("Error: Operación faltante");
      return res.status(400).json({ error: "La operación es obligatoria" });
    }
    
    if (!propertyData.tipo_propiedad) {
      console.log("Error: Tipo de propiedad faltante");
      return res.status(400).json({ error: "El tipo de propiedad es obligatorio" });
    }
    
    if (!propertyData.idagente) {
      console.log("Error: ID de agente faltante");
      return res.status(400).json({ error: "El ID del agente es obligatorio" });
    }
    
    // Asegurar que el estado sea "en proceso"
    propertyData.estado = 'en proceso';
    
    // Validar coordenadas
    if (propertyData.latitud === undefined || propertyData.longitud === undefined || 
        isNaN(propertyData.latitud) || isNaN(propertyData.longitud)) {
      console.log("Warning: Coordenadas no válidas, usando valores por defecto");
      propertyData.latitud = -17.3895;
      propertyData.longitud = -66.1568;
    }
    
    console.log("Datos validados correctamente, guardando...");
    const newProperty = await propertyManagementService.savePropertyProgress(propertyData);
    console.log("Propiedad guardada con ID:", newProperty.idinmueble);
    
    res.status(201).json(newProperty);
  } catch (error) {
    console.error("Error in savePropertyProgress:", error);
    res.status(500).json({ error: "Error al guardar el progreso del inmueble", details: error.message });
  }
};

const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const propertyData = req.body;
    
    // Validar coordenadas
    if (propertyData.latitud === undefined || propertyData.longitud === undefined ||
        isNaN(propertyData.latitud) || isNaN(propertyData.longitud)) {
      console.log("Warning: Coordenadas no proporcionadas para actualización");
      const existingProperty = await propertyManagementService.getPropertyById(id);
      if (existingProperty) {
        propertyData.latitud = existingProperty.latitud || -17.3895;
        propertyData.longitud = existingProperty.longitud || -66.1568;
      } else {
        propertyData.latitud = -17.3895;
        propertyData.longitud = -66.1568;
      }
    }
    
    const updatedProperty = await propertyManagementService.updateProperty(id, propertyData);
    if (!updatedProperty) {
      return res.status(404).json({ error: "Inmueble no encontrado" });
    }
    res.status(200).json(updatedProperty);
  } catch (error) {
    console.error("Error in updateProperty:", error);
    res.status(500).json({ error: "Error al actualizar el inmueble" });
  }
};

const updatePropertyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    // Validar que el estado sea válido
    const estadosPermitidos = ['activo', 'en revisión', 'reservado', 'vendido', 'observado', 'eliminado', 'en proceso'];
    if (!estadosPermitidos.includes(estado)) {
      return res.status(400).json({ error: `Estado inválido. Los estados permitidos son: ${estadosPermitidos.join(', ')}` });
    }
    
    const updatedProperty = await propertyManagementService.updatePropertyStatus(id, estado);
    if (!updatedProperty) {
      return res.status(404).json({ error: "Inmueble no encontrado" });
    }
    res.status(200).json(updatedProperty);
  } catch (error) {
    console.error("Error in updatePropertyStatus:", error);
    res.status(500).json({ error: "Error al cambiar el estado del inmueble" });
  }
};

const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await propertyManagementService.deleteProperty(id);
    if (!deleted) {
      return res.status(404).json({ error: "Inmueble no encontrado" });
    }
    res.status(200).json({ message: "Inmueble eliminado correctamente" });
  } catch (error) {
    console.error("Error in deleteProperty:", error);
    res.status(500).json({ error: "Error al eliminar el inmueble" });
  }
};

module.exports = {
  getAllProperties,
  getPropertiesByAgent,
  getPropertyById,
  savePropertyProgress,
  updateProperty,
  updatePropertyStatus,
  deleteProperty,
};