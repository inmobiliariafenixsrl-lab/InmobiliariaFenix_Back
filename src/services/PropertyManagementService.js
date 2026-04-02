const { query } = require("../../db");

// Funciones de validación
const validatePropertyType = (tipoPropiedad) => {
  const tiposPermitidos = [
    "casa",
    "departamento",
    "atico",
    "penhause",
    "terreno",
    "oficina",
    "local comercial",
  ];
  let normalized = tipoPropiedad ? tipoPropiedad.toLowerCase().trim() : "";

  if (normalized === "local comercial" || normalized === "localcomercial") {
    return "local comercial";
  }

  if (!tiposPermitidos.includes(normalized)) {
    console.warn(
      `Tipo de propiedad "${tipoPropiedad}" no reconocido, usando "casa" como valor por defecto`,
    );
    return "casa";
  }
  return normalized;
};

const validateOperation = (operacion) => {
  const opsPermitidas = ["venta", "alquiler", "anticrético"];
  let normalized = operacion ? operacion.toLowerCase().trim() : "";
  if (normalized === "anticretico") {
    normalized = "anticrético";
  }

  if (!opsPermitidas.includes(normalized)) {
    console.warn(
      `Operación "${operacion}" no reconocida, usando "venta" como valor por defecto`,
    );
    return "venta";
  }
  return normalized;
};

const validateCondition = (condicion) => {
  const condicionesPermitidas = ["nuevo", "reformado", "segunda mano"];
  const normalized = condicion ? condicion.toLowerCase().trim() : "";

  if (!condicionesPermitidas.includes(normalized)) {
    console.warn(
      `Condición "${condicion}" no reconocida, usando "nuevo" como valor por defecto`,
    );
    return "nuevo";
  }
  return normalized;
};

const validateStatus = (estado) => {
  const estadosPermitidos = [
    "activo",
    "en revisión",
    "reservado",
    "vendido",
    "observado",
    "eliminado",
    "en proceso",
  ];
  const normalized = estado ? estado.toLowerCase().trim() : "en proceso";

  let finalEstado = normalized;
  if (normalized === "en_revision") {
    finalEstado = "en revisión";
  } else if (normalized === "en_proceso") {
    finalEstado = "en proceso";
  }

  if (!estadosPermitidos.includes(finalEstado)) {
    console.warn(
      `Estado "${estado}" no reconocido, usando "en proceso" como valor por defecto`,
    );
    return "en proceso";
  }
  return finalEstado;
};

