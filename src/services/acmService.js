const { query } = require("../../db");
const cuadrantesService = require("../services/cuadrantesService");

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
    LIMIT 50;
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

const CONSTRUCTION_PRICES = {
  'economica': 350,
  'estandar': 500,
  'semi_lujo': 700,
  'lujo': 1000,
};

const CONDITION_DEPRECIATION = {
  'excelente': { min: 0, max: 15, average: 7.5 },
  'bueno': { min: 10, max: 15, average: 12.5 },
  'regular': { min: 20, max: 30, average: 25 },
  'malo': { min: 40, max: 50, average: 45 },
  'ruinoso': { min: 60, max: 80, average: 70 },
};

const OPTIONAL_MULTIPLIERS = {
  hasElevator: 1.05,
  hasGarage: 1.08,
  hasTerrace: 1.06,
  hasPool: 1.10,
  extraFloor: 1.02,
  extraBedroom: 1.03,
  extraBathroom: 1.02,
  extraParking: 1.03,
};

const getConstructionTypeLabel = (type) => {
  const labels = {
    'economica': 'Económica',
    'estandar': 'Estándar',
    'semi_lujo': 'Semi Lujo',
    'lujo': 'Lujo'
  };
  return labels[type] || type;
};

const getConditionLabel = (condition) => {
  const labels = {
    'excelente': 'Excelente',
    'bueno': 'Bueno',
    'regular': 'Regular',
    'malo': 'Malo',
    'ruinoso': 'Ruinoso'
  };
  return labels[condition] || condition;
};

const getComparableProperties = async (property, selectedZone, finalValue) => {
  const points = selectedZone.points;
  const polygonPoints = points.map((point) => `${point[1]} ${point[0]}`).join(",");
  const firstPoint = points[0];
  const closedPolygon = `${polygonPoints},${firstPoint[1]} ${firstPoint[0]}`;
  const zonaName = selectedZone.name;

  const sql = `
    SELECT 
      i.idinmueble as id,
      i.titulo as title,
      i.m2_construccion as "sqMeters",
      i.m2_terreno as "sqMetersLand",
      i.operacion as operation,
      i.tipo_propiedad as "propertyType",
      i.nro_habitaciones as bedrooms,
      i.nro_baños as bathrooms,
      i.nro_estacionamiento as "parkingSpots",
      i.ascensor as "hasElevator",
      i.garaje as "hasGarage",
      i.terraza as "hasTerrace",
      i.piscina as "hasPool",
      i.precio_captacion_i as price,
      m.nombre as municipality,
      p.nombre as province,
      d.nombre as department,
      CASE
          WHEN ST_Within(
              ST_SetSRID(
                  ST_MakePoint(i.longitud, i.latitud),
                  4326
              ),
              ST_GeomFromText(
                  'POLYGON((${closedPolygon}))',
                  4326
              )
          )
          THEN '${zonaName}'
          ELSE NULL
      END as zone
    FROM inmueble i
    LEFT JOIN municipio m 
          ON i.idmunicipio = m.idmunicipio
    LEFT JOIN provincia p 
          ON m.idprovincia = p.idprovincia
    LEFT JOIN departamento d 
          ON p.iddepartamento = d.iddepartamento
    WHERE i.estado IN ('activo', 'vendido', 'reservado')
      AND i.idmunicipio IS NOT NULL
    LIMIT 20;
  `;
  
  const result = await query(sql);
  const comparableProps = result.rows;
  
  if (!comparableProps.length) return [];
  
  const comparables = comparableProps.map(p => {
    let similarity = 0;
    
    if (p.zone === selectedZone?.name) similarity += 40;
    else if (p.department === property.department) similarity += 10;
    
    if (p.municipality === property.municipality) similarity += 15;
    
    const sqmDiff = Math.abs((p.sqmeters || 100) - property.sqMeters) / property.sqMeters;
    similarity += Math.max(0, 20 - sqmDiff * 50);
    
    if (p.hasgarage === property.hasGarage) similarity += 5;
    if (p.haspool === property.hasPool) similarity += 5;
    if (p.haselevator === property.hasElevator) similarity += 5;
    
    return {
      property: p,
      similarity: Math.min(100, Math.round(similarity)),
      priceDiff: (p.price || 0) - finalValue
    };
  })
  .filter(p => p.similarity > 0)
  .sort((a, b) => b.similarity - a.similarity)
  .slice(0, 5);
  
  return comparables;
};

