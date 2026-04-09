const { query } = require("../../db");
const bcrypt = require("bcrypt");

const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    const userResult = await query(
      "SELECT contrasenia FROM Agente WHERE idAgente = $1 AND estado != $2",
      [userId, "eliminado"],
    );

    if (userResult.rows.length === 0) {
      return { error: "USER_NOT_FOUND" };
    }

    const user = userResult.rows[0];

    const isValid = await bcrypt.compare(currentPassword, user.contrasenia);
    if (!isValid) {
      return { error: "INVALID_PASSWORD" };
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.contrasenia);
    if (isSamePassword) {
      return { error: "SAME_PASSWORD" };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await query("UPDATE Agente SET contrasenia = $1 WHERE idAgente = $2", [
      hashedPassword,
      userId,
    ]);

    return { success: true };
  } catch (error) {
    console.error("Error en changePassword:", error);
    throw error;
  }
};

const getProfile = async (userId) => {
  try {
    const result = await query(
      `SELECT 
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
        CASE WHEN foto IS NOT NULL THEN '/agentes/photo/' || idAgente::text ELSE NULL END as photo
      FROM Agente 
      WHERE idAgente = $1 AND estado != $2`,
      [userId, "eliminado"],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const profile = result.rows[0];
    return {
      ...profile,
      active: profile.estado === "activo",
    };
  } catch (error) {
    console.error("Error en getProfile:", error);
    throw error;
  }
};

const updateProfile = async (userId, profileData) => {
  try {
    const { name, lastName, email, phone, ci, address } = profileData;

    console.log("Buscando usuario con ID:", userId);

    // Verificar que el usuario existe
    const currentUser = await query(
      "SELECT * FROM Agente WHERE idAgente = $1 AND estado != $2",
      [userId, "eliminado"],
    );

    console.log("Usuario encontrado:", currentUser.rows.length);

    if (currentUser.rows.length === 0) {
      return null;
    }

    const userActual = currentUser.rows[0];

    // Verificar si el email ya existe (si está cambiando)
    if (email && email !== userActual.email) {
      const emailExists = await query(
        "SELECT idAgente FROM Agente WHERE email = $1 AND idAgente != $2",
        [email, userId],
      );
      if (emailExists.rows.length > 0) {
        return { error: "EMAIL_EXISTS" };
      }
    }

    // Verificar si el CI ya existe (si está cambiando)
    if (ci && ci !== userActual.ci) {
      const ciExists = await query(
        "SELECT idAgente FROM Agente WHERE ci = $1 AND idAgente != $2",
        [ci, userId],
      );
      if (ciExists.rows.length > 0) {
        return { error: "CI_EXISTS" };
      }
    }

    // Construir la consulta de actualización
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined && name !== userActual.nombre) {
      updates.push(`nombre = $${paramIndex++}`);
      values.push(name);
    }
    if (lastName !== undefined && lastName !== userActual.apellido) {
      updates.push(`apellido = $${paramIndex++}`);
      values.push(lastName);
    }
    if (email !== undefined && email !== userActual.email) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (phone !== undefined && phone !== userActual.telefono) {
      updates.push(`telefono = $${paramIndex++}`);
      values.push(phone);
    }
    if (ci !== undefined && ci !== userActual.ci) {
      updates.push(`ci = $${paramIndex++}`);
      values.push(ci);
    }
    if (address !== undefined && address !== userActual.direccion) {
      updates.push(`direccion = $${paramIndex++}`);
      values.push(address);
    }

    // Si no hay nada que actualizar
    if (updates.length === 0) {
      return await getProfile(userId);
    }

    values.push(userId);

    const result = await query(
      `UPDATE Agente 
       SET ${updates.join(", ")} 
       WHERE idAgente = $${paramIndex} AND estado != 'eliminado'
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
        CASE WHEN foto IS NOT NULL THEN '/agentes/photo/' || idAgente::text ELSE NULL END as photo`,
      values,
    );

    if (result.rows.length === 0) {
      return null;
    }

    const updatedProfile = result.rows[0];
    return {
      ...updatedProfile,
      active: updatedProfile.estado === "activo",
    };
  } catch (error) {
    console.error("Error en updateProfile:", error);
    throw error;
  }
};

const updatePhoto = async (userId, photoBuffer) => {
  try {
    const result = await query(
      `UPDATE Agente 
       SET foto = $1 
       WHERE idAgente = $2 AND estado != 'eliminado'
       RETURNING 
        idAgente as id,
        CASE WHEN foto IS NOT NULL THEN '/agentes/photo/' || idAgente::text ELSE NULL END as photo`,
      [photoBuffer, userId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error("Error en updatePhoto:", error);
    throw error;
  }
};

module.exports = {
  changePassword,
  getProfile,
  updateProfile,
  updatePhoto,
};
