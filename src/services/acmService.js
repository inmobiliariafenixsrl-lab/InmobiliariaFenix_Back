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

const getZonesByMunicipio = async (idmunicipio) => {
  const sql = `
    WITH municipio_geom AS (
      SELECT 
          m.idmunicipio,
          m.nombre,
          ST_SetSRID(
              ST_MakePoint(m.longitud, m.latitud),
              4326
          ) AS geom
      FROM municipio m
      WHERE m.idmunicipio = $1
    ),

    cuadrante_geom AS (

        SELECT
            c.idcuadrante,
            c.nombre,
            c.descripcion,
            c.precio,
            c.puntos,

            ST_SetSRID(
                ST_MakePolygon(
                    ST_MakeLine(geom_punto)
                ),
                4326
            ) AS geom

        FROM cuadrante c

        CROSS JOIN LATERAL (

            SELECT array_agg(p ORDER BY ord) ||
                  (array_agg(p ORDER BY ord))[1] AS geom_punto
            FROM (
                SELECT
                    ord,
                    ST_MakePoint(
                        (punto->>1)::numeric, -- longitud
                        (punto->>0)::numeric  -- latitud
                    ) AS p
                FROM jsonb_array_elements(c.puntos)
                    WITH ORDINALITY AS t(punto, ord)
            ) s

        ) puntos_cerrados
    )

    SELECT
        c.idcuadrante as id,
        c.nombre as name,
        c.descripcion as description,
        c.precio as price,
        c.puntos as points,
        
        ST_DistanceSphere(
            m.geom,
            ST_Centroid(c.geom)
        ) AS distancia_metros

    FROM municipio_geom m
    CROSS JOIN cuadrante_geom c

    ORDER BY distancia_metros ASC
    LIMIT 20;
  `;

  const result = await query(sql, [idmunicipio]);

  const cuadrantes = result.rows.map((cuadrante) => ({
        id: cuadrante.id.toString(),
        name: cuadrante.name,
        points: cuadrante.points || [],
        description: cuadrante.description || "",
        price: parseFloat(cuadrante.price),
        color: generateColorFromId(cuadrante.id),
      }));

  return cuadrantes;
}

const generateColorFromId = (id) => {
    const colors = [
      "#ff0000",
      "#00ff00",
      "#0000ff",
      "#a88900",
      "#ff00ff",
      "#00ffff",
      "#ff6600",
      "#a00c47",
      "#3f3f3f",
    ];
    if (!id) return colors[Math.floor(Math.random() * colors.length)];
    return colors[id % colors.length];
  }

module.exports = {
  getDepartments,
  getZonesByMunicipio,
};