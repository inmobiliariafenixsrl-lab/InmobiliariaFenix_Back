const { query } = require("../../db");
const AgenteMapper = require('../mappers/agente.mapper');
const cuadrantesService = require('../services/cuadrantesService');

const canEditPropertyPrice = async (agentId, user) => {
  if (user.rol === 'administrador') {
    return true;
  }
  
  if (user.rol === 'team_leader') {
    try {
      const result = await query(
        `SELECT EXISTS(
          SELECT 1 
          FROM agente a1
          JOIN agente a2 ON a1.idgrupo = a2.idgrupo
          WHERE a1.idagente = $1 
            AND a2.idagente = $2
            AND a1.idgrupo IS NOT NULL
        ) AS same_group`,
        [user.idagente, agentId]
      );

      return result.rows[0].same_group;
    } catch (error) {
      console.error("Error verificando permisos de team_leader:", error);
      return false;
    }
  }
  
  if (user.rol === 'agente') {
    return user.idagente === agentId;
  }
  
  return false;
};

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
        i.porcentajeComision as "porcentajeComision",
        i.precio_capatacion_m as "minPrice",
        i.precio_captacion_i as "idealPrice",
        i.fecha_creacion as "createdDate"
      FROM inmueble i
      LEFT JOIN agente a ON i.idagente = a.idagente
      LEFT JOIN municipio m ON i.idmunicipio = m.idmunicipio
      LEFT JOIN provincia p ON m.idprovincia = p.idprovincia
      LEFT JOIN departamento d ON p.iddepartamento = d.iddepartamento
      WHERE (i.estado = 'activo' OR i.estado = 'reservado' OR i.estado = 'vendido')
    `;

    const params = [];
    let paramIndex = 1;

    if (filters.searchTerm && filters.searchTerm.trim()) {
      sql += ` AND (
        i.titulo ILIKE $${paramIndex} OR 
        m.nombre ILIKE $${paramIndex} OR 
        p.nombre ILIKE $${paramIndex} OR
        a.nombre ILIKE $${paramIndex} OR
        a.apellido ILIKE $${paramIndex}
      )`;
      params.push(`%${filters.searchTerm.trim()}%`);
      paramIndex++;
    }

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

    return result.rows;
  } catch (error) {
    console.error("Error en getProperties:", error);
    throw error;
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
    
    const [priceChanges, offers] = await Promise.all([
      getPriceChangesByProperty(id),
      getOffersByProperty(id),
    ]);
		const timeline = await getTimelineByProperty(id, priceChanges, offers);

    return {
      ...property,
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

const updatePropertyPrice = async (propertyId, newPrice, user) => {
  try {
    const property = await getPropertyById(propertyId);
    if (!property) {
      throw new Error("Propiedad no encontrada");
    }

    if(!(await canEditPropertyPrice(property.agentId, user))){
      return { error: 'PERMISSION_DENIED' };
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
      [propertyId, previousPrice, newPrice, user.idagente]
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
        idinmueble as "propertyId",
        fecha_oferta as date,
        monto_oferta as amount,
        nombre_ofertante as "offeredBy",
        celular_ofertante as phone,
        monto_seña as "depositAmount",
        estado as "status"
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

const createOffer = async (offerData, user) => {
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
      [propertyId, offeredBy, phone, amount, depositAmount, user.idagente]
    );

    await query(
      `
      UPDATE inmueble 
      SET estado = 'reservado'
      WHERE idinmueble = $1
      `,
      [propertyId]
    );

    return result.rows[0];
  } catch (error) {
    console.error("Error en createOffer:", error);
    throw error;
  }
};

const updateOfferStatus = async (offerId, propertyId, status, user) => {
  try {
    let propertyStatus = '';
    let offerAmount = null;
    
    switch (status) {
      case 'aceptado':
        propertyStatus = 'vendido';
        const offerResult = await query(
          `SELECT monto_oferta FROM oferta_inmueble WHERE idoferta = $1`,
          [offerId]
        );
        
        if (offerResult.rows.length === 0) {
          throw new Error('Oferta no encontrada');
        }
        
        offerAmount = offerResult.rows[0].monto_oferta;
        break;
      case 'rechazado':
        propertyStatus = 'activo';
        break;
      default:
        propertyStatus = 'activo';
    }

    if (status === 'aceptado') {
      await query(
        `
        UPDATE inmueble 
        SET estado = $1, 
            precio_capatacion_s = $2,
            precio_vendido = $2
        WHERE idinmueble = $3
        `,
        [propertyStatus, offerAmount, propertyId]
      );

      await query(
        `
        UPDATE oferta_inmueble
        SET estado = $1,
            idagente_aceptado = $2
        WHERE idoferta = $3
        `,
        ['aceptado', user.idagente, offerId]
      );
      
      await query(
        `
        UPDATE oferta_inmueble
        SET estado = $1
        WHERE idoferta != $2
            AND idinmueble = $3
        `,
        ['rechazado', offerId, propertyId]
      );

      await cuadrantesService.recalcularCuadrante(propertyId);
    } else {
      await query(
        `
        UPDATE inmueble 
        SET estado = $1 
        WHERE idinmueble = $2
        `,
        [propertyStatus, propertyId]
      );
    }

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
        idinmueble as "propertyId",
        fecha_cambio as date,
        precio_anterior as "previousPrice",
        precio_nuevo as "newPrice",
        a.nombre || ' ' || a.apellido as "changedBy"
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

const getTimelineByProperty = async (propertyId, priceChanges, offers) => {
  try {
    const timeline = [];

    const propertyResult = await query(
      `SELECT fecha_creacion as date, titulo as title, idagente as "agentId"
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

    offers.forEach(offer => {
      timeline.push({
        id: `offer-${offer.id}`,
        propertyId,
        date: offer.date,
        type: "oferta",
        title: "Nueva oferta",
        description: `Oferta de ${offer.amount} por ${offer.offeredBy}`
      });
    });

    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    const offerAceptado = offers.find(offer => offer.status === "aceptado");
    const formatPriceUSD = (price) => {
      const roundedNumber = Math.round(price);
      const formattedNumber = roundedNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return `${formattedNumber} USD`;
    };

    if(offerAceptado){
      timeline.push({
        id: `sell-${propertyId}`,
        propertyId,
        type: "cambio_estado",
        title: "Propiedad vendida",
        description: `Vendida por ${formatPriceUSD(offerAceptado.amount)} a ${offerAceptado.offeredBy}`,
        by: offerAceptado.offeredBy,
        newStatus: "vendido",
      })
    }
    
    return timeline;
  } catch (error) {
    console.error("Error en getTimelineByProperty:", error);
    return [];
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

module.exports = {
  getProperties,
  getPropertyById,
  updateProperty,
  updatePropertyPrice,
  createOffer,
  updateOfferStatus,
  getAgentById,
};