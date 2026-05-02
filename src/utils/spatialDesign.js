/**
 * OptaVision Spatial Design System
 * Référentiel centralisé pour le rendu des événements tactiques.
 */

export const TACTICAL_THEME = {
  colors: {
    success: '#3cffd0',
    failure: '#ff4d4d',
    focus: '#fbbf24',
    dimmed: 'rgba(255, 255, 255, 0.1)',
    stroke: {
      success: 'white',
      failure: '#454a54'
    },
    actions: {
      'Pass': '#00ff88',
      'BallReceipt': '#ffd03c',
      'Shot': '#ff3366',
      'Goal': '#f1c40f',
      'SavedShot': '#ffcc00',
      'Tackle': '#3498db',
      'Interception': '#2ecc71',
      'Carry': '#00d9ff',
      'Default': '#95a5a6'
    }
  },
  sizes: {
    dot: 0.8,
    focus: 2,
    stroke: 0.2,
    marker: 0.7,
    star: 1.5,
    diamond: 1.6
  }
};

/**
 * Helper pour extraire le label propre d'une action
 */
export const getActionLabel = (event) => {
  const label = event.type_name || event.type || '';
  return label.replace(/\s+/g, '');
};

/**
 * Helper pour déterminer la couleur d'une action selon le thème
 */
export const getActionColor = (event, mode = 'technical') => {
  if (mode === 'outcome') {
    return event.outcome === 1 || event.outcome === 'Successful' 
      ? TACTICAL_THEME.colors.success 
      : TACTICAL_THEME.colors.failure;
  }
  
  const label = getActionLabel(event);
  return TACTICAL_THEME.colors.actions[label] || TACTICAL_THEME.colors.actions.Default;
};
