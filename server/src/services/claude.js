import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const HAIKU  = 'claude-haiku-4-5-20251001'; // fast + cheap — extraction tasks
const SONNET = 'claude-sonnet-4-6';          // smarter  — personalised summaries

// Valid tags we allow the AI to infer
const VALID_TAGS = [
  'great-espresso', 'great-pour-over', 'specialty-coffee', 'latte', 'cappuccino',
  'cold-brew', 'matcha', 'flat-white', 'americano', 'cortado',
  'cozy', 'quiet', 'loud', 'laptop-friendly', 'outdoor-seating',
  'fast-service', 'good-wifi', 'good-food', 'good-value',
];

// ─────────────────────────────────────────────────────────────────────────────
// 0. COFFEE PERSONALITY TYPE
//    A short, fun 3-5 word title that captures the user's coffee identity.
// ─────────────────────────────────────────────────────────────────────────────
export const generateCoffeePersonality = async ({ tasteProfile, reviewCount }) => {
  const topDrinks = Object.entries(tasteProfile.drinks || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t.replace(/-/g, ' '));
  const topVibes = Object.entries(tasteProfile.vibes || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t.replace(/-/g, ' '));

  const prompt = `You are BrewBuddy. Generate a fun, creative 3–5 word coffee personality title for a user.

Their profile:
- Favourite drinks: ${topDrinks.join(', ') || 'not set'}
- Favourite vibes: ${topVibes.join(', ') || 'not set'}
- Reviews written: ${reviewCount}

Rules:
- Format: "The [Adjective] [Noun]" — e.g. "The Quiet Pour Over Scholar", "The Cozy Latte Nomad"
- Make it feel personal and specific to their actual preferences
- Warm and flattering, not sarcastic
- Max 6 words total including "The"
- Return ONLY the title, nothing else`;

  const msg = await client.messages.create({
    model: HAIKU,
    max_tokens: 20,
    messages: [{ role: 'user', content: prompt }],
  });

  return msg.content[0]?.text?.trim() || 'The Coffee Enthusiast';
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. FEED SUMMARY
//    A warm 2-sentence personalised blurb shown at the top of the feed.
// ─────────────────────────────────────────────────────────────────────────────
export const generateFeedSummary = async ({ tasteProfile, recentReviews, forYouShops }) => {
  const topDrinks = Object.entries(tasteProfile.drinks || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t.replace(/-/g, ' '));
  const topVibes = Object.entries(tasteProfile.vibes || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t.replace(/-/g, ' '));
  const recentShopNames = recentReviews.slice(0, 3).map((r) => r.shopName).join(', ');
  const newShopNames    = forYouShops.slice(0, 3).map((s) => s.name).join(', ');
  const priceHint = tasteProfile.avgPriceLevel
    ? `They usually spend around ${'$'.repeat(Math.round(tasteProfile.avgPriceLevel))}.`
    : '';

  const prompt = `You are BrewBuddy, a coffee shop discovery app. Write a warm, concise 2-sentence personalised feed intro for a user with these preferences:
- Favourite drinks: ${topDrinks.join(', ') || 'not set yet'}
- Favourite vibes: ${topVibes.join(', ') || 'not set yet'}
- ${priceHint}
- Recently visited: ${recentShopNames || 'nothing yet'}
- New recommendations waiting: ${newShopNames || 'none yet'}

Rules:
- Max 40 words total
- Warm and conversational, not robotic
- Mention their actual preferences if available
- If they have new recommendations, tease one or two by name
- Never start with "I" or "As"
- No emojis
- Output ONLY the intro text itself — no labels, prefixes, or preamble`;

  const msg = await client.messages.create({
    model: SONNET,
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = msg.content[0]?.text?.trim() || '';
  // Strip any "Here is the feed intro:" style preamble Claude occasionally adds
  return raw.replace(/^[^"]*"(.*)"[^"]*$/, '$1').replace(/^[\w\s]+:\s*/i, '').trim();
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. POST-REVIEW TAG EXTRACTION
//    Given a review body, infer tags the user didn't explicitly select.
//    Returns an array of valid tag strings (may be empty).
// ─────────────────────────────────────────────────────────────────────────────
export const extractTagsFromReview = async ({ body, existingTags = [] }) => {
  if (!body?.trim()) return [];

  const prompt = `You are extracting structured tags from a coffee shop review.

Review text: "${body}"

Already selected tags: ${existingTags.join(', ') || 'none'}

Valid tags (only choose from this list):
${VALID_TAGS.join(', ')}

Return ONLY a JSON array of additional tags implied by the review text that are NOT already in the selected list. Max 4 tags. If none apply, return [].

Example output: ["cozy", "great-espresso"]`;

  const msg = await client.messages.create({
    model: HAIKU,
    max_tokens: 60,
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    const text = msg.content[0]?.text?.trim() || '[]';
    // Extract JSON array from the response (handles markdown code blocks too)
    const match = text.match(/\[.*\]/s);
    const parsed = JSON.parse(match ? match[0] : '[]');
    // Sanitize — only return tags that are actually in our valid list
    return parsed.filter((t) => VALID_TAGS.includes(t));
  } catch {
    return [];
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. "WHY THIS SHOP" BLURBS
//    Given the user's taste profile and an array of recommended shops,
//    return a one-liner for each explaining the match.
//    Batched into a single API call to keep latency low.
// ─────────────────────────────────────────────────────────────────────────────
export const generateWhyBlurbs = async ({ tasteProfile, shops }) => {
  if (!shops.length) return {};

  const topDrinks = Object.entries(tasteProfile.drinks || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t.replace(/-/g, ' '));
  const topVibes = Object.entries(tasteProfile.vibes || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t.replace(/-/g, ' '));

  const shopList = shops.map((s, i) => {
    const price  = s.price_level ? '$'.repeat(s.price_level) : 'unknown price';
    const rating = s.rating ? `${s.rating}★` : '';
    const score  = s.brewScore ? `BrewScore ${(s.brewScore * 100).toFixed(0)}` : '';
    return `${i + 1}. ${s.name} — ${price}, ${rating}, ${score}`;
  }).join('\n');

  const prompt = `You are BrewBuddy. For each coffee shop below, write a single short phrase (max 8 words) explaining why it matches this user's taste.

User likes: ${topDrinks.join(', ') || 'various drinks'} · vibes: ${topVibes.join(', ') || 'any'}

Shops:
${shopList}

Return a JSON object mapping shop number to phrase. Example:
{"1": "Great espresso, quiet vibe you love", "2": "Cozy and laptop-friendly"}`;

  const msg = await client.messages.create({
    model: HAIKU,
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    const text  = msg.content[0]?.text?.trim() || '{}';
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : '{}');
    // Remap from "1"-based index to place_id
    return Object.fromEntries(
      shops.map((s, i) => [s.place_id, parsed[String(i + 1)] || ''])
    );
  } catch {
    return {};
  }
};
