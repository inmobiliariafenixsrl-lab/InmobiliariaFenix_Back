const pingService = require("../services/pingService");

exports.getPing = async (req, res) => {
  try {
    const registros = await pingService.getPing();
    res.status(200).json(registros);
  } catch (error) {
    console.error("Error in getPing:", error);
    res.status(500).json({ message: error.message });
  }
};
