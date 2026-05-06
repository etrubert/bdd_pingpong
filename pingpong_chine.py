"""
================================================================================
PINGPONG CHINE SCRAPER — Joueurs chinois inscrits en clubs (CTTSL + 甲A)
================================================================================

La fédération chinoise (CTTA) ne publie pas de classement national avec
clubs accessible publiquement. Solution : on agrège les rosters officiels
publiés par la presse chinoise pour les 2 ligues professionnelles :

  1. 乒超联赛 (CTTSL Super League 2025) — top tier pro
     Source : annonce officielle ttplus.cn / xiongan.gov.cn 2025-06-03

  2. 甲A联赛 (China TT Major League 2024 Stage 2) — 2e tier pro
     Source : article Tencent News du 2024-11-12

Les rosters sont embarqués dans ce fichier (les pages sources timeout en
HTTP direct depuis l'extérieur, Cloudflare/CDN protection). Pour
re-générer la donnée, il suffit de remplacer les constantes CTTSL_ROSTER
et JIA_A_ROSTER ci-dessous avec les nouveaux rosters annoncés.

Tous les joueurs (~280) sont **inscrits dans un club identifié**.

Niveaux :
  - avance        = joueurs CTTSL (top tier pro chinois)
  - intermediaire = première moitié 甲A (par ordre de roster)
  - debutant      = seconde moitié 甲A

Noms : pinyin officiel ITTF si le joueur est connu (~60 hardcodés),
sinon caractères chinois.

Sortie :
  - data/players_chine.csv

Utilisation :
  python pingpong_chine.py
================================================================================
"""

import argparse
import csv
import logging
import sys
from pathlib import Path
from typing import Iterable

# ==============================================================================
# CONFIGURATION
# ==============================================================================
ROOT_DIR = Path(__file__).parent
DATA_DIR = ROOT_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
PLAYERS_CSV = DATA_DIR / "players_chine.csv"

PLAYER_FIELDNAMES = [
    "licence",
    "nom",
    "prenom",
    "ville",
    "club_nom",
    "club_ville",
    "points_elo",
    "rang_national",
    "rang_ligue",
    "rang_comite",
    "classement_officiel",
    "niveau_categorie",
    "nombre_matchs",
    "victoires",
    "defaites",
]

logger = logging.getLogger(__name__)


# ==============================================================================
# PINYIN LOOKUP — Joueurs connus ITTF (caractères chinois -> pinyin officiel)
# ==============================================================================
# Mapping basé sur la base ITTF (results.ittf.link) et orthographe officielle
# des champions et joueurs internationaux. Pour les joueurs absents de cette
# liste, on garde les caractères chinois.
PINYIN_LOOKUP = {
    # CTTSL — Stars internationales
    "王楚钦": ("WANG", "Chuqin"),
    "梁靖崑": ("LIANG", "Jingkun"),
    "黄友政": ("HUANG", "Youzheng"),
    "周启豪": ("ZHOU", "Qihao"),
    "于子洋": ("YU", "Ziyang"),
    "林昀儒": ("LIN", "Yun-Ju"),  # Taïwan, joue en Chine
    "林诗栋": ("LIN", "Shidong"),
    "向鹏": ("XIANG", "Peng"),
    "薛飞": ("XUE", "Fei"),
    "胡畅": ("HU", "Chang"),
    "刘冠成": ("LIU", "Guancheng"),
    "林高远": ("LIN", "Gaoyuan"),
    "徐海东": ("XU", "Haidong"),
    "陈垣宇": ("CHEN", "Yuanyu"),
    "李艺杰": ("LI", "Yijie"),
    "黄旭男": ("HUANG", "Xunan"),
    "樊振东": ("FAN", "Zhendong"),
    "许昕": ("XU", "Xin"),
    "周恺": ("ZHOU", "Kai"),
    "赵子豪": ("ZHAO", "Zihao"),
    "孙正": ("SUN", "Zheng"),
    "赵钊彦": ("ZHAO", "Zhaoyan"),
    "徐瑛彬": ("XU", "Yingbin"),
    "袁励岑": ("YUAN", "Licen"),
    "闫安": ("YAN", "An"),
    "刘丁硕": ("LIU", "Dingshuo"),
    "孙闻": ("SUN", "Wen"),
    "严升": ("YAN", "Sheng"),
    "陈俊菘": ("CHEN", "Junsong"),
    "黄镇廷": ("WONG", "Chun Ting"),  # Hong Kong
    "全开源": ("QUAN", "Kaiyuan"),
    "梁俨苧": ("LIANG", "Yanning"),
    "牛冠凯": ("NIU", "Guankai"),
    "温瑞博": ("WEN", "Ruibo"),
    "周雨": ("ZHOU", "Yu"),
    "王曼昱": ("WANG", "Manyu"),
    "陈幸同": ("CHEN", "Xingtong"),
    "钱天一": ("QIAN", "Tianyi"),
    "孙颖莎": ("SUN", "Yingsha"),
    "蒯曼": ("KUAI", "Man"),
    "覃予萱": ("QIN", "Yuxuan"),
    "杨屹韵": ("YANG", "Yiyun"),
    "何卓佳": ("HE", "Zhuojia"),
    "陈熠": ("CHEN", "Yi"),
    "孙铭阳": ("SUN", "Mingyang"),
    "韩菲儿": ("HAN", "Feier"),
    "王添艺": ("WANG", "Tianyi"),
    "王艺迪": ("WANG", "Yidi"),
    "王晓彤": ("WANG", "Xiaotong"),
    "袁媛": ("YUAN", "Yuan"),
    "高雨欣": ("GAO", "Yuxin"),
    "刘诗雯": ("LIU", "Shiwen"),
    "石洵瑶": ("SHI", "Xunyao"),
    "田志希": ("JEON", "Jihee"),  # Corée, joue en Chine
    # Étrangers en CTTSL
    "平野美宇": ("HIRANO", "Miu"),
    "张本美和": ("HARIMOTO", "Miwa"),
    "木原美悠": ("KIHARA", "Miyu"),
    "松岛辉空": ("MATSUSHIMA", "Sora"),
    "申裕斌": ("SHIN", "Yubin"),
    "吴晙诚": ("WOO", "Joon-Cheol"),
    "郭勇": ("KOEN", "Pang"),
    # Légendes 甲A
    "郝帅": ("HAO", "Shuai"),
}


