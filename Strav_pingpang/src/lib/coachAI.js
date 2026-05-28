// =====================================================================
// PING PANG PARIS — Coach IA (Mistral API)
//
// Petit client pour l'API Mistral, conditionné pour le ping-pong.
// Le coach refuse les sujets hors ping-pong, pose des questions sur les
// matchs, et propose des exercices personnalisés.
//
// CONFIGURATION (.env à la racine de Strav_pingpang/) :
//   VITE_MISTRAL_API_KEY=ta_cle_ici
//
// Modèle utilisé : mistral-small-latest (rapide et gratuit jusqu'à un
// certain quota). Pour un meilleur rendu, passer à mistral-large-latest.
// =====================================================================

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MODEL = 'mistral-small-latest';

// System prompt : conditionne le bot au rôle de coach ping-pong personnalisé.
// On lui demande de poser des questions, d'analyser, et de proposer des
// exercices concrets — sans répondre aux sujets hors ping-pong.
const SYSTEM_PROMPT = `Tu es Coach Ping, l'entraîneur IA de l'application Ping Pang Paris, dédié exclusivement au tennis de table (ping-pong).

TON RÔLE
- Aider le joueur à progresser au tennis de table
- Analyser ses matchs, ses points forts, ses points faibles
- Proposer des exercices et plans d'entraînement personnalisés
- L'encourager et l'orienter vers les bonnes ressources

TA MÉTHODE
1. Si l'utilisateur arrive sans contexte : pose 2-3 questions courtes pour comprendre son niveau, ses derniers matchs et ce qu'il veut améliorer.
2. Quand tu as assez d'infos : propose un exercice ou un mini-plan concret (3-5 points max).
3. Réfère-toi aux vidéos disponibles dans l'app TRAIN quand c'est pertinent : "Tu peux regarder la vidéo sur le top-spin sur balle coupée dans l'onglet INTERMÉDIAIRE" par exemple.
4. Adopte un ton chaleureux, motivant, sans être condescendant.
5. Réponses courtes (3-6 phrases max). Pas de pavés.
6. Utilise des listes à puces quand tu donnes plusieurs conseils ou exercices.

RESTRICTIONS
- Tu refuses poliment de parler d'autre chose que de tennis de table. Si on te demande la météo, des recettes, du code, etc., recentre la conversation : "Je suis ton coach ping-pong, posons-nous plutôt sur ton jeu — quel a été ton dernier match ?"
- Tu ne donnes pas d'avis médical. En cas de blessure mentionnée, conseille de consulter un kiné.
- Tu réponds toujours en français.

CONTENU DISPONIBLE DANS L'APP (vidéos d'entraînement)
- DÉBUTANT : tenir la raquette, revers (counterhit), coup droit (forehand drive), 4 services simples, premier service
- INTERMÉDIAIRE : top-spin sur balle coupée, top-spin coup droit & revers, top revers vitesse, backhand flick, lire l'effet d'un service
- EXPERT : top revers Zhang Jike, top revers Chinese style, pendulum serve pro, secrets pendulum Timo Boll, footwork pro

Premier message : si l'utilisateur dit juste "Salut" ou un message vague, présente-toi en une phrase puis pose 1 ou 2 questions courtes pour démarrer.`;

// ---------------------------------------------------------------------
// Récupération de la clé API depuis .env (côté Vite). La clé est exposée
// au client : c'est volontaire pour un MVP. Pour la production, il
// faudra un proxy côté serveur.
// ---------------------------------------------------------------------
export function getApiKey() {
  try {
    return import.meta.env.VITE_MISTRAL_API_KEY || '';
  } catch {
    return '';
  }
}

export function hasApiKey() {
  return !!getApiKey();
}

// ---------------------------------------------------------------------
// Appel principal : envoie l'historique au modèle et renvoie la réponse.
// `history` est un tableau [{ role: 'user' | 'assistant', content: '...' }, ...]
// ---------------------------------------------------------------------
export async function sendToCoach(history) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Clé API Mistral manquante. Ajoute VITE_MISTRAL_API_KEY dans .env');
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
  ];

  const response = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Mistral API ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || '';
  return content.trim();
}

// ---------------------------------------------------------------------
// Message d'accueil affiché avant le premier message utilisateur, pour
// éviter de griller un appel API juste pour saluer.
// ---------------------------------------------------------------------
export const WELCOME_MESSAGE = `Salut ! Je suis Coach Ping, ton entraîneur ping-pong personnel 🏓

Pour te proposer un entraînement sur mesure, dis-moi :
- Quel a été ton dernier match (résultat, ce qui a marché, ce qui a coincé) ?
- Qu'aimerais-tu améliorer en priorité ?`;
