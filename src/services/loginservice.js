// src/services/loginservice.js
const { query } = require("../../db");
const bcrypt = require("bcrypt");

const authenticateUser = async (email, password) => {
  try {
    console.log(`Autenticando usuario con email: ${email}`);

    // Buscar en la tabla Agente
    const result = await query(
      `SELECT 
        idAgente,
        nombre,
        apellido,
        email,
        telefono,
        ci,
        direccion,
        foto,
        especializacion,
        rol,
        estado,
        idgrupo,
        contrasenia
      FROM Agente 
      WHERE email = $1 AND estado != 'eliminado'`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log("Usuario no encontrado");
      throw new Error("Usuario no encontrado");
    }

    const user = result.rows[0];

    // Verificar si el usuario está activo
    if (user.estado !== 'activo') {
      console.log("Usuario inactivo");
      throw new Error("Usuario inactivo. Contacte al administrador.");
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.contrasenia);

    console.log("Resultado de comparación de contraseña:", isMatch);

    if (!isMatch) {
      console.log("Contraseña no coincide");
      throw new Error("Contraseña incorrecta");
    }

    // Eliminar la contraseña del objeto de retorno
    delete user.contrasenia;

    console.log("Usuario autenticado exitosamente:", {
      idagente: user.idagente,
      email: user.email,
      rol: user.rol,
      idgrupo: user.idgrupo
    });

    return user;
  } catch (error) {
    console.error("Error en authService:", error);
    throw error;
  }
};

module.exports = {
  authenticateUser,
};