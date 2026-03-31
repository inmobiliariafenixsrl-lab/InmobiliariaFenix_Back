const { query } = require("../../db");

// Obtener todos los inmuebles
const getAllProperties = async () => {
  try {
    const result = await query(
      `SELECT * FROM Inmueble 
       WHERE estado NOT IN ('eliminado') 
       ORDER BY fecha_creacion DESC`
    );
    return result.rows;
  } catch (error) {
    console.error("Error in getAllProperties:", error);
    throw error;
  }
};

// Obtener inmuebles por agente
const getPropertiesByAgent = async (agentId) => {
  try {
    const result = await query(
      `SELECT * FROM Inmueble 
       WHERE idagente = $1 AND estado NOT IN ('eliminado') 
       ORDER BY fecha_creacion DESC`,
      [agentId]
    );
    return result.rows;
  } catch (error) {
    console.error("Error in getPropertiesByAgent:", error);
    throw error;
  }
};

// Obtener inmueble por ID
const getPropertyById = async (id) => {
  try {
    const result = await query(
      `SELECT * FROM Inmueble WHERE idinmueble = $1`,
      [id]
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error in getPropertyById:", error);
    throw error;
  }
};

// Función para validar y mapear tipo de propiedad
const validatePropertyType = (tipoPropiedad) => {
  const tiposPermitidos = ['casa', 'departamento', 'atico', 'penhause', 'terreno', 'oficina', 'local comercial'];
  const normalized = tipoPropiedad ? tipoPropiedad.toLowerCase().trim() : '';
  
  if (!tiposPermitidos.includes(normalized)) {
    console.warn(`Tipo de propiedad "${tipoPropiedad}" no reconocido, usando "casa" como valor por defecto`);
    return 'casa';
  }
  return normalized;
};

// Función para validar y mapear condición
const validateCondition = (condicion) => {
  const condicionesPermitidas = ['nuevo', 'reformado', 'segunda mano'];
  const normalized = condicion ? condicion.toLowerCase().trim() : '';
  
  if (!condicionesPermitidas.includes(normalized)) {
    console.warn(`Condición "${condicion}" no reconocida, usando "nuevo" como valor por defecto`);
    return 'nuevo';
  }
  return normalized;
};

// Guardar progreso (crear inmueble)
const savePropertyProgress = async (propertyData) => {
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
    estado = 'en proceso'
  } = propertyData;

  // Validar y mapear valores
  const validatedTipoPropiedad = validatePropertyType(tipo_propiedad);
  const validatedCondicion = validateCondition(condicion);
  
  // Asegurar que el estado sea válido
  let validatedEstado = estado;
  if (estado === 'en_revision') validatedEstado = 'en revisión';
  if (estado === 'en_proceso') validatedEstado = 'en proceso';
  
  // Validar que el ID del agente existe
  if (!idagente) {
    throw new Error("El ID del agente es obligatorio");
  }

  console.log("Guardando propiedad con datos:", {
    titulo,
    operacion,
    tipo_propiedad: validatedTipoPropiedad,
    condicion: validatedCondicion,
    idagente,
    estado: validatedEstado,
    precio_capatacion_s,
    latitud,
    longitud,
    tipo_cambio_captacion
  });

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
        titulo || '',
        descripcion || '',
        operacion,
        validatedTipoPropiedad,
        validatedCondicion,
        direccion || '',
        m2_terreno || 0,
        m2_construccion || 0,
        nro_pisos || 0,
        nro_habitaciones || 0,
        nro_baños || 0,
        nro_estacionamiento || 0,
        tipo_cambio_captacion || '6.96',
        precio_capatacion_m || 0,
        precio_capatacion_s || 0,
        precio_captacion_i || 0,
        ascensor || false,
        garaje || false,
        terraza || false,
        piscina || false,
        año_construccion || 0,
        latitud || -17.3895,
        longitud || -66.1568,
        idagente,
        validatedEstado
      ]
    );
    console.log("Propiedad guardada exitosamente:", result.rows[0].idinmueble);
    return result.rows[0];
  } catch (error) {
    console.error("Error en savePropertyProgress SQL:", error);
    throw error;
  }
};

// Actualizar inmueble
const updateProperty = async (id, propertyData) => {
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
    estado
  } = propertyData;

  // Validar y mapear valores
  const validatedTipoPropiedad = validatePropertyType(tipo_propiedad);
  const validatedCondicion = validateCondition(condicion);
  
  // Asegurar que el estado sea válido
  let validatedEstado = estado;
  if (estado === 'en_revision') validatedEstado = 'en revisión';

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
        titulo || '',
        descripcion || '',
        operacion,
        validatedTipoPropiedad,
        validatedCondicion,
        direccion || '',
        m2_terreno || 0,
        m2_construccion || 0,
        nro_pisos || 0,
        nro_habitaciones || 0,
        nro_baños || 0,
        nro_estacionamiento || 0,
        tipo_cambio_captacion || '6.96',
        precio_capatacion_m || 0,
        precio_capatacion_s || 0,
        precio_captacion_i || 0,
        ascensor || false,
        garaje || false,
        terraza || false,
        piscina || false,
        año_construccion || 0,
        latitud || -17.3895,
        longitud || -66.1568,
        validatedEstado,
        id
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error in updateProperty:", error);
    throw error;
  }
};

// Actualizar estado del inmueble
const updatePropertyStatus = async (id, estado) => {
  try {
    const result = await query(
      `UPDATE Inmueble SET estado = $1 WHERE idinmueble = $2 RETURNING *`,
      [estado, id]
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error in updatePropertyStatus:", error);
    throw error;
  }
};

// Eliminar inmueble (soft delete)
const deleteProperty = async (id) => {
  try {
    const result = await query(
      `UPDATE Inmueble SET estado = 'eliminado' WHERE idinmueble = $1 RETURNING *`,
      [id]
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
};