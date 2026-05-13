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

const calculateValue = async (req, res) => {
  try {
    const { property, options } = req.body;
    
    if (!property || !property.department || !property.province || 
        !property.municipality || !property.sqMeters || !property.sqMetersLand) {
      return res.status(400).json({
        success: false,
        message: "Faltan campos obligatorios: department, province, municipality, sqMeters, sqMetersLand"
      });
    }
    
    const result = await acmService.calculateValue(property, options);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error en calculateValue:", error);
    res.status(500).json({
      success: false,
      message: "Error al calcular el valor del inmueble",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  getDepartments,
  getZonesByMunicipio,
  calculateValue,
};