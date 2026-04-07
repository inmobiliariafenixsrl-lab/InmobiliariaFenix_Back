const { query } = require("../../db");
const bcrypt = require("bcrypt");

const getAllAgentes = async (user, filters = {}) => {
  try {
    const { 
      searchTerm, 
      sinGrupo, 
      teamLeaderSinGrupo,
      page = 1,
      limit = 10 
    } = filters;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCounter = 1;
    
    whereConditions.push(`a.estado != 'eliminado'`);
    
    if (user.rol === 'team_leader') {
      if (searchTerm && searchTerm.trim()) {
        whereConditions.push(`(a.idgrupo IS NULL OR a.idgrupo = $${paramCounter}) AND a.rol = 'agente'`);
        queryParams.push(user.idgrupo);
        paramCounter++;
      } else {
        whereConditions.push(`a.idgrupo = $${paramCounter}`);
        queryParams.push(user.idgrupo);
        paramCounter++;
      }
    }
    
    if (searchTerm && searchTerm.trim()) {
      whereConditions.push(`(a.nombre ILIKE $${paramCounter} OR a.apellido ILIKE $${paramCounter} OR a.ci::text ILIKE $${paramCounter})`);
      queryParams.push(`%${searchTerm.trim()}%`);
      paramCounter++;
    }
    
    if (sinGrupo) {
      whereConditions.push(`a.idgrupo IS NULL AND a.rol = 'agente'`);
    }
    
    if (teamLeaderSinGrupo) {
      whereConditions.push(`a.rol = 'team_leader' AND a.idgrupo IS NULL`);
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    const offset = (page - 1) * limit;
    
    const [countResult, result] = await Promise.all([
      query(
        `SELECT COUNT(*) as total
         FROM Agente a
         ${whereClause}`,
        queryParams
      ),
      query(
      `SELECT
        a.idAgente as id,
        a.nombre as name,
        a.apellido as "lastName",
        a.email,
        a.telefono as phone,
        a.ci,
        a.direccion as address,
        a.especializacion as specialization,
        a.rol as role,
        a.estado,
        a.fecha_creacion as "joinDate",
        a.idgrupo as "groupId",
        g.nombre as "groupName",
        CASE WHEN a.estado = 'activo' THEN 0 ELSE 1 END as status_order,
        COALESCE(i.propertiesCount, 0) as "propertiesCount"
      FROM Agente a
      LEFT JOIN Grupo g ON a.idgrupo = g.idgrupo
      LEFT JOIN (
        SELECT idagente, COUNT(*) as propertiesCount
        FROM Inmueble
        WHERE estado != 'eliminado'
        GROUP BY idagente
      ) i ON i.idagente = a.idAgente
      ${whereClause}
      ORDER BY status_order, a.nombre ASC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`,
      [...queryParams, limit, offset]
    )
    ])
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    const agentes = setPhotoURL(result.rows.map(agente => ({
      ...agente,
      active: agente.estado === 'activo',
      joinDate: agente.joinDate ? new Date(agente.joinDate).toISOString().split('T')[0] : null,
      propertiesCount: parseInt(agente.propertiesCount) || 0,
    })));
    
    return {
      data: agentes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  } catch (error) {
    console.error("Error en getAllAgentes:", error);
    throw error;
  }
};

const getAgenteById = async (id) => {
  try {
    const result = await query(
      `SELECT 
        a.idAgente as id,
        a.nombre as name,
        a.apellido as "lastName",
        a.email,
        a.telefono as phone,
        a.ci,
        a.direccion as address,
        a.especializacion as specialization,
        a.rol as role,
        a.estado,
        a.fecha_creacion as "joinDate",
        a.idgrupo as "groupId",
        g.nombre as "groupName"
      FROM Agente a
      LEFT JOIN Grupo g ON a.idgrupo = g.idgrupo
      WHERE a.idAgente = $1 AND a.estado != 'eliminado'`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const agente = result.rows[0];
    const date = Date.now()
    return {
      ...agente,
      photo: `/agentes/photo/${agente.id}?t=${date}`,
      active: agente.estado === 'activo',
      joinDate: agente.joinDate ? new Date(agente.joinDate).toISOString().split('T')[0] : null,
    };
  } catch (error) {
    console.error("Error en getAgenteById:", error);
    throw error;
  }
};

const createAgente = async (agenteData, user) => {
  try {
    let {
      name,
      lastName,
      email,
      phone,
      ci,
      address,
      photo,
      specialization,
      role,
      groupId,
      password
    } = agenteData;
    
    if(user.rol === 'team_leader'){
        groupId = user.idgrupo
    }

    if (groupId){
      const countAgents = await query(
      `SELECT COUNT(*) as total_agentes
        FROM Agente
        WHERE idgrupo = $1
          AND estado != 'eliminado'`,
      [groupId]
      );
      if (countAgents.rows[0].total_agentes >= 10){
        return { error: 'LIMIT_REACHED' };
      }
    }
    
    if (email) {
      const emailExists = await query(
        `SELECT idAgente FROM Agente WHERE email = $1`,
        [email]
      );
      if (emailExists.rows.length > 0) {
        return { error: 'EMAIL_EXISTS' };
      }
    }
    
    if (ci) {
      const ciExists = await query(
        `SELECT idAgente FROM Agente WHERE ci = $1`,
        [ci]
      );
      if (ciExists.rows.length > 0) {
        return { error: 'CI_EXISTS' };
      }
    }
    
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    } else {
      hashedPassword = await bcrypt.hash(ci, 10);
    }
    
    const estado = 'activo';
    
    const result = await query(
      `INSERT INTO Agente (
        nombre, apellido, email, telefono, ci, direccion, 
        foto, especializacion, rol, estado, idgrupo, contrasenia
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING 
        idAgente as id,
        nombre as name,
        apellido as "lastName",
        email,
        telefono as phone,
        ci,
        direccion as address,
        foto as photo,
        especializacion as specialization,
        rol as role,
        estado,
        fecha_creacion as "joinDate",
        idgrupo as "groupId"`,
      [
        name, lastName, email, phone, ci, address,
        photo ? Buffer.from(photo.split(',')[1], 'base64') : null,
        specialization, role, estado, groupId || null, hashedPassword
      ]
    );
    
    const nuevoAgente = result.rows[0];
    return {
      ...nuevoAgente,
      active: nuevoAgente.estado === 'activo',
      joinDate: nuevoAgente.joinDate ? new Date(nuevoAgente.joinDate).toISOString().split('T')[0] : null,
      propertiesCount: 0,
      capturedProperties: [],
      photo: nuevoAgente.photo 
        ? `/agentes/photo/${nuevoAgente.id}?t=${Date.now()}`
        : null
    };
  } catch (error) {
    console.error("Error en createAgente:", error);
    
    if (error.code === '23505') {
      if (error.constraint === 'agente_email_unique') {
        return { error: 'EMAIL_EXISTS' };
      }
      if (error.constraint === 'agente_ci_unique') {
        return { error: 'CI_EXISTS' };
      }
    }
    
    throw error;
  }
};

const updateAgente = async (id, agenteData, user) => {
  try {
    const {
      name,
      lastName,
      email,
      phone,
      ci,
      address,
      photo,
      specialization,
      role,
      groupId: groupIdRaw,
      active
    } = agenteData;
    const groupId = groupIdRaw ? Number(groupIdRaw) : null;

    const currentAgente = await query(
      'SELECT * FROM Agente WHERE idAgente = $1 AND estado != $2',
      [id, 'eliminado']
    );
    
    if (currentAgente.rows.length === 0) {
      return null;
    }

    const agenteActual = currentAgente.rows[0];
    
    if (user.rol === 'team_leader' && agenteActual.idgrupo !== null && agenteActual.idgrupo !== user.idgrupo) {
      return null;
    }

    if (email !== undefined && email !== agenteActual.email) {
      const emailExists = await query(
        `SELECT idAgente FROM Agente WHERE email = $1 AND idAgente != $2`,
        [email, id]
      );
      if (emailExists.rows.length > 0) {
        return { error: 'EMAIL_EXISTS' };
      }
    }

    if (ci !== undefined && ci !== agenteActual.ci) {
      const ciExists = await query(
        `SELECT idAgente FROM Agente WHERE ci = $1 AND idAgente != $2`,
        [ci, id]
      );
      if (ciExists.rows.length > 0) {
        return { error: 'CI_EXISTS' };
      }
    }

    const isChangingRole = role !== undefined && role !== agenteActual.rol;
    const isBecomingAdminOrModerator = isChangingRole && ['administrador', 'moderador'].includes(role);
    const isLeavingTeamLeader = isChangingRole && agenteActual.rol === 'team_leader';
    const isBecomingTeamLeader = isChangingRole && role === 'team_leader';
    
    let forceGroupIdNull = false;

    if (isBecomingAdminOrModerator || isLeavingTeamLeader || isBecomingTeamLeader) {
      if (agenteActual.idgrupo) {
        if (agenteActual.rol === 'team_leader') {
          await updateGrupo(agenteActual.idgrupo.toString(), { leaderId: null });
        }
        forceGroupIdNull = true;
      }
    }
    if (!forceGroupIdNull && groupId !== null && groupId !== undefined && groupId !== agenteActual.idgrupo) {
      const countAgents = await query(
        `SELECT COUNT(*) as total_agentes
         FROM Agente
         WHERE idgrupo = $1 AND estado != 'eliminado'`,
        [groupId]
      );
      
      if (parseInt(countAgents.rows[0].total_agentes) >= 10) {
        return { error: 'LIMIT_REACHED' };
      }
    }

    const isTeamLeader = agenteActual.rol === 'team_leader';
    const isChangingGroup = groupId !== undefined && groupId !== agenteActual.idgrupo;
    
    if (isTeamLeader && isChangingGroup && !isChangingRole) {
      if (agenteActual.idgrupo) {
        await updateGrupo(agenteActual.idgrupo.toString(), { leaderId: null });
      }
      
      if (groupId && groupId !== null) {
        const grupoNuevo = await query(
          'SELECT idlider FROM Grupo WHERE idgrupo = $1',
          [groupId]
        );
        
        if (grupoNuevo.rows.length > 0) {
          if (grupoNuevo.rows[0].idlider) {
            return { error: 'GRUPO_OCUPADO'};
          }
          await updateGrupo(groupId.toString(), { leaderId: id });
        }
      }
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      updates.push(`nombre = $${paramIndex++}`);
      values.push(name);
    }
    if (lastName !== undefined) {
      updates.push(`apellido = $${paramIndex++}`);
      values.push(lastName);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push(`telefono = $${paramIndex++}`);
      values.push(phone);
    }
    if (ci !== undefined) {
      updates.push(`ci = $${paramIndex++}`);
      values.push(ci);
    }
    if (address !== undefined) {
      updates.push(`direccion = $${paramIndex++}`);
      values.push(address);
    }
    
    if (photo !== undefined) {
      if (photo === null || photo === '') {
        updates.push(`foto = NULL`);
      } else {
        updates.push(`foto = $${paramIndex++}`);
        const base64Data = photo.includes(',') ? photo.split(',')[1] : photo;
        values.push(Buffer.from(base64Data, 'base64'));
      }
    }
    
    if (specialization !== undefined) {
      updates.push(`especializacion = $${paramIndex++}`);
      values.push(specialization);
    }
    if (role !== undefined) {
      updates.push(`rol = $${paramIndex++}`);
      values.push(role);
    }
    
    if (forceGroupIdNull) {
      updates.push(`idgrupo = NULL`);
    } else if (groupId !== undefined) {
      updates.push(`idgrupo = $${paramIndex++}`);
      values.push(groupId || null);
    }
    
    if (active !== undefined) {
      const estado = active === false ? 'inactivo' : 'activo';
      updates.push(`estado = $${paramIndex++}`);
      values.push(estado);
    }
    
    if (updates.length === 0) {
      return await getAgenteById(id);
    }
    
    values.push(id);
    
    const result = await query(
      `UPDATE Agente 
       SET ${updates.join(', ')} 
       WHERE idAgente = $${paramIndex} AND estado != 'eliminado'
       RETURNING 
        idAgente as id,
        nombre as name,
        apellido as "lastName",
        email,
        telefono as phone,
        ci,
        direccion as address,
        foto as photo,
        especializacion as specialization,
        rol as role,
        estado,
        fecha_creacion as "joinDate",
        idgrupo as "groupId"`,
      values
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const agenteActualizado = result.rows[0];
    return {
      ...agenteActualizado,
      active: agenteActualizado.estado === 'activo',
      joinDate: agenteActualizado.joinDate 
        ? new Date(agenteActualizado.joinDate).toISOString().split('T')[0] 
        : null,
      photo: agenteActualizado.photo 
        ? `/agentes/photo/${agenteActualizado.id}?t=${Date.now()}`
        : null
    };
  } catch (error) {
    console.error("Error en updateAgente:", error);
    if (error.code === '23505') {
      if (error.constraint === 'agente_email_unique') {
        return { error: 'EMAIL_EXISTS' };
      }
      if (error.constraint === 'agente_ci_unique') {
        return { error: 'CI_EXISTS' };
      }
    }
    
    throw error;
  }
};

const updateAgenteEstado = async (id, estado, user) => {
  const estadoValido = ['activo', 'inactivo', 'eliminado'].includes(estado) ? estado : 'inactivo';

  let deletePhoto = '';
  if (estado === 'eliminado'){
    deletePhoto += ', foto = NULL'
  }

  let whereClause = `WHERE idAgente = $2`;
  let params = [estadoValido, id];

  if (user.rol === 'team_leader') {
    whereClause += ` AND idgrupo = $3`;
    params.push(user.idgrupo);
  }

  const result = await query(
    `UPDATE Agente 
     SET estado = $1 ${deletePhoto}
     ${whereClause}
     RETURNING 
      idAgente as id,
      nombre as name,
      apellido as "lastName",
      email,
      telefono as phone,
      ci,
      direccion as address,
      foto as photo,
      especializacion as specialization,
      rol as role,
      estado,
      fecha_creacion as "joinDate",
      idgrupo as "groupId"`,
    params
  );

  if (result.rows.length === 0) {
    return null;
  }

  const agente = result.rows[0];
  return {
    ...agente,
    active: agente.estado === 'activo',
    joinDate: agente.joinDate
      ? new Date(agente.joinDate).toISOString().split('T')[0]
      : null,
    photo: agente.photo 
      ? `/agentes/photo/${agente.id}?t=${Date.now()}`
      : null
  };
};

const getPropiedadesByAgente = async (idAgente) => {
  try {
    const result = await query(
      `SELECT 
        i.idInmueble as id,
        i.titulo as title,
        i.operacion as operation,
        i.tipo_propiedad as propertyType,
        i.direccion as address,
        i.m2_construccion as builtArea,
        i.nro_habitaciones as bedrooms,
        i.nro_baños as bathrooms,
        i.precio_capatacion_m as price,
        i.estado as status,
        i.fecha_creacion as "capturedDate",
        i.descripcion as description,
        i.condicion as condition,
        i.nro_pisos as floors,
        i.nro_estacionamiento as parking,
        i.ascensor as elevator,
        i.garaje as garage,
        i.terraza as terrace,
        i.piscina as pool,
        i.año_construccion as yearBuilt,
        i.latitud as latitude,
        i.longitud as longitude
      FROM Inmueble i
      WHERE i.idagente = $1 AND i.estado != 'eliminado'
      ORDER BY i.fecha_creacion DESC`,
      [idAgente]
    );
    
    const propiedades = result.rows.map(prop => ({
      ...prop,
      price: prop.price || 0,
      zone: prop.address ? prop.address.split(',')[0] : '',
      city: prop.address ? prop.address.split(',').pop()?.trim() || 'Santa Cruz' : 'Santa Cruz',
      images: [] // Las imágenes se manejan en otra tabla
    }));
    
    return propiedades;
  } catch (error) {
    console.error("Error en getPropiedadesByAgente:", error);
    throw error;
  }
};

const getAgentesByGrupo = async (grupoId) => {
  try {
    const result = await query(
      `SELECT 
        a.idAgente as id,
        a.nombre as name,
        a.apellido as "lastName",
        a.especializacion as specialization,
        a.rol as role,
        a.estado
      FROM Agente a
      WHERE a.idgrupo = $1 AND a.estado != 'eliminado'
      ORDER BY a.nombre ASC`,
      [grupoId]
    );
    
    const agentes = result.rows.map(({ estado, ...agente }) => ({
      ...agente,
      active: estado === 'activo',
      photo: `/agentes/photo/${agente.id}?t=${Date.now()}`
    }));
    
    return agentes;
  } catch (error) {
    console.error("Error en getAgentesByGrupo:", error);
    throw error;
  }
};

const getAllGrupos = async (filters = {}, user) => {
  try {
    const { sinLider = false } = filters;
    
    let queryText = `
      SELECT 
        g.idgrupo as id,
        g.nombre as name,
        g.descripcion as description,
        g.idlider as "leaderId",
        CONCAT(l.nombre, ' ', l.apellido) as "leaderName",
        COALESCE(
          (SELECT COUNT(*) 
            FROM Agente a 
            WHERE a.idgrupo = g.idgrupo 
            AND a.estado != 'eliminado'),
          0
        ) as "membersCount",
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', a.idAgente,
                'name', a.nombre
              )
              ORDER BY a.nombre ASC
            )
            FROM Agente a
            WHERE a.idgrupo = g.idgrupo 
            AND a.estado != 'eliminado'
          ),
          '[]'
        ) as agents
      FROM Grupo g
      LEFT JOIN Agente l ON g.idlider = l.idAgente
    `;
    
    const queryParams = [];
    let conditions = [];
    if (user.rol === 'team_leader') {
      if (!user.idgrupo) {
        return [];
      }
      conditions.push(`g.idgrupo = $${queryParams.length + 1}`);
      queryParams.push(user.idgrupo);
    }
    
    if (sinLider) {
      conditions.push(`g.idlider IS NULL`);
    }
    
    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    queryText += ` ORDER BY g.nombre ASC`;
    
    const result = await query(queryText, queryParams);
    return result.rows;
  } catch (error) {
    console.error("Error en getAllGrupos:", error);
    throw error;
  }
};

const getGrupoById = async (id) => {
  try {
    const result = await query(
      `SELECT 
        g.idgrupo as id,
        g.nombre as name,
        g.descripcion as description,
        g.idlider as "leaderId",
        CONCAT(l.nombre, ' ', l.apellido) as "leaderName",
        COALESCE(
          (SELECT COUNT(*) FROM Agente a WHERE a.idgrupo = g.idgrupo AND a.estado != 'eliminado'),
          0
        ) as "membersCount"
      FROM Grupo g
      LEFT JOIN Agente l ON g.idlider = l.idAgente
      WHERE g.idgrupo = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error("Error en getGrupoById:", error);
    throw error;
  }
};

const createGrupo = async (grupoData) => {
  try {
    const { name, description, leaderId } = grupoData;

    const result = await query(
      `INSERT INTO Grupo (nombre, descripcion, idlider)
       SELECT 
         $1, 
         $2, 
         a.idAgente
       FROM (
         SELECT $3::int as id
       ) input
       LEFT JOIN Agente a 
         ON a.idAgente = input.id
        AND a.rol = 'team_leader'
        AND a.estado != 'eliminado'
       WHERE input.id IS NULL OR a.idAgente IS NOT NULL
       RETURNING 
        idgrupo as id,
        nombre as name,
        descripcion as description,
        idlider as "leaderId";`,
      [name, description || null, leaderId || null]
    );

    if (result.rows.length === 0) {
      throw new Error('El agente no es un team leader');
    }

    const grupo = result.rows[0];

    if (grupo.leaderId) {
      await query(
        `UPDATE Agente
         SET idgrupo = $1
         WHERE idAgente = $2`,
        [grupo.id, grupo.leaderId]
      );
    }

    return grupo;

  } catch (error) {
    console.error("Error en createGrupo:", error);
    throw error;
  }
};

const updateGrupo = async (id, grupoData) => {
  try {
    const { name, description, leaderId } = grupoData;

    const currentGrupo = await query(
      'SELECT * FROM Grupo WHERE idgrupo = $1',
      [id]
    );

    if (currentGrupo.rows.length === 0) {
      return null;
    }

    const grupoActual = currentGrupo.rows[0];
    const oldLeaderId = grupoActual.idlider;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`nombre = $${paramIndex++}`);
      values.push(name);
    }

    if (description !== undefined) {
      updates.push(`descripcion = $${paramIndex++}`);
      values.push(description);
    }

    let useLeaderValidation = false;

    if (leaderId !== undefined) {
      if (leaderId === null) {
        updates.push(`idlider = NULL`);
      } else {
        useLeaderValidation = true;
        updates.push(`idlider = a.idAgente`);
        values.push(leaderId);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return await getGrupoById(id);
    }

    values.push(id);

    const result = await query(
      `UPDATE Grupo g
       SET ${updates.join(', ')}
       ${useLeaderValidation ? 'FROM Agente a' : ''}
       WHERE g.idgrupo = $${paramIndex}
       ${
         useLeaderValidation
           ? `AND a.idAgente = $${paramIndex - 1}
              AND a.rol = 'team_leader'
              AND a.estado != 'eliminado'`
           : ''
       }
       RETURNING 
        g.idgrupo as id,
        g.nombre as name,
        g.descripcion as description,
        g.idlider as "leaderId"`,
      values
    );

    if (result.rows.length === 0) {
      if (leaderId !== undefined && leaderId !== null) {
        throw new Error('El agente no es un team leader');
      }
      return null;
    }

    const grupo = result.rows[0];

    if (
      leaderId !== undefined &&
      oldLeaderId &&
      oldLeaderId !== leaderId
    ) {
      await query(
        `UPDATE Agente
         SET idgrupo = NULL
         WHERE idagente = $1`,
        [oldLeaderId]
      );
    }

    if (grupo.leaderId) {
      await query(
        `UPDATE Agente
         SET idgrupo = $1
         WHERE idAgente = $2`,
        [grupo.id, grupo.leaderId]
      );
    }

    return grupo;

  } catch (error) {
    console.error("Error en updateGrupo:", error);
    throw error;
  }
};

const deleteGrupo = async (id) => {
  try {
    const grupo = await query(
      'SELECT * FROM Grupo WHERE idgrupo = $1',
      [id]
    );
    
    if (grupo.rows.length === 0) {
      return false;
    }
    
    await query(
      'UPDATE Agente SET idgrupo = NULL WHERE idgrupo = $1',
      [id]
    );

    await query(
      'DELETE FROM Grupo WHERE idgrupo = $1',
      [id]
    );
    
    return true;
  } catch (error) {
    console.error("Error en deleteGrupo:", error);
    throw error;
  }
};

const getAgentePhotoById = async (id) => {
  try {
    const result = await query(
      `SELECT foto 
       FROM Agente 
       WHERE idAgente = $1 
         AND estado != 'eliminado'`,
      [id]
    );

    if (result.rows.length === 0 || !result.rows[0].foto) {
      return null;
    }

    return result.rows[0].foto;
  } catch (error) {
    console.error("Error en getAgentePhotoById:", error);
    throw error;
  }
};

const setPhotoURL = (agentes) => {
  if (!Array.isArray(agentes) || agentes.length === 0) {
    return [];
  }
  const date = Date.now();
  return agentes.map(agente => ({
    ...agente,
    photo: `/agentes/photo/${agente.id}?t=${date}`
  }));
};

module.exports = {
  getAllGrupos,
  getGrupoById,
  createGrupo,
  updateGrupo,
  deleteGrupo,
  getAllAgentes,
  getAgenteById,
  createAgente,
  updateAgente,
  updateAgenteEstado,
  getPropiedadesByAgente,
  getAgentesByGrupo,
  getAgentePhotoById,
  setPhotoURL
};