const calculateValue = async (property, options = {}) => {
  const { sqMetersLand, sqMeters, zoneId, constructionType, condition } = property;
  
  let selectedZone = null;
  if (zoneId) {
    selectedZone = await cuadrantesService.getCuadranteById(zoneId);
  }
  
  const zonePrice = selectedZone?.price || 300;
  const zoneConstructionPrice = selectedZone?.precio_construccion || CONSTRUCTION_PRICES[constructionType];
  const baseConstructionPrice = CONSTRUCTION_PRICES[constructionType];
  
  const constructionValue = zoneConstructionPrice * sqMeters;
  const landValue = zonePrice * sqMetersLand;
  
  const depreciation = CONDITION_DEPRECIATION[condition];
  const depreciationPercentage = depreciation.average / 100;
  const depreciationValue = constructionValue * depreciationPercentage;
  
  const baseValue = landValue + (constructionValue - depreciationValue);
  
  let optionalMultiplier = 1;
  const optionalFactors = [];
  
  const floors = property.numberOfFloors || 1;
  if (floors > 1) {
    const floorBonus = 1 + ((floors - 1) * (OPTIONAL_MULTIPLIERS.extraFloor - 1));
    optionalMultiplier *= floorBonus;
    optionalFactors.push({
      label: 'Pisos adicionales',
      value: `${floors} pisos`,
      impact: `+${((floorBonus - 1) * 100).toFixed(0)}%`,
    });
  }
  
  const bedrooms = property.bedrooms || 2;
  if (bedrooms > 2) {
    const bedroomBonus = 1 + ((bedrooms - 2) * (OPTIONAL_MULTIPLIERS.extraBedroom - 1));
    optionalMultiplier *= bedroomBonus;
    optionalFactors.push({
      label: 'Habitaciones extra',
      value: `${bedrooms} hab.`,
      impact: `+${((bedroomBonus - 1) * 100).toFixed(0)}%`,
    });
  }
  
  const bathrooms = property.bathrooms || 1;
  if (bathrooms > 1) {
    const bathroomBonus = 1 + ((bathrooms - 1) * (OPTIONAL_MULTIPLIERS.extraBathroom - 1));
    optionalMultiplier *= bathroomBonus;
    optionalFactors.push({
      label: 'Baños extra',
      value: `${bathrooms} baños`,
      impact: `+${((bathroomBonus - 1) * 100).toFixed(0)}%`,
    });
  }
  
  const parking = property.parkingSpots || 1;
  if (parking > 1) {
    const parkingBonus = 1 + ((parking - 1) * (OPTIONAL_MULTIPLIERS.extraParking - 1));
    optionalMultiplier *= parkingBonus;
    optionalFactors.push({
      label: 'Estacionamientos extra',
      value: `${parking} est.`,
      impact: `+${((parkingBonus - 1) * 100).toFixed(0)}%`,
    });
  }
  
  const specialFeatures = [
    { key: 'hasElevator', label: 'Ascensor', multiplier: OPTIONAL_MULTIPLIERS.hasElevator },
    { key: 'hasGarage', label: 'Garaje', multiplier: OPTIONAL_MULTIPLIERS.hasGarage },
    { key: 'hasTerrace', label: 'Terraza', multiplier: OPTIONAL_MULTIPLIERS.hasTerrace },
    { key: 'hasPool', label: 'Piscina', multiplier: OPTIONAL_MULTIPLIERS.hasPool },
  ];
  
  specialFeatures.forEach(feature => {
    if (property[feature.key]) {
      optionalMultiplier *= feature.multiplier;
      optionalFactors.push({
        label: feature.label,
        value: 'Sí',
        impact: `+${((feature.multiplier - 1) * 100).toFixed(0)}%`,
      });
    }
  });
  
  const finalValue = baseValue * optionalMultiplier;
  const pricePerSqm = finalValue / sqMeters;
  
  // Construir factores
  const factors = [
    { label: 'Departamento', value: property.department, impact: 'base', details: 'Ubicación geográfica' },
    { label: 'Provincia', value: property.province, impact: 'base', details: 'Ubicación geográfica' },
    { label: 'Municipio', value: property.municipality, impact: 'base', details: 'Ubicación geográfica' },
    { label: 'Zona/Cuadrante', value: selectedZone?.name || property.zoneName || 'No seleccionado', impact: 'base', details: selectedZone ? `Precio terreno: $${zonePrice}/m², Construcción: $${zoneConstructionPrice}/m²` : 'Seleccione una zona en el mapa' },
    { label: 'm² Construcción', value: `${sqMeters} m²`, impact: `$${zoneConstructionPrice.toLocaleString()}/m²`, details: `Precio base por zona` },
    { label: 'm² Terreno', value: `${sqMetersLand} m²`, impact: `$${zonePrice.toLocaleString()}/m²`, details: `Valor terreno: ${((landValue / (landValue + constructionValue)) * 100).toFixed(0)}% del total` },
    { label: 'Tipo Construcción', value: getConstructionTypeLabel(constructionType), impact: `$${baseConstructionPrice}/m²`, details: `Categoría: ${constructionType}` },
    { label: 'Condición', value: getConditionLabel(condition), impact: `-${depreciationPercentage * 100}%`, details: `Depreciación: ${depreciation.average}% (rango ${depreciation.min}-${depreciation.max}%)` },
    { label: 'Valor Terreno', value: `$${Math.round(landValue).toLocaleString()}`, impact: `${((landValue / finalValue) * 100).toFixed(0)}% del total`, details: `${sqMetersLand} m² × $${zonePrice}/m²` },
    { label: 'Valor Construcción', value: `$${Math.round(constructionValue).toLocaleString()}`, impact: `${((constructionValue / finalValue) * 100).toFixed(0)}% del total`, details: `${sqMeters} m² × $${zoneConstructionPrice}/m²` },
    { label: 'Depreciación', value: `-$${Math.round(depreciationValue).toLocaleString()}`, impact: `-${depreciationPercentage * 100}%`, details: `Por condición: ${condition}` },
    ...optionalFactors.map(f => ({ label: f.label, value: f.value, impact: f.impact, details: 'Multiplicador opcional' })),
    { label: 'Valor Final Estimado', value: `$${Math.round(finalValue).toLocaleString()}`, impact: `${pricePerSqm.toLocaleString()}/m²`, details: `Precio por metro cuadrado construido` },
  ];
  
  // Margen de porcentaje
  const marginPercentage = options?.marginPercentage || 10;
  const marginLow = Math.round(finalValue * (1 - marginPercentage / 100));
  const marginHigh = Math.round(finalValue * (1 + marginPercentage / 100));
  
  // Propiedades comparables
  let comparables = [];
  if (options?.includeComparables !== false) {
    comparables = await getComparableProperties(property, selectedZone, finalValue);
  }
  
  return {
    estimatedValue: Math.round(baseValue),
    landValue: Math.round(landValue),
    constructionValue: Math.round(constructionValue),
    depreciationValue: Math.round(depreciationValue),
    finalValue: Math.round(finalValue),
    pricePerSqm: Math.round(pricePerSqm),
    marginLow,
    marginHigh,
    selectedZone,
    comparables,
    factors,
  };
};

module.exports = {
  getDepartments,
  getZonesByMunicipio,
  calculateValue,
};