def to_nom_prenom(chinese_name: str) -> tuple:
    """Si le joueur est dans le lookup pinyin, retourne (nom, prenom).
    Sinon, retourne (caractères chinois, '')."""
    if chinese_name in PINYIN_LOOKUP:
        return PINYIN_LOOKUP[chinese_name]
    # Fallback : caractères chinois en nom, prénom vide
    return chinese_name, ""


# ==============================================================================
# DONNÉES — Rosters CTTSL 2025 (Super League pro)
# Source : ttplus.cn / xiongan.gov.cn — annoncé le 03/06/2025
# ==============================================================================
CTTSL_ROSTER = {
    # Hommes
    "山东魏桥·向尚运动": ["王楚钦", "梁靖崑", "黄友政", "周启豪", "于子洋", "林昀儒"],
    "黄石基地·华新 (M)": ["林诗栋", "向鹏", "薛飞", "刘冠成", "胡畅"],
    "汕头明润": ["林高远", "徐海东", "陈垣宇", "李艺杰", "李和宸", "黄旭男"],
    "上海地产集团": ["樊振东", "许昕", "周恺", "赵子豪", "孙正", "赵钊彦"],
    "山东鲁能 (M)": ["徐瑛彬", "袁励岑", "闫安", "刘丁硕", "唐乙仁", "松岛辉空"],
    "四川丰谷": ["孙闻", "严升", "陈俊菘", "黄镇廷"],
    "江苏中超电缆·迎福台": ["全开源", "梁俨苧", "林晨", "李天阳", "宋卓衡", "吴晙诚"],
    "安徽中程单招基地": ["牛冠凯", "温瑞博", "陶育畅", "宁贤坤", "郭勇"],
    "广东陈静俱乐部": ["敖华磊", "周雨", "费浚航", "王阳", "陈颢桦"],
    # Femmes
    "山东鲁能 (F)": ["王曼昱", "陈幸同", "钱天一", "徐奕"],
    "深圳大学": ["孙颖莎", "蒯曼", "覃予萱", "平野美宇"],
    "上海龙腾": ["杨屹韵", "何卓佳", "刘炜珊", "陈熠", "孙铭阳", "易爱川"],
    "黄石基地·华新 (F)": ["韩菲儿", "姚睿轩", "王添艺", "申裕斌", "木原美悠"],
    "华东理工大学": ["王艺迪", "王晓彤", "李雅可", "梁家怡", "张翔宇", "金梦妍"],
    "成都高新若水居": ["袁媛", "冷雨桐", "李雨琪", "高雨欣", "向俊霖", "张本美和"],
}

