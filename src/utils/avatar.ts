export function getSpanishCardAvatar(name: string) {
  // Emojis: 🪙 (Oro), 🍷 (Copa), ⚔️ (Espada), 🌿 (Basto)
  const suitEmojis = ['🪙', '🍷', '⚔️', '🌿'];
  const colors = ['#d4af37', '#c84b31', '#2b4c7e', '#4a5d23'];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const suitIndex = Math.abs(hash) % 4;
  const validNumbers = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
  const finalNumber = validNumbers[Math.abs(hash) % validNumbers.length];
  
  const color = colors[suitIndex];
  const emoji = suitEmojis[suitIndex];
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <rect width="100" height="100" fill="#fdfbf7" />
      <rect x="4" y="4" width="92" height="92" fill="none" stroke="${color}" stroke-width="2" rx="8" ry="8" stroke-dasharray="4 2" />
      <text x="14" y="30" font-family="Georgia, serif" font-size="24" font-weight="bold" fill="${color}">${finalNumber}</text>
      <text x="50" y="56" font-family="sans-serif" font-size="38" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
      <text x="86" y="86" font-family="Georgia, serif" font-size="24" font-weight="bold" fill="${color}" text-anchor="end">${finalNumber}</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}
