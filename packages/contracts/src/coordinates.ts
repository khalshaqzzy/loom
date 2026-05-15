export type MeshCoordinateInput = {
  lat?: number | null | undefined;
  lon?: number | null | undefined;
  latE6?: number | null | undefined;
  lonE6?: number | null | undefined;
};

export type NormalizedMeshCoordinates = {
  lat: number | null;
  lon: number | null;
  latE6: number | null;
  lonE6: number | null;
};

const E6_SCALE = 1_000_000;

const hasValue = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined;

const inRange = (value: number, min: number, max: number): boolean =>
  Number.isFinite(value) && value >= min && value <= max;

export const toE6Coordinate = (value: number): number => Math.round(value * E6_SCALE);

export const fromE6Coordinate = (value: number): number => value / E6_SCALE;

export const normalizeMeshCoordinates = (
  input: MeshCoordinateInput
): NormalizedMeshCoordinates => {
  const { lat, lon, latE6, lonE6 } = input;
  const hasLat = hasValue(lat);
  const hasLon = hasValue(lon);
  const hasLatE6 = hasValue(latE6);
  const hasLonE6 = hasValue(lonE6);

  if (hasLat !== hasLon) {
    throw new Error("Coordinate decimal pair must include both lat and lon.");
  }
  if (hasLatE6 !== hasLonE6) {
    throw new Error("Coordinate fixed-point pair must include both latE6 and lonE6.");
  }

  if (hasLatE6 && hasLonE6 && latE6 === 0 && lonE6 === 0) {
    if ((hasLat || hasLon) && (lat !== 0 || lon !== 0)) {
      throw new Error("Coordinate fields are inconsistent with no-location sentinel.");
    }
    return { lat: null, lon: null, latE6: null, lonE6: null };
  }

  if (hasLat && hasLon) {
    if (!inRange(lat, -90, 90) || !inRange(lon, -180, 180)) {
      throw new Error("Coordinate decimal values are out of range.");
    }
  }

  if (hasLatE6 && hasLonE6) {
    if (
      !Number.isInteger(latE6) ||
      !Number.isInteger(lonE6) ||
      !inRange(latE6, -90_000_000, 90_000_000) ||
      !inRange(lonE6, -180_000_000, 180_000_000)
    ) {
      throw new Error("Coordinate fixed-point values are out of range.");
    }
  }

  if (hasLat && hasLon && hasLatE6 && hasLonE6) {
    if (toE6Coordinate(lat) !== latE6 || toE6Coordinate(lon) !== lonE6) {
      throw new Error("Coordinate decimal and fixed-point values are inconsistent.");
    }
    return {
      lat,
      lon,
      latE6,
      lonE6
    };
  }

  if (hasLatE6 && hasLonE6) {
    return {
      lat: fromE6Coordinate(latE6),
      lon: fromE6Coordinate(lonE6),
      latE6,
      lonE6
    };
  }

  if (hasLat && hasLon) {
    return {
      lat,
      lon,
      latE6: toE6Coordinate(lat),
      lonE6: toE6Coordinate(lon)
    };
  }

  return { lat: null, lon: null, latE6: null, lonE6: null };
};

export const safeNormalizeMeshCoordinates = (
  input: MeshCoordinateInput
):
  | { success: true; data: NormalizedMeshCoordinates }
  | { success: false; error: string } => {
  try {
    return { success: true, data: normalizeMeshCoordinates(input) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid coordinates."
    };
  }
};
