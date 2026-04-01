const express = require("express");
const cors = require("cors");
const { connectDB } = require("./db");

const app = express();

const allowedOrigins = [
  "http://localhost:8080",
  "https://inmobiliriafenix.netlify.app",
  "https://inmobiliariafenix-back.onrender.com",
];

// Opciones de configuración CORS
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.some((allowedOrigin) =>
        origin.includes(allowedOrigin.replace(/https?:\/\//, "")),
      )
    ) {
      return callback(null, true);
    }

    const msg = `El origen ${origin} no tiene permiso de acceso.`;
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Aplica CORS
app.use(cors(corsOptions));

// Maneja solicitudes preflight (OPTIONS)
app.options("*", cors(corsOptions));

// ✅ CONFIGURACIÓN CORREGIDA: Aumentar límite para TODAS las rutas
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const loginRoutes = require("./src/routes/loginroutes");
app.use("/api/login", loginRoutes);

const cuadrantesRoutes = require("./src/routes/cuadrantesRoutes");
app.use("/api/cuadrantes", cuadrantesRoutes);

const documentManagementRoutes = require("./src/routes/DocumentManagementRoutes");
app.use("/api/documentos", documentManagementRoutes);

const propertyManagementRoutes = require("./src/routes/PropertyManagementRoutes");
app.use("/api", propertyManagementRoutes);

const agentesRoutes = require("./src/routes/agentesRoutes");
app.use("/api/agentes", agentesRoutes);

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Ruta 404 para manejar rutas no encontradas
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.originalUrl}`,
  });
});

// Iniciar el servidor
const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error("Error al iniciar el servidor:", error);
    process.exit(1);
  }
};

startServer();
