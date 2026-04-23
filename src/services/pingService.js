const { query } = require("../../db");

exports.getPing = async () => {
  let sql = `
    SELECT *
    FROM ping
  `;
  const result = await query(sql);
  return result.rows;
};
