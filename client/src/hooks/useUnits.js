import { useState } from 'react';

const METERS_PER_MILE = 1609.34;
const METERS_PER_KM = 1000;

export const useUnits = () => {
  const [unit, setUnit] = useState(() => localStorage.getItem('bb_unit') || 'mi');

  const toggleUnit = () => {
    const next = unit === 'mi' ? 'km' : 'mi';
    localStorage.setItem('bb_unit', next);
    setUnit(next);
  };

  const formatDistance = (meters) => {
    if (meters == null) return null;
    if (unit === 'mi') {
      const miles = meters / METERS_PER_MILE;
      return miles < 0.1 ? `${Math.round(meters * 3.281)}ft` : `${miles.toFixed(1)}mi`;
    } else {
      return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / METERS_PER_KM).toFixed(1)}km`;
    }
  };

  // Convert a display value (in current unit) to meters for storage/API
  const toMeters = (value) =>
    unit === 'mi' ? Math.round(value * METERS_PER_MILE) : Math.round(value * METERS_PER_KM);

  // Convert meters to current unit for display
  const fromMeters = (meters) =>
    unit === 'mi' ? meters / METERS_PER_MILE : meters / METERS_PER_KM;

  return { unit, toggleUnit, formatDistance, toMeters, fromMeters };
};
