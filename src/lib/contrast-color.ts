// Luminance perçue (formule YIQ) : détermine si le texte doit être blanc ou
// noir pour rester lisible sur une couleur de fond donnée.
export function accessibleTextColor(hexBg: string): "#FFF" | "#000" {
  const hex = hexBg.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? "#000" : "#FFF";
}