# ==============================================================================
# DONNÉES — Rosters 甲A 2024 Stage 2 (Major League, 2e tier)
# Source : news.qq.com (Tencent News), publié 12/11/2024
# ==============================================================================
JIA_A_ROSTER = {
    # Hommes
    "耐普股份": ["杨硕", "郑培锋", "王崧岳", "陈俊菘", "王家程"],
    "北京市先农坛 (M)": ["陈恒达", "孙炜翔", "黄友皓", "华磊", "孙杨"],
    "南京东大智能米粒一队": ["朱毅", "麒凯", "于何一", "刘津豪", "杨天诺"],
    "西安刘楠一队": ["牛冠凯", "李艺杰", "余心航", "李芷晟"],
    "四川银行": ["栗恩赐", "李治", "许锐锋", "蔡顺航"],
    "辽宁队 (M)": ["王浩丞", "耿林宇", "梁国栋", "郑毅弘", "刘根君"],
    "河南队": ["温瑞博", "张剑皓", "翟家乐", "李陆同", "夏易正"],
    "山西队": ["王廷宇", "马泽霖", "闫航齐", "张明昊"],
    "西安刘楠二队": ["金大泫", "张奕玮", "肖子茗", "张成日", "冷大棚"],
    "大乒协华东理工 (M)": ["许人瑞", "李天阳", "李昊", "李明泽", "张宇"],
    "浙江竞体": ["龚圣涵", "祝佳祺", "于继宁", "齐白石"],
    "广东二沙深圳大学一队": ["龙宇", "袁烜松", "黄旭男", "敖华磊"],
    "上海龙腾 (M)": ["周锦泉", "陈志阳", "沈珈", "耿旭纬", "潘一帆"],
    "武汉经开港": ["房胤池", "桂晨凯", "王晨策", "李培江", "孙鹏翔"],
    "安徽中程一队 (M)": ["罗程", "习胜", "郝帅", "马特", "李东成"],
    "重庆南开融侨中学": ["杨飞", "周汐君", "尹孟泽"],
    "重庆成现体育": ["李天宇", "李一帆", "孙智晨"],
    "安徽中程二队": ["黄祺燊", "胡东申", "韩一宽", "田中佑汰", "杨友正"],
    "济南乐搏": ["杨晓夫", "汪佳男", "范胜鹏", "董航源", "车自顺"],
    "山东至晟体育": ["曹巍", "刘瑞金", "庄立赟", "曾蓓勋", "宋卓衡"],
    "南京体育学院 (M)": ["曹彦涛", "张润东", "费浚航", "王卿伊", "胡畅"],
    # Femmes
    "深圳大学·暨南·深圳移动": ["王珠", "刘盈辰", "小塩悠菜", "薛羽婷", "周芷默"],
    "泰州睿杰超峰": ["朱培育", "蒋慧", "赵尚", "王诗喻", "王可盈"],
    "上海龙腾 (F)": ["邬铭君", "刘佳琪", "易爱川", "林雅溪", "李若楠"],
    "陕西三八妇乐": ["牛鳥星罗", "丁嘉曼", "齐菲", "吴洋晨", "崔尔泽"],
    "瑞昌市体总": ["臧小桐", "王添艺", "韩菲儿", "王鸿钰", "王越"],
    "湖北乒协一队": ["范姝涵", "孙思楠", "李益惠", "王晓楠"],
    "山东鲁能 (F-甲A)": ["王昕奕", "李思萱", "刘梦凡"],
    "辽宁队 (F)": ["何艾格", "闫禹橦", "胡一", "白雨涵"],
    "北京市先农坛 (F)": ["杨惠泽", "徐慧尧", "姜轩"],
    "成都香投": ["刘鑫", "郭琳", "夏紫宁", "冯怡璇"],
    "山东胜利东胜": ["高雅楠", "隋笑然", "姜依依", "王馨雅"],
    "福建安井": ["永野萌衣", "李仁思佳", "冈田琴菜"],
    "广东二沙深圳大学 (F)": ["杨诗璐", "陈梓颖", "梁美娟"],
    "南京体育学院 (F)": ["马恒妤", "谢雨彤", "徐佳瑞"],
    "大乒协华东理工 (F)": ["白思文", "王一朵", "金梦妍"],
    "天津女队": ["薛舒晴", "周倩婷", "张文馨", "苏馨"],
    "安徽中程·奕鹏 (F)": ["金河英", "金裕珍", "许筱漫", "姜渝", "张缤月"],
    "上海沿浦": ["车晓曦", "刘诗雯", "石洵瑶", "孙艺祯", "田志希"],
    "临沂新星": ["姜安祺", "黄楚婷", "王丽倩"],
    "四川红树林": ["高雨欣", "向俊霖", "赵若含", "刘子菱", "楚涵雯"],
    "重庆成现中滨": ["朱朝晖", "孙晓萌", "董京"],
}

