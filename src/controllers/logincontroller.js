// src/controllers/logincontroller.js
const authService = require("../services/loginservice");
const { generateToken } = require("../utils/jwtUtils");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email y contraseña son requeridos",
      });
    }

    const user = await authService.authenticateUser(email, password);

    // Preparar datos del usuario para la respuesta
    const userResponse = {
      idagente: user.idagente,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      telefono: user.telefono,
      ci: user.ci,
      rol: user.rol,
      idgrupo: user.idgrupo,
      especializacion: user.especializacion,
      foto: user.foto ? user.foto.toString('base64') : null,
    };

    // Generar token
    const token = generateToken({
      id: user.idagente,
      email: user.email,
      role: user.rol,
    });

    res.json({
      success: true,
      message: "Autenticación exitosa",
      token,
      user: userResponse,
      expiresIn: "8h",
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(401).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const verifyToken = (req, res) => {
  // Preparar datos del usuario desde el middleware
  const userResponse = {
    idagente: req.user.idagente,
    nombre: req.user.nombre,
    apellido: req.user.apellido,
    email: req.user.email,
    telefono: req.user.telefono,
    ci: req.user.ci,
    rol: req.user.rol,
    idgrupo: req.user.idgrupo,
    especializacion: req.user.especializacion,
    foto: req.user.foto ? req.user.foto.toString('base64') : null,
  };

  res.json({
    success: true,
    user: userResponse,
  });
};

module.exports = {
  login,
  verifyToken,
};