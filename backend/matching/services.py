
import re
import unicodedata


# ============================================================
# 1. ALIAS DES COMPETENCES
# ============================================================

SKILL_ALIASES = {
    "js": "javascript",
    "javascript": "javascript",
    "ecmascript": "javascript",

    "ts": "typescript",
    "typescript": "typescript",

    "py": "python",
    "python": "python",

    "drf": "django rest framework",
    "django rest framework": "django rest framework",

    "reactjs": "react",
    "react.js": "react",
    "react": "react",

    "nodejs": "node.js",
    "node.js": "node.js",
    "node": "node.js",

    "postgres": "postgresql",
    "postgresql": "postgresql",
    "postgres sql": "postgresql",

    "mysql": "mysql",
    "mariadb": "mariadb",

    "k8s": "kubernetes",
    "kubernetes": "kubernetes",

    "amazon web services": "aws",
    "aws": "aws",

    "html5": "html",
    "html": "html",

    "css3": "css",
    "css": "css",

    "continuous integration": "ci/cd",
    "continuous deployment": "ci/cd",
    "ci/cd": "ci/cd",

    "apprentissage automatique": "machine learning",
    "machine learning": "machine learning",

    "ia": "intelligence artificielle",
    "intelligence artificielle": "intelligence artificielle",

    "rest api": "api rest",
    "restful api": "api rest",
    "api rest": "api rest",
}


# ============================================================
# 2. NORMALISATION DES TEXTES
# ============================================================

def normalize_text(value):
    """
    Convertit un texte en minuscules, retire les accents
    et uniformise les espaces.
    """

    if value is None:
        return ""

    value = str(value).strip().lower()

    value = unicodedata.normalize("NFKD", value)

    value = "".join(
        char
        for char in value
        if not unicodedata.combining(char)
    )

    return re.sub(r"\s+", " ", value).strip()


def normalize_skill(value):
    """
    Normalise une compétence et applique les alias connus.
    """

    skill = normalize_text(value)

    if not skill:
        return ""

    # Uniformiser les variantes de ponctuation.
    skill = re.sub(r"\s*\.\s*", ".", skill)
    skill = re.sub(r"\s*/\s*", "/", skill)
    skill = re.sub(r"\s*\+\s*", "+", skill)

    return SKILL_ALIASES.get(skill, skill)


# ============================================================
# 3. EXTRACTION DES COMPETENCES
# ============================================================

def extract_skills(value):
    """
    Accepte :
    - Une chaîne séparée par virgules.
    - Une chaîne séparée par points-virgules.
    - Une chaîne avec retours à la ligne.
    - Une liste, un tuple ou un ensemble.
    """

    if not value:
        return set()

    if isinstance(value, (list, tuple, set)):
        items = value
    else:
        items = re.split(r"[,;\n\r]+", str(value))

    skills = set()

    for item in items:
        skill = normalize_skill(item)

        if skill:
            skills.add(skill)

    return skills


# ============================================================
# 4. NORMALISATION DES NIVEAUX D'ETUDES
# ============================================================

EDUCATION_LEVELS = {
    "aucun diplome": 0,
    "none": 0,

    "bfem": 1,

    "bac": 2,
    "baccalaureat": 2,

    "bac+2": 3,
    "bac plus 2": 3,
    "bac_plus_2": 3,

    "bac+3": 4,
    "bac plus 3": 4,
    "bac_plus_3": 4,

    "bac+4": 5,
    "bac plus 4": 5,
    "bac_plus_4": 5,

    "bac+5": 6,
    "bac plus 5": 6,
    "bac_plus_5": 6,

    "master": 6,
    "master 1": 5,
    "master 2": 6,

    "doctorat": 7,
    "doctorate": 7,
}


def get_education_rank(value):
    """
    Retourne le rang correspondant au niveau d'études.
    Retourne None si le niveau est inconnu.
    """

    normalized = normalize_text(value)

    if not normalized:
        return None

    normalized = re.sub(r"\s*\+\s*", "+", normalized)

    return EDUCATION_LEVELS.get(normalized)


# ============================================================
# 5. CALCUL DE COMPATIBILITE
# ============================================================

