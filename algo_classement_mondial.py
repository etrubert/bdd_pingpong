"""
================================================================================
ALGO DE CLASSEMENT MONDIAL UNIFIE (cross-pays ping-pong)
================================================================================

Formule :
    rang_pool = position du joueur dans son pool national (tri skill desc)
    intra     = 1 - (rang_pool - 1) / (N_pays - 1)                  in [0, 1]
    world_elo = ancre_bottom[pays] + intra * (ancre_top[pays] - ancre_bottom[pays])

Entrees par joueur : pays, rang dans le pool national, taille du pool.
Parametres par pays : ancre_top, ancre_bottom.
"""

from typing import Optional


# ==============================================================================
# ANCRES PAR PAYS
# Elo mondial estime du top et du bas du pool scrape.
# Ajuste ces 12 chiffres pour recalibrer.
# ==============================================================================
ANCRES = {
    "France":    {"ancre_top": 2400, "ancre_bottom": 1100},
    "Espagne":   {"ancre_top": 2400, "ancre_bottom": 1100},
    "Portugal":  {"ancre_top": 2400, "ancre_bottom": 1100},
    "Allemagne": {"ancre_top": 2700, "ancre_bottom": 1700},
    "USA":       {"ancre_top": 2500, "ancre_bottom": 1500},
    "Chine":     {"ancre_top": 2950, "ancre_bottom": 2200},
}


# ==============================================================================
# 1. CLASSER LE POOL D'UN PAYS
# ==============================================================================
def classer_pool(joueurs: list) -> list:
    """Trie les joueurs d'un pays du meilleur au moins bon.

    - Si points_elo dispo : tri par points decroissants.
    - Sinon (cas Chine) : tri par rang_national croissant.

    Retourne la liste triee (best d'abord).
    """
    points_dispo = sum(1 for j in joueurs if j.get("points_elo") not in (None, ""))
    has_points = points_dispo >= max(2, len(joueurs) // 2)

    if has_points:
        def key(j):
            pts = j.get("points_elo")
            if pts in (None, ""):
                return (1, j.get("rang_national") or 999_999)
            return (0, -float(pts))
    else:
        def key(j):
            return j.get("rang_national") or 999_999

    return sorted(joueurs, key=key)


# ==============================================================================
# 2. PROJECTION VERS L'ELO MONDIAL
# ==============================================================================
def world_elo(rang_pool: int, taille_pool: int, ancre_top: float, ancre_bottom: float) -> float:
    """Calcule le world Elo d'un joueur.

    rang_pool   : position dans le pool national (1 = top, N = bas)
    taille_pool : nombre total de joueurs du pool national
    """
    if taille_pool <= 1:
        return ancre_top
    intra = 1.0 - (rang_pool - 1) / (taille_pool - 1)
    return ancre_bottom + intra * (ancre_top - ancre_bottom)


# ==============================================================================
# 3. CLASSEMENT MONDIAL COMPLET
# ==============================================================================
def classement_mondial(joueurs_par_pays: dict) -> list:
    """Construit le classement mondial unifie.

    Entree : { "France": [joueur, ...], "Espagne": [...], ... }
        Chaque joueur est un dict avec au minimum :
          - points_elo (peut etre None / "")
          - rang_national (peut etre None)
          - + tout autre champ que tu veux conserver

    Sortie : liste triee par world_elo desc, chaque joueur enrichi de :
          - pays
          - rang_pool
          - world_elo
          - rang_mondial
    """
    tous = []
    for pays, joueurs in joueurs_par_pays.items():
        if pays not in ANCRES:
            raise ValueError(f"Pays inconnu : {pays}. Ajoute-le dans ANCRES.")
        ancre_top = ANCRES[pays]["ancre_top"]
        ancre_bottom = ANCRES[pays]["ancre_bottom"]
        N = len(joueurs)

        pool_trie = classer_pool(joueurs)
        for rang_pool, joueur in enumerate(pool_trie, start=1):
            joueur["pays"] = pays
            joueur["rang_pool"] = rang_pool
            joueur["world_elo"] = round(
                world_elo(rang_pool, N, ancre_top, ancre_bottom), 1
            )
            tous.append(joueur)

    tous.sort(key=lambda j: -j["world_elo"])
    for i, j in enumerate(tous, start=1):
        j["rang_mondial"] = i
    return tous


# ==============================================================================
# EXEMPLE D'UTILISATION
# ==============================================================================
if __name__ == "__main__":
    exemple = {
        "France": [
            {"nom": "DUPONT", "points_elo": 2000, "rang_national": 1},
            {"nom": "MARTIN", "points_elo": 1500, "rang_national": 50},
            {"nom": "DURAND", "points_elo": 800,  "rang_national": 100},
        ],
        "Chine": [
            {"nom": "WANG",   "points_elo": None, "rang_national": 1},
            {"nom": "ZHANG",  "points_elo": None, "rang_national": 50},
            {"nom": "LI",     "points_elo": None, "rang_national": 100},
        ],
    }
    classement = classement_mondial(exemple)
    print(f"{'#':>3} {'Pays':<10} {'Elo':>7}  {'Nom':<10}")
    print("-" * 40)
    for j in classement:
        print(f"{j['rang_mondial']:>3} {j['pays']:<10} {j['world_elo']:>7.1f}  {j['nom']:<10}")