// Función para guardar documentos
const saveDocuments = async (propertyId, documents, tipoCambioCaptacion) => {
  try {
    const tiposResult = await query(
      `SELECT idtipo_documento, nombre FROM documento_tipo`,
    );

    const tiposMap = {};
    tiposResult.rows.forEach((tipo) => {
      tiposMap[tipo.nombre] = tipo.idtipo_documento;
    });

    const documentMapping = {
      folioReal: "Folio Real / Vista Rápida",
      avaluo: "Avalúo",
      planos: "Planos",
      impuestos: "Comprobante de impuestos (3 años)",
      informeLegal: "Informe legal del inmueble",
    };

    for (const [key, files] of Object.entries(documents)) {
      if (files && files.length > 0) {
        const tipoNombre = documentMapping[key];
        const tipoId = tiposMap[tipoNombre];

        if (tipoId) {
          // Eliminar documentos existentes de este tipo
          await query(
            `DELETE FROM Documento WHERE idinmueble = $1 AND idtipo_documento = $2`,
            [propertyId, tipoId],
          );

          // Insertar nuevos documentos
          for (const fileInfo of files) {
            // Si el documento tiene ID, significa que ya existe y no debemos reinsertarlo
            if (fileInfo.id) {
              continue; // Saltar documentos existentes
            }

            const fileMetadata = JSON.stringify({
              name: fileInfo.name,
              size: fileInfo.size,
              type: fileInfo.type,
              uploadedAt: new Date().toISOString(),
              tipo_cambio: tipoCambioCaptacion,
            });

            await query(
              `INSERT INTO Documento (idinmueble, pdf, idtipo_documento, nombre_archivo) 
               VALUES ($1, $2, $3, $4)`,
              [propertyId, fileMetadata, tipoId, fileInfo.name],
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("Error saving documents:", error);
    throw error;
  }
};

// Funciones principales
const getAllProperties = async () => {
  try {
    const result = await query(
      `SELECT i.*, 
              a.nombre as agente_nombre, 
              a.apellido as agente_apellido
       FROM Inmueble i
       LEFT JOIN Agente a ON i.idagente = a.idagente
       WHERE i.estado NOT IN ('eliminado') 
       ORDER BY i.fecha_creacion DESC`,
    );
    return result.rows;
  } catch (error) {
    console.error("Error in getAllProperties:", error);
    throw error;
  }
};

const getPropertiesByAgent = async (agentId) => {
  try {
    const result = await query(
      `SELECT i.*, 
              a.nombre as agente_nombre, 
              a.apellido as agente_apellido
       FROM Inmueble i
       LEFT JOIN Agente a ON i.idagente = a.idagente
       WHERE i.idagente = $1 AND i.estado NOT IN ('eliminado') 
       ORDER BY i.fecha_creacion DESC`,
      [agentId],
    );
    return result.rows;
  } catch (error) {
    console.error("Error in getPropertiesByAgent:", error);
    throw error;
  }
};

const getPropertyDocuments = async (propertyId) => {
  try {
    const result = await query(
      `SELECT d.*, dt.nombre as tipo_nombre 
       FROM Documento d
       JOIN documento_tipo dt ON d.idtipo_documento = dt.idtipo_documento
       WHERE d.idinmueble = $1`,
      [propertyId]
    );
    return result.rows;
  } catch (error) {
    console.error("Error in getPropertyDocuments:", error);
    throw error;
  }
};

const getPropertyById = async (id) => {
  try {
    const result = await query(
      `SELECT i.*, 
              a.nombre as agente_nombre, 
              a.apellido as agente_apellido
       FROM Inmueble i
       LEFT JOIN Agente a ON i.idagente = a.idagente
       WHERE i.idinmueble = $1`,
      [id],
    );

    if (result.rows[0]) {
      const documents = await getPropertyDocuments(id);
      result.rows[0].documents = documents;
    }

    return result.rows[0];
  } catch (error) {
    console.error("Error in getPropertyById:", error);
    throw error;
  }
};

const savePropertyProgress = async (propertyData, documents = null) => {
  const {
    titulo,
    descripcion,
    operacion,
    tipo_propiedad,
    condicion,
    direccion,
    m2_terreno,
    m2_construccion,
    nro_pisos,
    nro_habitaciones,
    nro_baños,
    nro_estacionamiento,
    tipo_cambio_captacion,
    precio_capatacion_m,
    precio_capatacion_s,
    precio_captacion_i,
    ascensor,
    garaje,
    terraza,
    piscina,
    año_construccion,
    latitud,
    longitud,
    idagente,
    estado,
  } = propertyData;

  const validatedTipoPropiedad = validatePropertyType(tipo_propiedad);
  const validatedCondicion = validateCondition(condicion);
  const validatedOperacion = validateOperation(operacion);
  const validatedEstado = validateStatus(estado);

  if (!idagente) {
    throw new Error("El ID del agente es obligatorio");
  }

  let validYear = año_construccion;
  if (
    !validYear ||
    validYear < 1900 ||
    validYear > new Date().getFullYear() + 5
  ) {
    validYear = new Date().getFullYear();
  }

  const validLatitud =
    latitud && !isNaN(parseFloat(latitud)) ? parseFloat(latitud) : -17.3895;
  const validLongitud =
    longitud && !isNaN(parseFloat(longitud)) ? parseFloat(longitud) : -66.1568;

  try {
    const result = await query(
      `INSERT INTO Inmueble (
        titulo, descripcion, operacion, tipo_propiedad, condicion,
        direccion, m2_terreno, m2_construccion, nro_pisos, nro_habitaciones,
        nro_baños, nro_estacionamiento, tipo_cambio_captacion,
        precio_capatacion_m, precio_capatacion_s, precio_captacion_i,
        ascensor, garaje, terraza, piscina, año_construccion,
        latitud, longitud, idagente, estado, fecha_creacion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, TIMEZONE('America/La_Paz', NOW()))
      RETURNING *`,
      [
        titulo || "",
        descripcion || "",
        validatedOperacion,
        validatedTipoPropiedad,
        validatedCondicion,
        direccion || "",
        m2_terreno || 0,
        m2_construccion || 0,
        nro_pisos || 0,
        nro_habitaciones || 0,
        nro_baños || 0,
        nro_estacionamiento || 0,
        tipo_cambio_captacion || "6.96",
        precio_capatacion_m || 0,
        precio_capatacion_s || 0,
        precio_captacion_i || 0,
        ascensor || false,
        garaje || false,
        terraza || false,
        piscina || false,
        validYear,
        validLatitud,
        validLongitud,
        idagente,
        validatedEstado,
      ],
    );

    const propertyId = result.rows[0].idinmueble;

    if (documents && Object.keys(documents).length > 0) {
      await saveDocuments(propertyId, documents, tipo_cambio_captacion);
    }

    const propertyWithAgent = await getPropertyById(propertyId);
    return propertyWithAgent;
  } catch (error) {
    console.error("Error en savePropertyProgress SQL:", error);
    throw error;
  }
};

const updateProperty = async (id, propertyData, documents = null) => {
  const {
    titulo,
    descripcion,
    operacion,
    tipo_propiedad,
    condicion,
    direccion,
    m2_terreno,
    m2_construccion,
    nro_pisos,
    nro_habitaciones,
    nro_baños,
    nro_estacionamiento,
    tipo_cambio_captacion,
    precio_capatacion_m,
    precio_capatacion_s,
    precio_captacion_i,
    ascensor,
    garaje,
    terraza,
    piscina,
    año_construccion,
    latitud,
    longitud,
    estado,
  } = propertyData;

  const validatedTipoPropiedad = validatePropertyType(tipo_propiedad);
  const validatedCondicion = validateCondition(condicion);
  const validatedOperacion = validateOperation(operacion);
  const validatedEstado = validateStatus(estado);

  let validYear = año_construccion;
  if (
    !validYear ||
    validYear < 1900 ||
    validYear > new Date().getFullYear() + 5
  ) {
    validYear = new Date().getFullYear();
  }

  const validLatitud =
    latitud && !isNaN(parseFloat(latitud)) ? parseFloat(latitud) : -17.3895;
  const validLongitud =
    longitud && !isNaN(parseFloat(longitud)) ? parseFloat(longitud) : -66.1568;

  try {
    const result = await query(
      `UPDATE Inmueble SET
        titulo = $1,
        descripcion = $2,
        operacion = $3,
        tipo_propiedad = $4,
        condicion = $5,
        direccion = $6,
        m2_terreno = $7,
        m2_construccion = $8,
        nro_pisos = $9,
        nro_habitaciones = $10,
        nro_baños = $11,
        nro_estacionamiento = $12,
        tipo_cambio_captacion = $13,
        precio_capatacion_m = $14,
        precio_capatacion_s = $15,
        precio_captacion_i = $16,
        ascensor = $17,
        garaje = $18,
        terraza = $19,
        piscina = $20,
        año_construccion = $21,
        latitud = $22,
        longitud = $23,
        estado = $24
      WHERE idinmueble = $25
      RETURNING *`,
      [
        titulo || "",
        descripcion || "",
        validatedOperacion,
        validatedTipoPropiedad,
        validatedCondicion,
        direccion || "",
        m2_terreno || 0,
        m2_construccion || 0,
        nro_pisos || 0,
        nro_habitaciones || 0,
        nro_baños || 0,
        nro_estacionamiento || 0,
        tipo_cambio_captacion || "6.96",
        precio_capatacion_m || 0,
        precio_capatacion_s || 0,
        precio_captacion_i || 0,
        ascensor || false,
        garaje || false,
        terraza || false,
        piscina || false,
        validYear,
        validLatitud,
        validLongitud,
        validatedEstado,
        id,
      ],
    );

    if (result.rows[0]) {
      if (documents && Object.keys(documents).length > 0) {
        await saveDocuments(id, documents, tipo_cambio_captacion);
      }
      const propertyWithAgent = await getPropertyById(
        result.rows[0].idinmueble,
      );
      return propertyWithAgent;
    }
    return result.rows[0];
  } catch (error) {
    console.error("Error in updateProperty:", error);
    throw error;
  }
};

const updatePropertyStatus = async (id, estado) => {
  try {
    const validatedEstado = validateStatus(estado);
    const result = await query(
      `UPDATE Inmueble SET estado = $1 WHERE idinmueble = $2 RETURNING *`,
      [validatedEstado, id],
    );

    if (result.rows[0]) {
      const propertyWithAgent = await getPropertyById(
        result.rows[0].idinmueble,
      );
      return propertyWithAgent;
    }
    return result.rows[0];
  } catch (error) {
    console.error("Error in updatePropertyStatus:", error);
    throw error;
  }
};

const deleteProperty = async (id) => {
  try { 
    const result = await query(
      `UPDATE Inmueble SET estado = 'eliminado' WHERE idinmueble = $1 RETURNING *`,
      [id],
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error in deleteProperty:", error);
    throw error;
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
  saveDocuments,
};