def calculate_match(candidate_profile, job):
    """
    Calcule un score indicatif de compatibilité sur 100.

    Pondération :
    - Compétences : 50 %
    - Expérience : 25 %
    - Formation : 15 %
    - Domaine : 10 %

    Les critères non évaluables sont exclus du dénominateur.

    Retourne :
    score
    coverage
    matched_skills
    missing_skills
    reasons
    """

    weighted_score = 0.0
    applicable_weight = 0.0

    reasons = []

    # --------------------------------------------------------
    # A. COMPETENCES
    # --------------------------------------------------------

    candidate_skills = extract_skills(
        getattr(candidate_profile, "skills", None)
    )

    required_skills = extract_skills(
        getattr(job, "skills_required", None)
    )

    matched_skills = candidate_skills & required_skills

    missing_skills = sorted(
        required_skills - candidate_skills
    )

    if required_skills:

        skill_score = (
            len(matched_skills) / len(required_skills)
        )

        weighted_score += skill_score * 50
        applicable_weight += 50

        reasons.append(
            f"Compétences : {len(matched_skills)} sur "
            f"{len(required_skills)} correspondent."
        )

        if matched_skills:
            reasons.append(
                "Compétences correspondantes : "
                + ", ".join(sorted(matched_skills))
            )

        if missing_skills:
            reasons.append(
                "Compétences à développer : "
                + ", ".join(missing_skills)
            )

    else:
        reasons.append(
            "Les compétences requises ne sont pas renseignées. "
            "Ce critère est exclu du calcul."
        )

    # --------------------------------------------------------
    # B. EXPERIENCE PROFESSIONNELLE
    # --------------------------------------------------------

    required_experience = max(
        0,
        getattr(job, "experience_required", None) or 0
    )

    candidate_experience = max(
        0,
        getattr(candidate_profile, "years_of_experience", None) or 0
    )

    if required_experience > 0:

        experience_score = min(
            candidate_experience / required_experience,
            1.0
        )

        weighted_score += experience_score * 25
        applicable_weight += 25

        if candidate_experience >= required_experience:

            reasons.append(
                "L'expérience minimale demandée est atteinte."
            )

        else:

            reasons.append(
                f"Expérience : {candidate_experience} an(s) indiqué(s), "
                f"{required_experience} an(s) demandé(s)."
            )

    else:
        reasons.append(
            "Aucune expérience minimale n'est exigée. "
            "Ce critère est exclu du calcul."
        )

    # --------------------------------------------------------
    # C. NIVEAU D'ETUDES
    # --------------------------------------------------------

    candidate_education = get_education_rank(
        getattr(candidate_profile, "education_level", None)
    )

    required_education = get_education_rank(
        getattr(job, "education_level", None)
    )

    if required_education is not None:

        applicable_weight += 15

        if candidate_education is not None:

            if required_education == 0:
                education_score = 1.0

            else:
                education_score = min(
                    candidate_education / required_education,
                    1.0
                )

            weighted_score += education_score * 15

            if candidate_education >= required_education:

                reasons.append(
                    "Le niveau d'études demandé est atteint."
                )

            else:

                reasons.append(
                    "Le niveau d'études indiqué est inférieur "
                    "au niveau demandé."
                )

        else:

            reasons.append(
                "Le niveau d'études du candidat doit être précisé."
            )

    else:

        reasons.append(
            "Le niveau d'études demandé est absent ou non reconnu. "
            "Ce critère est exclu du calcul."
        )

    # --------------------------------------------------------
    # D. DOMAINE DE FORMATION ET SECTEUR
    # --------------------------------------------------------

    candidate_field = normalize_text(
        getattr(candidate_profile, "field_of_study", None)
    )

    job_sector = normalize_text(
        getattr(job, "sector", None)
    )

    if candidate_field and job_sector:

        applicable_weight += 10

        if (
            candidate_field == job_sector
            or candidate_field in job_sector
            or job_sector in candidate_field
        ):

            weighted_score += 10

            reasons.append(
                "Le domaine de formation correspond au secteur."
            )

        else:

            reasons.append(
                "Le domaine de formation ne correspond pas "
                "directement au secteur indiqué."
            )

    else:

        reasons.append(
            "Le domaine de formation ou le secteur n'est pas renseigné. "
            "Ce critère est exclu du calcul."
        )

    # --------------------------------------------------------
    # E. SCORE FINAL
    # --------------------------------------------------------

    if applicable_weight > 0:

        score = (
            weighted_score / applicable_weight
        ) * 100

    else:

        score = 0.0

        reasons.append(
            "Informations insuffisantes pour calculer "
            "un score de compatibilité."
        )

    # --------------------------------------------------------
    # F. COUVERTURE DES CRITERES
    # --------------------------------------------------------

    coverage = round(applicable_weight, 2)

    if coverage < 50:

        reasons.append(
            "Fiabilité limitée : plusieurs critères importants "
            "ne peuvent pas être évalués avec les informations disponibles."
        )

    return {
        "score": round(
            min(max(score, 0.0), 100.0),
            2
        ),

        "coverage": coverage,

        "matched_skills": sorted(matched_skills),

        "missing_skills": missing_skills,

        "reasons": reasons,
    }
