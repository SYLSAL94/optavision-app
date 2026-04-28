/**
 * Normalise une chaîne de caractères en supprimant les accents et en la mettant en minuscule.
 * Utile pour les recherches insensibles à la casse et aux diacritiques.
 */
export const normalizeString = (str) => {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
};

/**
 * Vérifie si une requête de recherche correspond à un joueur en vérifiant son nom et son nom complet.
 */
export const matchPlayer = (player, query) => {
    if (!query) return true;
    const normalizedQuery = normalizeString(query);
    
    const nameMatch = normalizeString(player.name).includes(normalizedQuery);
    const fullNameMatch = normalizeString(player.full_name).includes(normalizedQuery);
    const clubMatch = normalizeString(player.last_club_name).includes(normalizedQuery);
    
    return nameMatch || fullNameMatch || clubMatch;
};
