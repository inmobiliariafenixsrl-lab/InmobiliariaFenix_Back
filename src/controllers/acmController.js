const acmService = require("../services/acmService");

const getDepartments = async (req, res) => {
  try {
    const departments = await acmService.getDepartments();
    
    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error("Error en getDepartments:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener los departamentos",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getZonesByMunicipio = async (req, res) => {
  try {
    const { idmunicipio } = req.params;
    const zones = await acmService.getZonesByMunicipio(idmunicipio);
    
    res.json({
      success: true,
      data: zones,
    });
  } catch (error) {
    console.error("Error en getDepartments:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener los cuadrantes",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

module.exports = {
  getDepartments,
  getZonesByMunicipio,
};