// src/constants/buildingCodes.js
export const SOTE_BUILDING_CODES = {
    HOSPITAL: 511,
    SCHOOL: 131,
    PUBLIC_RANGE_MIN: 210,
    PUBLIC_RANGE_MAX: 240
  }
  
  export function isSoteBuilding(kayttotark) {
    const { HOSPITAL, SCHOOL, PUBLIC_RANGE_MIN, PUBLIC_RANGE_MAX } = SOTE_BUILDING_CODES
    return [HOSPITAL, SCHOOL].includes(kayttotark) ||
           (kayttotark > PUBLIC_RANGE_MIN && kayttotark < PUBLIC_RANGE_MAX)
  }