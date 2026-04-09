const express = require("express");
const router = express.Router();
const multer = require("multer");
const sidebarController = require("../controllers/sidebarController");
const { authenticate } = require("../middleware/loginmiddleware");

// Configurar multer para memoria
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten imágenes"), false);
    }
  },
});

// Todas las rutas requieren autenticación
router.use(authenticate);

// Cambiar contraseña
router.post("/change-password", sidebarController.changePassword);

// Obtener perfil
router.get("/profile", sidebarController.getProfile);

// Actualizar perfil propio
router.put("/profile/update", sidebarController.updateOwnProfile);

// Actualizar foto propia
router.put(
  "/profile/photo",
  upload.single("photo"),
  sidebarController.updateOwnPhoto,
);

// Ruta para administradores (opcional)
router.put("/:id/photo", upload.single("photo"), sidebarController.updatePhoto);

module.exports = router;
