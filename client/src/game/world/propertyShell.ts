export type PropertyRoofSpec = {
  width: number;
  depth: number;
  thickness: number;
  centerY: number;
};

export function propertyRoofSpec(width: number, depth: number, wallHeight: number): PropertyRoofSpec {
  const eave = 0.45;
  const thickness = 0.2;
  return {
    width: width + eave * 2,
    depth: depth + eave * 2,
    thickness,
    centerY: wallHeight + thickness / 2,
  };
}
