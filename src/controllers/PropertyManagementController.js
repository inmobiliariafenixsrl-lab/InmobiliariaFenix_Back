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
    const documents = propertyData.documents;
    const videoUrl = propertyData.videoUrl;
    const images = propertyData.images;

    delete propertyData.documents;
    delete propertyData.videoUrl;
    delete propertyData.images;

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

    propertyData.estado = "en proceso";

    if (!propertyData.año_construccion || propertyData.año_construccion < 1900 || propertyData.año_construccion > new Date().getFullYear() + 5) {
      console.log("Warning: Año de construcción inválido, usando año actual");
      propertyData.año_construccion = new Date().getFullYear();
    }

    if (propertyData.latitud === undefined || propertyData.longitud === undefined || isNaN(propertyData.latitud) || isNaN(propertyData.longitud)) {
      console.log("Warning: Coordenadas no válidas, usando valores por defecto");
      propertyData.latitud = -17.3895;
      propertyData.longitud = -66.1568;
    }

    console.log("Datos validados correctamente, guardando...");
    const newProperty = await propertyManagementService.savePropertyProgress(propertyData, documents);
    console.log("Propiedad guardada con ID:", newProperty.idinmueble);

    res.status(201).json(newProperty);
  } catch (error) {
    console.error("Error in savePropertyProgress:", error);
    res.status(500).json({
      error: "Error al guardar el progreso del inmueble",
      details: error.message,
    });
  }
};

const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const propertyData = req.body;
    const documents = propertyData.documents;
    const videoUrl = propertyData.videoUrl;
    const images = propertyData.images;

    delete propertyData.documents;
    delete propertyData.videoUrl;
    delete propertyData.images;

    if (!propertyData.año_construccion || propertyData.año_construccion < 1900 || propertyData.año_construccion > new Date().getFullYear() + 5) {
      console.log("Warning: Año de construcción inválido, usando año actual");
      propertyData.año_construccion = new Date().getFullYear();
    }

    if (propertyData.latitud === undefined || propertyData.longitud === undefined || isNaN(propertyData.latitud) || isNaN(propertyData.longitud)) {
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

    const updatedProperty = await propertyManagementService.updateProperty(id, propertyData, documents);
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

    const estadosPermitidos = ["activo", "en revisión", "reservado", "vendido", "observado", "eliminado", "en proceso"];
    if (!estadosPermitidos.includes(estado)) {
      return res.status(400).json({
        error: `Estado inválido. Los estados permitidos son: ${estadosPermitidos.join(", ")}`,
      });
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

const getPropertyDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const documents = await propertyManagementService.getPropertyDocuments(id);
    res.status(200).json(documents);
  } catch (error) {
    console.error("Error in getPropertyDocuments:", error);
    res.status(500).json({ error: "Error al obtener los documentos del inmueble" });
  }
};

// ========== NUEVAS FUNCIONES PARA DOCUMENTOS ==========

const uploadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { idtipo_documento, nombre_archivo } = req.body;
    const pdfBuffer = req.file ? req.file.buffer : null;

    if (!pdfBuffer) {
      return res.status(400).json({ error: "El archivo PDF es obligatorio" });
    }

    if (!idtipo_documento) {
      return res.status(400).json({ error: "El tipo de documento es obligatorio" });
    }

    const newDocument = await propertyManagementService.uploadDocument(
      id,
      idtipo_documento,
      pdfBuffer,
      nombre_archivo || req.file.originalname
    );

    res.status(201).json(newDocument);
  } catch (error) {
    console.error("Error in uploadDocument:", error);
    res.status(500).json({ error: "Error al subir el documento" });
  }
};

const getDocumentFile = async (req, res) => {
  try {
    const { id } = req.params; // Esto captura el ID de la URL
    console.log("Buscando documento con ID:", id); // Agrega este log para verificar
    
    const document = await propertyManagementService.getDocumentFile(id);
    
    if (!document || !document.pdf) {
      return res.status(404).json({ error: "Documento no encontrado" });
    }

    let pdfBuffer = document.pdf;
    
    // Si es un string que comienza con \x, convertirlo a buffer
    if (typeof pdfBuffer === 'string' && pdfBuffer.startsWith('\\x')) {
      const hexString = pdfBuffer.substring(2);
      pdfBuffer = Buffer.from(hexString, 'hex');
    }
    
    // Si es un objeto con type y data (formato de bytea de PostgreSQL)
    if (pdfBuffer && typeof pdfBuffer === 'object' && pdfBuffer.type === 'Buffer' && Array.isArray(pdfBuffer.data)) {
      pdfBuffer = Buffer.from(pdfBuffer.data);
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${document.nombre_archivo || 'documento.pdf'}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error in getDocumentFile:", error);
    res.status(500).json({ error: "Error al obtener el documento" });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await propertyManagementService.deleteDocument(id);
    
    if (!deleted) {
      return res.status(404).json({ error: "Documento no encontrado" });
    }
    
    res.status(200).json({ message: "Documento eliminado correctamente" });
  } catch (error) {
    console.error("Error in deleteDocument:", error);
    res.status(500).json({ error: "Error al eliminar el documento" });
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
  getPropertyDocuments,
  uploadDocument,
  getDocumentFile,
  deleteDocument,
};