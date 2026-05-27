// Compteur de notifications partagé (messages non-lus + défis entrants).
// IMPORTANT : doit donner EXACTEMENT la même somme que les onglets
// Chat + Défis de la fiche profil (ProfileSheet), pour que la pastille
// du header corresponde toujours à ce que l'utilisateur voit à l'intérieur.
//   - Chat  = conversations non lues
//   - Défis = défis entrants à traiter
import { useEffect, useState } from 'react';
import { useAuth } from './auth';
import { useIncomingChallenges } from './challenges';
import { loadChatBundle, getDemoChatBundle } from './chatData';

export function useNotifications() {
  const { userId } = useAuth();
  const [incoming] = useIncomingChallenges();  // dépendance : re-calcul quand le store change
  const [counts, setCounts] = useState({ messages: 0, defis: 0 });

  useEffect(() => {
    if (!userId) { setCounts({ messages: 0, defis: 0 }); return undefined; }
    let cancelled = false;
    // Même logique que ProfileSheet : fallback démo si l'utilisateur n'a encore rien.
    loadChatBundle(userId).then((b) => {
      if (cancelled || !b) return;
      const isEmpty = b.conversations.length === 0 && b.friends.length === 0;
      const demo = isEmpty ? getDemoChatBundle() : null;
      const convs = demo ? demo.conversations : b.conversations;
      const inc   = demo ? demo.incoming      : b.incoming;
      setCounts({
        messages: convs.filter((c) => c.unread).length,
        defis: inc.length,
      });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [userId, incoming]);

  return { ...counts, total: counts.messages + counts.defis };
}