# Étiquette de classement officiel selon la ligue
CLASSEMENT_OFFICIEL = {
    "CTTSL": "中乒超 (Super League pro)",
    "JIA_A_HIGH": "甲A联赛 (Major League — top)",
    "JIA_A_LOW": "甲A联赛 (Major League — base)",
}


# ==============================================================================
# UTILS
# ==============================================================================
def write_csv(path: Path, rows: Iterable[dict], fieldnames: list) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
            count += 1
    return count


def make_record(
    nom_chinois: str,
    club: str,
    niveau: str,
    classement: str,
    rang: int,
) -> dict:
    nom, prenom = to_nom_prenom(nom_chinois)
    return {
        "licence": "",          # CTTA n'expose pas de numéro public
        "nom": nom,
        "prenom": prenom,
        "ville": "",
        "club_nom": club,
        "club_ville": "",
        "points_elo": "",       # pas de points unifiés en Chine
        "rang_national": rang,  # rang dans notre échantillon
        "rang_ligue": None,
        "rang_comite": None,
        "classement_officiel": classement,
        "niveau_categorie": niveau,
        "nombre_matchs": None,
        "victoires": None,
        "defaites": None,
    }


# ==============================================================================
# COLLECTE
# ==============================================================================
def collecter() -> list:
    """Construit la liste des 300 joueurs avec niveau attribué.

    Stratégie :
      - CTTSL → tous étiquetés 'avance' (top pro)
      - 甲A première moitié → 'intermediaire'
      - 甲A seconde moitié → 'debutant'
    """
    records = []
    rang = 1

    # 1) CTTSL → avance
    cttsl_count = 0
    for club, joueurs in CTTSL_ROSTER.items():
        # Nettoie le suffixe (M) / (F) du nom de club pour l'affichage
        club_propre = club.replace(" (M)", "").replace(" (F)", "")
        for nom in joueurs:
            records.append(make_record(
                nom, club_propre, "avance",
                CLASSEMENT_OFFICIEL["CTTSL"], rang
            ))
            rang += 1
            cttsl_count += 1
    logger.info(f"CTTSL  : {cttsl_count} joueurs (niveau avance)")

    # 2) 甲A → intermediaire + debutant (split moitié-moitié)
    jia_a_flat = []
    for club, joueurs in JIA_A_ROSTER.items():
        club_propre = (
            club.replace(" (M)", "").replace(" (F)", "")
                .replace(" (F-甲A)", "")
        )
        for nom in joueurs:
            jia_a_flat.append((nom, club_propre))

    # On dédoublonne par (nom, club) au cas où
    seen = set()
    jia_a_unique = []
    for nom, club in jia_a_flat:
        key = (nom, club)
        if key in seen:
            continue
        seen.add(key)
        jia_a_unique.append((nom, club))

    midpoint = len(jia_a_unique) // 2
    for i, (nom, club) in enumerate(jia_a_unique):
        if i < midpoint:
            niveau = "intermediaire"
            classement = CLASSEMENT_OFFICIEL["JIA_A_HIGH"]
        else:
            niveau = "debutant"
            classement = CLASSEMENT_OFFICIEL["JIA_A_LOW"]
        records.append(make_record(nom, club, niveau, classement, rang))
        rang += 1
    logger.info(
        f"甲A    : {len(jia_a_unique)} joueurs "
        f"({midpoint} intermediaire + {len(jia_a_unique) - midpoint} debutant)"
    )

    return records


# ==============================================================================
# MAIN
# ==============================================================================
def run_players():
    logger.info("=" * 70)
    logger.info("SCRAPER JOUEURS CHINOIS — CTTSL 2025 + 甲A 2024 Stage 2")
    logger.info("=" * 70)

    records = collecter()

    if not records:
        logger.error("Aucun joueur collecté.")
        return False

    n = write_csv(PLAYERS_CSV, records, PLAYER_FIELDNAMES)
    logger.info(f"OK : {n} joueurs ecrits dans {PLAYERS_CSV}")

    # Stats
    from collections import Counter
    by_niveau = Counter(r["niveau_categorie"] for r in records)
    pinyin_count = sum(1 for r in records if r["prenom"])
    logger.info("")
    logger.info(f"Niveaux : {dict(by_niveau)}")
    logger.info(f"Avec pinyin (joueur connu ITTF) : {pinyin_count}/{n}")
    logger.info(f"En caractères chinois uniquement : {n - pinyin_count}/{n}")
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Scraper PingPong Chine (CTTSL + 甲A rosters).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--debug", action="store_true", help="Logs verbeux")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    success = run_players()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
