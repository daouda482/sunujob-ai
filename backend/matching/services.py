
import re
import unicodedata


# ============================================================
# ALIAS DES COMPÉTENCES
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

    "continuous integration": "continuous integration",
    "continuous deployment": "continuous deployment",
    "ci cd": "ci/cd",
    "ci/cd": "ci/cd",

    "apprentissage automatique": "machine learning",
    "machine learning": "machine learning",

    "ia": "intelligence artificielle",
    "intelligence artificielle": "intelligence artificielle",

    "rest api": "rest api",
    "restful api": "rest api",
    "api rest": "rest api",
}


# ============================================================
# NORMALISATION DES TEXTES
# ============================================================

def normalize_text(value):
    """
    Convertit un texte en minuscules, supprime les accents
    et uniformise les espaces.
    """

    if value is None:
        return ""

    value = str(value).lower()

    value = unicodedata.normalize("NFKD", value)

    value = "".join(
        character
        for character in value
        if not unicodedata.combining(character)
    )

    value = re.sub(r"\s+", " ", value)

    return value.strip()


# ============================================================
# NORMALISATION DES COMPÉTENCES
# ============================================================

def normalize_skill(value):
    """
    Normalise une compétence et reconnaît ses alias.

    Exemples :
        JS       -> javascript
        PY       -> python
        React.js -> react
        K8s      -> kubernetes
        DRF      -> django rest framework
    """

    skill = normalize_text(value)

    if not skill:
        return ""

    # Uniformiser les séparateurs.
    skill = re.sub(r"[_-]+", " ", skill)
    skill = re.sub(r"\s+", " ", skill).strip()

    # Vérifier les alias.
    return SKILL_ALIASES.get(skill, skill)


# ============================================================
# EXTRACTION DES COMPÉTENCES
# ============================================================

def extract_skills(value):
    """
    Extrait et normalise les compétences.

    Accepte :
        - une chaîne séparée par des virgules ;
        - une chaîne séparée par des points-virgules ;
        - une chaîne avec des retours à la ligne ;
        - une liste, un tuple ou un ensemble.
    """

    if value is None:
        return set()

    if isinstance(value, (list, tuple, set)):
        items = value

    else:
        items = re.split(r"[,;\n]+", str(value))

    skills = set()

    for item in items:

        skill = normalize_skill(item)

        if skill:
            skills.add(skill)

    return skills


# ============================================================
# NIVEAUX D'ÉTUDES
# ============================================================

EDUCATION_LEVELS = {
    "aucun": 0,
    "sans diplome": 0,

    "bfem": 1,

    "bac": 2,
    "baccalaureat": 2,

    "bac+2": 3,
    "bac + 2": 3,
    "bts": 3,
    "dut": 3,

    "bac+3": 4,
    "bac + 3": 4,
    "licence": 4,

    "bac+4": 5,
    "bac + 4": 5,
    "master 1": 5,
    "master1": 5,
    "maitrise": 5,

    "bac+5": 6,
    "bac + 5": 6,
    "master": 6,
    "master 2": 6,
    "master2": 6,
    "ingenieur": 6,
    "ingenieurie": 6,

    "bac+8": 7,
    "doctorat": 7,
    "phd": 7,
}


def get_education_rank(value):
    """
    Retourne le niveau numérique correspondant au diplôme.

    Retourne None lorsque le niveau est absent ou inconnu.
    """

    education = normalize_text(value)

    if not education:
        return None

    education = re.sub(r"\s+", " ", education)

    return EDUCATION_LEVELS.get(education)


# ============================================================
# VALIDATION DES VALEURS NUMÉRIQUES
# ============================================================

def safe_number(value):
    """
    Convertit une valeur en nombre positif ou retourne None.

    Les valeurs absentes, négatives ou invalides sont ignorées.
    """

    if value is None:
        return None

    try:
        number = float(value)

    except (TypeError, ValueError, OverflowError):
        return None

    if not (number >= 0 and number < float("inf")):
        return None

    return number


# ============================================================
# CALCUL DE COMPATIBILITÉ
# ============================================================

