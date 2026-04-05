export const PROVIDER_COLORS = {
  openai:      { color: '#22C55E', label: 'OpenAI',       bg: 'bg-[#22C55E]' },
  anthropic:   { color: '#F59E0B', label: 'Anthropic',    bg: 'bg-[#F59E0B]' },
  elevenlabs:  { color: '#8B5CF6', label: 'ElevenLabs',   bg: 'bg-[#8B5CF6]' },
  cartesia:    { color: '#14B8A6', label: 'Cartesia',      bg: 'bg-[#14B8A6]' },
  replicate:   { color: '#6366F1', label: 'Replicate',     bg: 'bg-[#6366F1]' },
  stability:   { color: '#EC4899', label: 'Stability AI',  bg: 'bg-[#EC4899]' },
};

export const DEFAULT_PROVIDER = { color: '#94A3B8', label: 'Other', bg: 'bg-[#94A3B8]' };

export function getProvider(name) {
  if (!name) return DEFAULT_PROVIDER;
  return PROVIDER_COLORS[name.toLowerCase()] || DEFAULT_PROVIDER;
}

export function getColor(name) {
  return getProvider(name).color;
}

export function getLabel(name) {
  return getProvider(name).label;
}

export const PROVIDER_CHART_COLORS = Object.entries(PROVIDER_COLORS).map(
  ([key, val]) => ({ key, color: val.color, label: val.label })
);
