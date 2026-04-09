const sidebarService = require("../services/sidebarService");

const changePassword = async (req, res) => {
  try {
    // El middleware pone el usuario en req.user con los campos de la BD
    const userId = req.user.idagente; // Cambiado de req.user.id a req.user.idagente
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "La contraseña actual y la nueva contraseña son obligatorias",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "La nueva contraseña debe tener al menos 6 caracteres",
      });
    }

    const result = await sidebarService.changePassword(
      userId,
      currentPassword,
      newPassword,
    );

    if (result.error === "INVALID_PASSWORD") {
      return res.status(401).json({
        success: false,
        message: "Contraseña actual incorrecta",
      });
    }

    if (result.error === "SAME_PASSWORD") {
      return res.status(400).json({
        success: false,
        message: "La nueva contraseña debe ser diferente a la actual",
      });
    }

    res.status(200).json({
      success: true,
      message: "Contraseña cambiada exitosamente",
    });
  } catch (error) {
    console.error("Error en changePassword:", error);
    res.status(500).json({
      success: false,
      message: "Error al cambiar la contraseña",
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.idagente; // Cambiado
    const profile = await sidebarService.getProfile(userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("Error en getProfile:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener el perfil",
    });
  }
};

const updateOwnProfile = async (req, res) => {
  try {
    const userId = req.user.idagente; // Cambiado de req.user.id a req.user.idagente
    const profileData = req.body;

    console.log("Actualizando perfil del usuario (ID):", userId);
    console.log("Datos recibidos:", profileData);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "ID de usuario no encontrado",
      });
    }

    const result = await sidebarService.updateProfile(userId, profileData);

    if (result && result.error) {
      if (result.error === "EMAIL_EXISTS") {
        return res.status(409).json({
          success: false,
          message: "El email ya está registrado por otro usuario",
        });
      }

      if (result.error === "CI_EXISTS") {
        return res.status(409).json({
          success: false,
          message: "El CI ya está registrado por otro usuario",
        });
      }
    }

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    res.status(200).json({
      success: true,
      message: "Perfil actualizado exitosamente",
      data: result,
    });
  } catch (error) {
    console.error("Error en updateOwnProfile:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar el perfil: " + error.message,
    });
  }
};

const updateOwnPhoto = async (req, res) => {
  try {
    const userId = req.user.idagente; // Cambiado

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No se proporcionó ninguna imagen",
      });
    }

    const photoBuffer = req.file.buffer;
    const result = await sidebarService.updatePhoto(userId, photoBuffer);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    res.status(200).json({
      success: true,
      message: "Foto actualizada exitosamente",
      data: result,
    });
  } catch (error) {
    console.error("Error en updateOwnPhoto:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar la foto",
    });
  }
};

const updatePhoto = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user.idagente; // Cambiado

    if (userId !== currentUserId && req.user.rol !== "administrador") {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para actualizar esta foto",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No se proporcionó ninguna imagen",
      });
    }

    const photoBuffer = req.file.buffer;
    const result = await sidebarService.updatePhoto(userId, photoBuffer);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    res.status(200).json({
      success: true,
      message: "Foto actualizada exitosamente",
      data: result,
    });
  } catch (error) {
    console.error("Error en updatePhoto:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar la foto",
    });
  }
};

module.exports = {
  changePassword,
  getProfile,
  updateOwnProfile,
  updateOwnPhoto,
  updatePhoto,
};
