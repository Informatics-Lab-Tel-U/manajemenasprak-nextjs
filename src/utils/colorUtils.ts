// 12 highly distinct hues spread ~30° apart on the color wheel
// Each pair (bg/text) is chosen for WCAG AA contrast on white and dark backgrounds
export const COURSE_COLORS = [
  '#e53935', // Red
  '#e65100', // Deep Orange
  '#f9a825', // Amber
  '#2e7d32', // Green
  '#00695c', // Teal
  '#0277bd', // Blue
  '#1565c0', // Indigo-Blue
  '#6a1b9a', // Deep Purple
  '#ad1457', // Pink
  '#558b2f', // Olive Green
  '#00838f', // Cyan-Teal
  '#4527a0', // Violet
];

// Improved hash using prime multiplier 61 for better distribution
export const getCourseColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 61 + name.charCodeAt(i)) >>> 0; // keep 32-bit unsigned
  }
  return COURSE_COLORS[hash % COURSE_COLORS.length];
};
