const { query } = require("../../db");

const getDepartments = async () => {
  const sql = `
    SELECT 
      d.iddepartamento as id,
      d.nombre as name,
      (
        SELECT COALESCE(
          JSONB_AGG(
            JSONB_BUILD_OBJECT(
              'id', p.idprovincia,
              'name', p.nombre,
              'municipalities', (
                SELECT COALESCE(
                  JSONB_AGG(
                    JSONB_BUILD_OBJECT(
                      'id', m.idmunicipio,
                      'name', m.nombre,
                      'latitud', m.latitud,
                      'longitud', m.longitud,
                      'idMunicipio', m.idmunicipio
                    )
                    ORDER BY m.nombre
                  ),
                  '[]'::jsonb
                )
                FROM municipio m
                WHERE m.idprovincia = p.idprovincia
              )
            )
            ORDER BY p.nombre
          ),
          '[]'::jsonb
        )
        FROM provincia p
        WHERE p.iddepartamento = d.iddepartamento
      ) as provinces
    FROM departamento d
    ORDER BY d.nombre
  `;
  
  const result = await query(sql);
  return result.rows;
};

module.exports = {
  getDepartments,
};