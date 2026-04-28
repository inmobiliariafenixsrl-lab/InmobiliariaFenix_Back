const { query } = require("../../db");

const getProperties = async (filters = {}) => {
  try {
    let sql = `
      SELECT 
        i.idinmueble as id,
        i.titulo as title,
        i.descripcion as description,
        i.precio_capatacion_s as price,
        i.operacion as type,
        i.tipo_propiedad as "propertyType",
        d.nombre as department,
        p.nombre as province,
        m.nombre as municipality,
        m.nombre as city,
        i.direccion as address,
        i.m2_construccion as "sqMeters",
        i.m2_terreno as "sqMetersLand",
        i.nro_pisos as "numberOfFloors",
        i.nro_habitaciones as bedrooms,
        i.nro_baños as bathrooms,
        i.nro_estacionamiento as "parkingSpots",
        i.ascensor as "hasElevator",
        i.garaje as "hasGarage",
        i.terraza as "hasTerrace",
        i.piscina as "hasPool",
        i.año_construccion as "yearBuilt",
        i.condicion as condition,
        i.estado as status,
        i.idagente as "agentId",
        a.nombre || ' ' || a.apellido as "agentName",
        i.fecha_creacion as "capturedDate",
        i.observacion as observations,
        i.enlace_video as enlace_video,
        i.latitud as lat,
        i.longitud as lng,
        i.nombre_propietario,
        i.celular_propietario,
        i.idmunicipio,
        i.porcentajeComision,
        i.precio_capatacion_m as "minPrice",
        i.precio_captacion_i as "idealPrice",
        i.fecha_creacion as "createdDate"
      FROM inmueble i
      LEFT JOIN agente a ON i.idagente = a.idagente
      LEFT JOIN municipio m ON i.idmunicipio = m.idmunicipio
      LEFT JOIN provincia p ON m.idprovincia = p.idprovincia
      LEFT JOIN departamento d ON p.iddepartamento = d.iddepartamento
      WHERE i.estado != 'eliminado'
    `;

    const params = [];
    let paramIndex = 1;

    if (filters.status) {
      sql += ` AND i.estado = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.agentId) {
      sql += ` AND i.idagente = $${paramIndex}`;
      params.push(filters.agentId);
      paramIndex++;
    }

    if (filters.type) {
      sql += ` AND i.operacion = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    sql += ` ORDER BY i.fecha_creacion DESC`;

    const result = await query(sql, params);
    
    const properties = await Promise.all(result.rows.map(async (property) => {
      const images = await getPropertyImages(property.id);
      return { ...property, images };
    }));

    return properties;
  } catch (error) {
    console.error("Error en getProperties:", error);
    throw error;
  }
};

const getPropertyImages = async (propertyId) => {
  try {
    const result = await query(
      `SELECT imagen FROM imagen_inmueble WHERE idinmueble = $1 ORDER BY orden ASC`,
      [propertyId]
    );
    
    return result.rows.map(row => {
      if (row.imagen && Buffer.isBuffer(row.imagen)) {
        return `data:image/jpeg;base64,${row.imagen.toString('base64')}`;
      }
      return null;
    }).filter(img => img !== null);
  } catch (error) {
    console.error("Error en getPropertyImages:", error);
    return [];
  }
};

const getPropertyById = async (id) => {
  try {
    const result = await query(
      `
      SELECT 
        i.idinmueble as id,
        i.titulo as title,
        i.descripcion as description,
        i.precio_capatacion_s as price,
        i.operacion as type,
        i.tipo_propiedad as "propertyType",
        d.nombre as department,
        p.nombre as province,
        m.nombre as municipality,
        m.nombre as city,
        i.direccion as address,
        i.m2_construccion as "sqMeters",
        i.m2_terreno as "sqMetersLand",
        i.nro_pisos as "numberOfFloors",
        i.nro_habitaciones as bedrooms,
        i.nro_baños as bathrooms,
        i.nro_estacionamiento as "parkingSpots",
        i.ascensor as "hasElevator",
        i.garaje as "hasGarage",
        i.terraza as "hasTerrace",
        i.piscina as "hasPool",
        i.año_construccion as "yearBuilt",
        i.condicion as condition,
        i.estado as status,
        i.idagente as "agentId",
        a.nombre || ' ' || a.apellido as "agentName",
        i.fecha_creacion as "capturedDate",
        i.observacion as observations,
        i.enlace_video as enlace_video,
        i.latitud as lat,
        i.longitud as lng,
        i.nombre_propietario,
        i.celular_propietario,
        i.idmunicipio,
        i.porcentajeComision as "porcentajeComision",
        i.precio_capatacion_m as "minPrice",
        i.precio_captacion_i as "idealPrice"
      FROM inmueble i
      LEFT JOIN agente a ON i.idagente = a.idagente
      LEFT JOIN municipio m ON i.idmunicipio = m.idmunicipio
      LEFT JOIN provincia p ON m.idprovincia = p.idprovincia
      LEFT JOIN departamento d ON p.iddepartamento = d.iddepartamento
      WHERE i.idinmueble = $1 AND i.estado != 'eliminado'
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const property = result.rows[0];
    
    const [images, priceChanges, offers, timeline] = await Promise.all([
      getPropertyImages(id),
      getPriceChangesByProperty(id),
      getOffersByProperty(id),
      getTimelineByProperty(id)
    ]);

    return {
      ...property,
      images,
      priceChanges,
      offers,
      timeline
    };
  } catch (error) {
    console.error("Error en getPropertyById:", error);
    throw error;
  }
};

const updateProperty = async (id, updateData) => {
  try {
    const fields = [];
    const params = [];
    let paramIndex = 1;

    const fieldMappings = {
      title: 'titulo',
      description: 'descripcion',
      price: 'precio_capatacion_s',
      type: 'operacion',
      propertyType: 'tipo_propiedad',
      address: 'direccion',
      sqMeters: 'm2_construccion',
      sqMetersLand: 'm2_terreno',
      numberOfFloors: 'nro_pisos',
      bedrooms: 'nro_habitaciones',
      bathrooms: 'nro_baños',
      parkingSpots: 'nro_estacionamiento',
      hasElevator: 'ascensor',
      hasGarage: 'garaje',
      hasTerrace: 'terraza',
      hasPool: 'piscina',
      yearBuilt: 'año_construccion',
      condition: 'condicion',
      status: 'estado',
      observations: 'observacion',
      enlace_video: 'enlace_video',
      lat: 'latitud',
      lng: 'longitud',
      nombre_propietario: 'nombre_propietario',
      celular_propietario: 'celular_propietario',
      idmunicipio: 'idmunicipio',
      porcentajeComision: 'porcentajeComision',
      agentId: 'idagente'
    };

    for (const [key, dbField] of Object.entries(fieldMappings)) {
      if (updateData[key] !== undefined) {
        fields.push(`${dbField} = $${paramIndex}`);
        params.push(updateData[key]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return null;
    }

    params.push(id);
    const queryText = `
      UPDATE inmueble 
      SET ${fields.join(', ')} 
      WHERE idinmueble = $${paramIndex} 
      RETURNING idinmueble as id
    `;

    const result = await query(queryText, params);
    
    if (result.rows.length === 0) {
      return null;
    }

    return getPropertyById(id);
  } catch (error) {
    console.error("Error en updateProperty:", error);
    throw error;
  }
};

const updatePropertyPrice = async (propertyId, newPrice, reason, userId) => {
  try {
    const property = await getPropertyById(propertyId);
    if (!property) {
      throw new Error("Propiedad no encontrada");
    }

    const previousPrice = property.price;
    
    await query("BEGIN");

    await query(
      `
      UPDATE inmueble 
      SET precio_capatacion_s = $1 
      WHERE idinmueble = $2
      `,
      [newPrice, propertyId]
    );

    await query(
      `
      INSERT INTO historial_precio_inmueble 
      (idinmueble, precio_anterior, precio_nuevo, idagente_modificador)
      VALUES ($1, $2, $3, $4)
      `,
      [propertyId, previousPrice, newPrice, userId]
    );

    await query("COMMIT");

    return getPropertyById(propertyId);
  } catch (error) {
    await query("ROLLBACK");
    console.error("Error en updatePropertyPrice:", error);
    throw error;
  }
};

const getOffersByProperty = async (propertyId) => {
  try {
    const result = await query(
      `
      SELECT 
        idoferta as id,
        idinmueble as propertyId,
        fecha_oferta as date,
        monto_oferta as amount,
        nombre_ofertante as offeredBy,
        celular_ofertante as phone,
        monto_seña as depositAmount
      FROM oferta_inmueble 
      WHERE idinmueble = $1
      ORDER BY fecha_oferta DESC
      `,
      [propertyId]
    );
    
    return result.rows;
  } catch (error) {
    console.error("Error en getOffersByProperty:", error);
    return [];
  }
};

const getOffers = async (propertyId) => {
  return getOffersByProperty(propertyId);
};

const createOffer = async (offerData) => {
  try {
    const { propertyId, amount, offeredBy, phone, depositAmount } = offerData;
    
    const result = await query(
      `
      INSERT INTO oferta_inmueble 
      (idinmueble, nombre_ofertante, celular_ofertante, monto_oferta, monto_seña, idagente_responsable)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        idoferta as id,
        idinmueble as "propertyId",
        fecha_oferta as date,
        monto_oferta as amount,
        nombre_ofertante as "offeredBy",
        celular_ofertante as phone,
        monto_seña as "depositAmount"
      `,
      [propertyId, offeredBy, phone, amount, depositAmount, 1]
    );

    return result.rows[0];
  } catch (error) {
    console.error("Error en createOffer:", error);
    throw error;
  }
};

const updateOfferStatus = async (offerId, propertyId, status) => {
  try {
    let propertyStatus = '';
    switch (status) {
      case 'aceptada':
        propertyStatus = 'reservado';
        break;
      case 'rechazada':
        propertyStatus = 'activo';
        break;
      default:
        propertyStatus = 'en_proceso';
    }

    await query("BEGIN");

    await query(
      `
      UPDATE inmueble 
      SET estado = $1 
      WHERE idinmueble = $2
      `,
      [propertyStatus, propertyId]
    );

    await query("COMMIT");

    return {
      id: offerId,
      propertyId,
      status,
      date: new Date().toISOString()
    };
  } catch (error) {
    await query("ROLLBACK");
    console.error("Error en updateOfferStatus:", error);
    throw error;
  }
};

const getPriceChangesByProperty = async (propertyId) => {
  try {
    const result = await query(
      `
      SELECT 
        idhistorial as id,
        idinmueble as propertyId,
        fecha_cambio as date,
        precio_anterior as previousPrice,
        precio_nuevo as newPrice,
        a.nombre || ' ' || a.apellido as changedBy
      FROM historial_precio_inmueble hpi
      LEFT JOIN agente a ON hpi.idagente_modificador = a.idagente
      WHERE idinmueble = $1
      ORDER BY fecha_cambio DESC
      `,
      [propertyId]
    );
    
    return result.rows;
  } catch (error) {
    console.error("Error en getPriceChangesByProperty:", error);
    return [];
  }
};

const getPriceChanges = async (propertyId) => {
  return getPriceChangesByProperty(propertyId);
};

const getTimelineByProperty = async (propertyId) => {
  try {
    const timeline = [];

    const propertyResult = await query(
      `SELECT fecha_creacion as date, titulo as title, idagente as agentId
       FROM inmueble WHERE idinmueble = $1`,
      [propertyId]
    );
    
    if (propertyResult.rows.length > 0) {
      const prop = propertyResult.rows[0];
      timeline.push({
        id: `captacion-${propertyId}`,
        propertyId,
        date: prop.date,
        type: "captacion",
        title: "Propiedad captada",
        description: `Propiedad "${prop.title}" fue captada`,
        by: prop.agentId
      });
    }

    const priceChanges = await getPriceChangesByProperty(propertyId);
    priceChanges.forEach(pc => {
      timeline.push({
        id: `price-${pc.id}`,
        propertyId,
        date: pc.date,
        type: "cambio_precio",
        title: "Cambio de precio",
        description: `Precio actualizado de ${pc.previousPrice} a ${pc.newPrice}`,
        by: pc.changedBy
      });
    });

    const offers = await getOffersByProperty(propertyId);
    offers.forEach(offer => {
      timeline.push({
        id: `offer-${offer.id}`,
        propertyId,
        date: offer.date,
        type: "oferta",
        title: "Nueva oferta",
        description: `Oferta de ${offer.amount} por ${offer.offeredBy}`,
        by: "Sistema"
      });
    });

    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return timeline;
  } catch (error) {
    console.error("Error en getTimelineByProperty:", error);
    return [];
  }
};

const getTimeline = async (propertyId) => {
  return getTimelineByProperty(propertyId);
};

const addTimelineEvent = async (eventData) => {
  try {
    const { propertyId, type, title, description, by, agentName, agentPhone } = eventData;
    
    return {
      id: `event-${Date.now()}`,
      propertyId,
      date: new Date().toISOString(),
      type,
      title,
      description,
      by,
      agentName,
      agentPhone
    };
  } catch (error) {
    console.error("Error en addTimelineEvent:", error);
    throw error;
  }
};

const getAgents = async (filters = {}) => {
  try {
    let sql = `
      SELECT 
        a.idagente as id,
        a.nombre as name,
        a.apellido as lastName,
        a.email,
        a.telefono as phone,
        a.ci,
        a.direccion as address,
        a.especializacion as specialization,
        a.rol as role,
        a.estado,
        a.fecha_creacion as joinDate,
        a.idgrupo as groupId,
        g.nombre as groupName,
        a.porcentajeComision,
        (
          SELECT COUNT(*) 
          FROM inmueble 
          WHERE idagente = a.idagente 
          AND estado != 'eliminado'
        ) as propertiesCount
      FROM agente a
      LEFT JOIN grupo g ON a.idgrupo = g.idgrupo
      WHERE a.estado != 'eliminado'
    `;

    const params = [];
    let paramIndex = 1;

    if (filters.searchTerm) {
      sql += ` AND (a.nombre ILIKE $${paramIndex} OR a.apellido ILIKE $${paramIndex} OR a.email ILIKE $${paramIndex})`;
      params.push(`%${filters.searchTerm}%`);
      paramIndex++;
    }

    if (filters.sinGrupo === true) {
      sql += ` AND a.idgrupo IS NULL`;
    }

    if (filters.teamLeaderSinGrupo === true) {
      sql += ` AND a.rol = 'team_leader' AND a.idgrupo IS NULL`;
    }

    sql += ` ORDER BY a.nombre ASC`;

    const result = await query(sql, params);
    
    const agents = await Promise.all(result.rows.map(async (agent) => {
      const socialNetworks = await getAgentSocialNetworks(agent.id);
      return { ...agent, redesSociales: socialNetworks };
    }));

    return agents;
  } catch (error) {
    console.error("Error en getAgents:", error);
    throw error;
  }
};

const getAgentSocialNetworks = async (agentId) => {
  try {
    const result = await query(
      `
      SELECT 
        rsa.url,
        tsr.nombre as type
      FROM red_social_agente rsa
      JOIN tipo_red_social tsr ON rsa.idtipo_red_social = tsr.idtipo_red_social
      WHERE rsa.idagente = $1
      `,
      [agentId]
    );
    
    return result.rows.map(row => ({
      type: row.type.toLowerCase(),
      name: row.type,
      url: row.url
    }));
  } catch (error) {
    console.error("Error en getAgentSocialNetworks:", error);
    return [];
  }
};

const getAgentById = async (id) => {
  try {
    const result = await query(
      `
      SELECT 
        a.idagente as id,
        a.nombre as name,
        a.apellido as lastName,
        a.email,
        a.telefono as phone,
        a.ci,
        a.direccion as address,
        a.especializacion as specialization,
        a.rol as role,
        a.estado,
        a.fecha_creacion as joinDate,
        a.idgrupo as groupId,
        g.nombre as groupName,
        a.porcentajeComision,
        (
          SELECT COUNT(*) 
          FROM inmueble 
          WHERE idagente = a.idagente 
          AND estado != 'eliminado'
        ) as propertiesCount,
        (
          SELECT json_agg(json_build_object('id', idinmueble, 'title', titulo))
          FROM inmueble 
          WHERE idagente = a.idagente 
          AND estado != 'eliminado'
          LIMIT 5
        ) as capturedProperties
      FROM agente a
      LEFT JOIN grupo g ON a.idgrupo = g.idgrupo
      WHERE a.idagente = $1 AND a.estado != 'eliminado'
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const agent = result.rows[0];
    const socialNetworks = await getAgentSocialNetworks(id);
    
    return { ...agent, redesSociales: socialNetworks };
  } catch (error) {
    console.error("Error en getAgentById:", error);
    throw error;
  }
};

const getFullCRMData = async () => {
  try {
    const [properties, agents] = await Promise.all([
      getProperties(),
      getAgents()
    ]);

    const priceChanges = {};
    const offers = {};
    const timeline = {};

    for (const property of properties) {
      priceChanges[property.id] = await getPriceChangesByProperty(property.id);
      offers[property.id] = await getOffersByProperty(property.id);
      timeline[property.id] = await getTimelineByProperty(property.id);
    }

    return {
      properties,
      agents,
      priceChanges,
      offers,
      timeline
    };
  } catch (error) {
    console.error("Error en getFullCRMData:", error);
    throw error;
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