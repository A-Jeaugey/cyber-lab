/**
 * config.js — configuration du dépôt cible pour l'ingestion de rooms.
 * Modifie ces valeurs si tu forkes le lab vers un autre dépôt.
 */
export const REPO = {
  owner: 'a-jeaugey',
  repo: 'cyber-lab',
  branch: 'main',          // branche que GitHub Pages déploie
  eventType: 'add-room',   // type d'événement repository_dispatch
};
