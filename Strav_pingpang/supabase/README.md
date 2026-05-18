# Supabase migrations · chat data

## Ordre d'execution dans le SQL Editor Supabase

1. Ouvre **SQL Editor** dans ton dashboard Supabase
2. Colle et execute `01_schema.sql` (cree toutes les tables)
3. Colle et execute `02_seed.sql` (peuple avec les donnees du mockup)

## Tables creees

| Table | Contenu | Source dans le code actuel |
|---|---|---|
| `profiles` | 14 users (Eugenia + 12 amis + Coach + Antoine) | `FRIENDS_ALL`, `COACH_ANNOUNCE.author` |
| `friendships` | 12 amities | `FRIENDS_ALL` (Eugenia <-> chacun) |
| `clubs` | 2 clubs | `MY_CLUBS` |
| `club_members` | adhesions | derive de `MY_CLUBS` |
| `conversations` | 6 DM + 3 groupes equipe | `CONVERSATIONS`, `TEAM_GROUPS` |
| `conversation_members` | qui est dans quelle conv | derive |
| `messages` | threads de chaque conv | `MOCK_THREADS` |
| `challenges` | 1 incoming + 5 outgoing + snapshots ELO / resultat | `CHALLENGES_INCOMING`, `CHALLENGES_OUTGOING` |
| `leaderboard` | vue de classement derivee de `profiles.elo` | profils Supabase |
| `announcements` | annonce Coach Bernard | `COACH_ANNOUNCE` |
| `trainings` | prochain entrainement | `NEXT_TRAINING` |
| `training_attendance` | qui vient | (vide, a remplir quand user clique "Je viens") |

## IDs reserves

Pour pouvoir referencer entre tables, des UUID fixes sont utilises :

- `11111111-...` : Eugenia (toi, l'utilisateur connecte)
- `22222222-0000-...0X` : tes 12 amis
- `33333333-...` : Coach Bernard
- `44444444-...` : Antoine D. (demande)
- `55555555-...` : clubs
- `66666666-...` : DM conversations
- `77777777-...` : groupes equipe

## Verification rapide

Apres avoir execute les 2 scripts, lance dans le SQL Editor :

```sql
select 'profiles' as t, count(*) from profiles
union all select 'conversations', count(*) from conversations
union all select 'messages', count(*) from messages
union all select 'challenges', count(*) from challenges
union all select 'clubs', count(*) from clubs;
```

Tu devrais voir :
- profiles : 14
- conversations : 9 (6 DM + 3 team)
- messages : 12
- challenges : 6
- clubs : 2

Pour verifier le classement ELO :

```sql
select global_rank, full_name, elo
from leaderboard
order by global_rank
limit 10;
```

## RLS (Row Level Security)

Les RLS policies ne sont **pas activees** dans `01_schema.sql` pour permettre des tests rapides. Une fois l'auth en place, decommenter les `enable row level security` en bas du fichier et ajouter des policies (`select`, `insert`, `update`) qui filtrent par `auth.uid()`.