def calculate_match(candidate_profile, job):
    """
    Calcule la compatibilité entre un candidat et une offre.

    Pondérations :
        Compétences       : 50 %
        Expérience        : 25 %
        Formation         : 15 %
        Domaine           : 10 %

    Les critères non évaluables sont exclus du calcul.

    Retourne :
        score
        coverage
        matched_skills
        missing_skills
        reasons
    """

    weighted_score = 0.0
    applicable_weight = 0.0

    matched_skills = []
    missing_skills = []
    reasons = []

    # ========================================================
    # 1. COMPÉTENCES : 50 %
    # ========================================================

    candidate_skills = extract_skills(
        getattr(candidate_profile, "skills", None)
    )

    required_skills = extract_skills(
        getattr(job, "skills_required", None)
    )

    if required_skills:

        matched_skills = sorted(
            candidate_skills.intersection(required_skills)
        )

        missing_skills = sorted(
            required_skills - candidate_skills
        )

        skill_score = (
            len(matched_skills) / len(required_skills)
        )

        weighted_score += skill_score * 50
        applicable_weight += 50

        reasons.append(
            f"Compétences : {len(matched_skills)} "
            f"sur {len(required_skills)} compétences requises "
            f"sont maîtrisées."
        )

    else:

        reasons.append(
            "Aucune compétence obligatoire renseignée "
            "dans l'offre. Ce critère est exclu du calcul."
        )

    # ========================================================
    # 2. EXPÉRIENCE PROFESSIONNELLE : 25 %
    # ========================================================

    candidate_experience = safe_number(
        getattr(
            candidate_profile,
            "years_of_experience",
            None,
        )
    )

    required_experience = safe_number(
        getattr(
            job,
            "experience_required",
            None,
        )
    )

    if (
        candidate_experience is not None
        and required_experience is not None
        and required_experience > 0
    ):

        experience_score = min(
            candidate_experience / required_experience,
            1.0,
        )

        weighted_score += experience_score * 25
        applicable_weight += 25

        if candidate_experience >= required_experience:

            reasons.append(
                "L'expérience professionnelle demandée "
                "est atteinte."
            )

        else:

            reasons.append(
                "L'expérience professionnelle du candidat "
                "est inférieure à celle demandée."
            )

    else:

        reasons.append(
            "L'expérience professionnelle ne peut pas être "
            "évaluée. Ce critère est exclu du calcul."
        )

    # ========================================================
    # 3. FORMATION : 15 %
    # ========================================================

    candidate_education = get_education_rank(
        getattr(
            candidate_profile,
            "education_level",
            None,
        )
    )

    required_education = get_education_rank(
        getattr(
            job,
            "education_level",
            None,
        )
    )

    # CORRECTION :
    # Le poids de 15 % est ajouté uniquement lorsque
    # les deux niveaux d'études sont connus.

    if (
        candidate_education is not None
        and required_education is not None
    ):

        applicable_weight += 15

        if required_education == 0:

            education_score = 1.0

        else:

            education_score = min(
                candidate_education / required_education,
                1.0,
            )

        weighted_score += education_score * 15

        if candidate_education >= required_education:

            reasons.append(
                "Le niveau d'études demandé est atteint."
            )

        else:

            reasons.append(
                "Le niveau d'études du candidat est inférieur "
                "au niveau demandé."
            )

    elif candidate_education is None:

        reasons.append(
            "Le niveau d'études du candidat n'est pas renseigné "
            "ou n'est pas reconnu. Ce critère est exclu du calcul."
        )

    else:

        reasons.append(
            "Le niveau d'études demandé dans l'offre "
            "n'est pas renseigné ou n'est pas reconnu. "
            "Ce critère est exclu du calcul."
        )

    # ========================================================
    # 4. DOMAINE PROFESSIONNEL : 10 %
    # ========================================================

    candidate_field = normalize_text(
        getattr(
            candidate_profile,
            "field_of_study",
            None,
        )
    )

    job_sector = normalize_text(
        getattr(
            job,
            "sector",
            None,
        )
    )

    if candidate_field and job_sector:

        applicable_weight += 10

        # Comparaison exacte ou inclusion contrôlée.
        domain_match = (
            candidate_field == job_sector
            or candidate_field in job_sector
            or job_sector in candidate_field
        )

        if domain_match:

            weighted_score += 10

            reasons.append(
                "Le domaine de formation correspond "
                "au secteur de l'offre."
            )

        else:

            reasons.append(
                "Le domaine de formation ne correspond pas "
                "directement au secteur de l'offre."
            )

    else:

        reasons.append(
            "Le domaine de formation ou le secteur de l'offre "
            "n'est pas renseigné. Ce critère est exclu du calcul."
        )

    # ========================================================
    # 5. SCORE FINAL
    # ========================================================

    if applicable_weight > 0:

        score = (
            weighted_score / applicable_weight
        ) * 100

    else:

        score = 0.0

    score = round(
        max(0.0, min(score, 100.0)),
        2,
    )

    coverage = round(
        applicable_weight,
        2,
    )

    # ========================================================
    # 6. RÉSULTAT
    # ========================================================

    return {
        "score": score,
        "coverage": coverage,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "reasons": reasons,
    }
