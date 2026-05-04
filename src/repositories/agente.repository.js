const { query } = require("../../db");

  const findById = async (id) => {
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
        g.nombre as "groupName",
        a.porcentajeComision as "porcentajeComision"
      FROM agente a
      LEFT JOIN grupo g ON a.idgrupo = g.idgrupo
      WHERE a.idAgente = $1 AND a.estado != 'eliminado'`,
      [id]
    );
    return result.rows[0] || null;
  }

  const findSocialNetworksByAgenteId = async (agenteId) => {
    const result = await query(
      `SELECT 
        tsr.nombre as type,
        rsa.url,
        rsa.otro_nombre as "customName"
      FROM red_social_agente rsa
      JOIN tipo_red_social tsr ON rsa.idtipo_red_social = tsr.idtipo_red_social
      WHERE rsa.idagente = $1`,
      [agenteId]
    );
    
    return result.rows.map(row => ({
      type: row.type,
      url: row.url,
      customName: row.customName
    }));
  }

  const checkEmailExists = async (email, excludeId = null) => {
    let queryText = `SELECT idAgente FROM Agente WHERE email = $1`;
    const params = [email];
    
    if (excludeId) {
      queryText += ` AND idAgente != $2`;
      params.push(excludeId);
    }
    
    const result = await query(queryText, params);
    return result.rows.length > 0;
  }

  const checkCiExists = async (ci, excludeId = null) => {
    let queryText = `SELECT idAgente FROM Agente WHERE ci = $1`;
    const params = [ci];
    
    if (excludeId) {
      queryText += ` AND idAgente != $2`;
      params.push(excludeId);
    }
    
    const result = await query(queryText, params);
    return result.rows.length > 0;
  }

  const countAgentsInGroup = async (groupId) => {
    const result = await query(
      `SELECT COUNT(*) as total
       FROM Agente
       WHERE idgrupo = $1 AND estado != 'eliminado'`,
      [groupId]
    );
    return parseInt(result.rows[0].total);
  }

  const create = async (agenteData, hashedPassword, photoBuffer = null) => {
    const result = await query(
      `INSERT INTO agente (
        nombre, apellido, email, telefono, ci, direccion, 
        foto, especializacion, rol, estado, idgrupo, contrasenia,
        porcentajecomision
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING 
        idAgente as id,
        nombre as name,
        apellido as "lastName",
        email,
        telefono as phone,
        ci,
        direccion as address,
        especializacion as specialization,
        rol as role,
        estado,
        fecha_creacion as "joinDate",
        idgrupo as "groupId",
        porcentajecomision as "porcentajeComision"`,
      [
        agenteData.nombre, agenteData.apellido, agenteData.email, 
        agenteData.telefono, agenteData.ci, agenteData.direccion,
        photoBuffer, agenteData.especializacion, agenteData.rol, 
        agenteData.estado, agenteData.idgrupo, hashedPassword,
        agenteData.porcentajecomision
      ]
    );
    return result.rows[0];
  }

  const addSocialNetwork = async (agenteId, tipoRedSocialId, url, otroNombre = null) => {
    await query(
      `INSERT INTO red_social_agente (idagente, idtipo_red_social, url, otro_nombre)
       VALUES ($1, $2, $3, $4)`,
      [agenteId, tipoRedSocialId, url, otroNombre]
    );
  }

  const findSocialNetworkTypeId = async (nombre) => {
    const result = await query(
      `SELECT idtipo_red_social FROM tipo_red_social WHERE nombre = $1`,
      [nombre]
    );
    return result.rows[0]?.idtipo_red_social || null;
  }

  const updateAgente = async (id, updateData) => {
    if (Object.keys(updateData).length === 0) return true;
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(updateData)) {
      updates.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
    
    values.push(id);
    await query(
      `UPDATE Agente 
       SET ${updates.join(', ')} 
       WHERE idAgente = $${paramIndex} AND estado != 'eliminado'`,
      values
    );
    return true;
  }

  const updateSocialNetwork = async (idRedSocial, newUrl, otroNombre = null) => {
    const queryText = `
      UPDATE red_social_agente 
      SET url = $1, 
          otro_nombre = $2
      WHERE idred_social = $3
    `;
    const params = [newUrl, otroNombre, idRedSocial];
    
    await query(queryText, params);
  }

  const deleteSocialNetwork = async (idred_social) => {
    let queryText = `DELETE FROM red_social_agente 
                     WHERE idred_social = $1`;
    const params = [idred_social];
    
    await query(queryText, params);
  }

  const getAllSocialNetworksByAgenteId = async (agenteId) => {
    const result = await query(
      `SELECT 
        rsa.idred_social,
        tsr.nombre as type,
        rsa.url,
        rsa.otro_nombre as "customName"
      FROM red_social_agente rsa
      JOIN tipo_red_social tsr ON rsa.idtipo_red_social = tsr.idtipo_red_social
      WHERE rsa.idagente = $1`,
      [agenteId]
    );
    return result.rows;
  }

  const findCurrentAgente = async (id) => {
    const result = await query(
      `SELECT 
        a.idAgente,
        a.nombre,
        a.apellido,
        a.email,
        a.telefono,
        a.ci,
        a.direccion,
        a.especializacion,
        a.rol,
        a.estado,
        a.fecha_creacion,
        a.idgrupo,
        a.porcentajeComision
      FROM Agente a WHERE a.idAgente = $1 AND a.estado != $2`,
      [id, 'eliminado']
    );
    return result.rows[0] || null;
  }

module.exports = {
    findById,
    findSocialNetworksByAgenteId,
    checkEmailExists,
    checkCiExists,
    countAgentsInGroup,
    create,
    addSocialNetwork,
    findSocialNetworkTypeId,
    updateAgente,
    findCurrentAgente,
    getAllSocialNetworksByAgenteId,
    deleteSocialNetwork,
    updateSocialNetwork,
}