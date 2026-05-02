import { useCallback } from 'react';

export const PITCH_DIMENSIONS = { width: 105, height: 68 };

/**
 * Hook central pour la projection de coordonnées spatiales
 * Convertit les coordonnées 0-100 (Opta) en dimensions FIFA 105x68
 */
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const usePitchProjection = (orientation = 'horizontal') => {
  const projectPoint = useCallback((x, y) => {
    const nx = Number(x);
    const ny = Number(y);
    
    if (!Number.isFinite(nx) || !Number.isFinite(ny)) return null;

    if (orientation === 'vertical') {
      return {
        x: PITCH_DIMENSIONS.height - (ny / 100) * PITCH_DIMENSIONS.height,
        y: PITCH_DIMENSIONS.width - (nx / 100) * PITCH_DIMENSIONS.width
      };
    }

    return {
      x: (nx / 100) * PITCH_DIMENSIONS.width,
      y: ((100 - ny) / 100) * PITCH_DIMENSIONS.height
    };
  }, [orientation]);

  const getPitchViewBox = useCallback((view = 'full') => {
    const overlap = 7;
    if (orientation === 'vertical') {
      if (view === 'offensive') return { x: 0, y: 0, width: PITCH_DIMENSIONS.height, height: PITCH_DIMENSIONS.width / 2 + overlap };
      if (view === 'defensive') return { x: 0, y: PITCH_DIMENSIONS.width / 2 - overlap, width: PITCH_DIMENSIONS.height, height: PITCH_DIMENSIONS.width / 2 + overlap };
      return { x: 0, y: 0, width: PITCH_DIMENSIONS.height, height: PITCH_DIMENSIONS.width };
    }
    if (view === 'offensive') return { x: PITCH_DIMENSIONS.width / 2 - overlap, y: 0, width: PITCH_DIMENSIONS.width / 2 + overlap, height: PITCH_DIMENSIONS.height };
    if (view === 'defensive') return { x: 0, y: 0, width: PITCH_DIMENSIONS.width / 2 + overlap, height: PITCH_DIMENSIONS.height };
    return { x: 0, y: 0, width: PITCH_DIMENSIONS.width, height: PITCH_DIMENSIONS.height };
  }, [orientation]);

  const getPitchSvgPoint = useCallback((event, viewBox) => {
    const svg = event.currentTarget;
    if (!svg?.createSVGPoint) return null;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const svgPoint = point.matrixTransform(matrix.inverse());
    return {
      x: clamp(svgPoint.x, viewBox.x, viewBox.x + viewBox.width),
      y: clamp(svgPoint.y, viewBox.y, viewBox.y + viewBox.height)
    };
  }, []);

  return { 
    projectPoint, 
    getPitchViewBox,
    getPitchSvgPoint,
    PITCH_DIMENSIONS 
  };
};
