
import re
import unicodedata

from pypdf import PdfReader


# =====================================================
# COMPÉTENCES QUE SUNUJOB AI SAIT DÉTECTER
# =====================================================

SKILL_VOCABULARY = [
    "Python",
    "Django",
    "Django REST Framework",
    "FastAPI",
    "PHP",
    "Laravel",
    "JavaScript",
    "TypeScript",
    "React",
    "Angular",
    "Vue.js",
    "HTML",
    "CSS",
    "Bootstrap",
    "Tailwind CSS",
    "MySQL",
    "PostgreSQL",
    "SQLite",
    "MongoDB",
    "SQL",
    "Git",
    "GitHub",
    "Docker",
    "Kubernetes",
    "Jenkins",
    "Terraform",
    "Ansible",
    "AWS",
    "Azure",
    "Linux",
    "CI/CD",
    "REST API",
    "API REST",
    "Machine Learning",
    "Intelligence artificielle",
    "Power BI",
    "Excel",
    "Word",
    "Gestion de projet",
    "Communication",
]


# =====================================================
# VARIANTES COURANTES DES COMPÉTENCES
# =====================================================

SKILL_ALIASES = {
    "Django REST Framework": [
        "DRF",
        "Django-REST-Framework",
    ],
    "JavaScript": [
        "Java Script",
    ],
    "React": [
        "React.js",
        "ReactJS",
    ],
    "Vue.js": [
        "Vue JS",
        "VueJS",
    ],
    "Tailwind CSS": [
        "Tailwind",
    ],
    "PostgreSQL": [
        "Postgres",
    ],
    "REST API": [
        "RESTful API",
    ],
}


# =====================================================
# NORMALISATION DU TEXTE
# =====================================================

def normalize_text(value):
    """Normalise le texte pour faciliter les comparaisons."""

    value = str(value or "").lower()

    value = unicodedata.normalize("NFKD", value)

    value = "".join(
        character
        for character in value
        if not unicodedata.combining(character)
    )

    value = re.sub(r"\s+", " ", value)

    return value.strip()


# =====================================================
# EXTRACTION DU TEXTE PDF
# =====================================================

def extract_pdf_text(file_path):
    """Extrait le texte lisible d'un fichier PDF."""

    reader = PdfReader(file_path)

    if reader.is_encrypted:
        raise ValueError(
            "Le PDF est protégé par un mot de passe."
        )

    pages_text = []

    for page in reader.pages:
        pages_text.append(page.extract_text() or "")

    text = "\n".join(pages_text).strip()

    if not text:
        raise ValueError(
            "Aucun texte lisible n'a été trouvé dans ce PDF. "
            "S'il s'agit d'un document scanné, une étape OCR "
            "sera nécessaire."
        )

    return text


# =====================================================
# CONSTRUCTION DES EXPRESSIONS RÉGULIÈRES
# =====================================================

def skill_pattern(skill):
    """
    Construit une expression régulière pour détecter
    une compétence sans tenir compte de la casse.
    """

    normalized_skill = normalize_text(skill)

    escaped_skill = re.escape(normalized_skill)

    # Autoriser plusieurs espaces ou retours à la ligne
    # entre les mots d'une compétence.
    escaped_skill = escaped_skill.replace(
        r"\ ",
        r"\s+"
    )

    # Éviter les détections partielles.
    # Exemple : SQL ne doit pas être détecté dans MySQL.
    return re.compile(
        r"(?<![a-z0-9])"
        + escaped_skill
        + r"(?![a-z0-9])",
        re.IGNORECASE
    )


# =====================================================
# DÉTECTION DES COMPÉTENCES
# =====================================================

def detect_skills(cv_text):
    """Détecte les compétences connues dans le texte du CV."""

    normalized_cv = normalize_text(cv_text)

    detected_skills = []

    for skill in SKILL_VOCABULARY:

        variants = [skill]

        variants.extend(
            SKILL_ALIASES.get(skill, [])
        )

        for variant in variants:

            pattern = skill_pattern(variant)

            if pattern.search(normalized_cv):

                detected_skills.append(skill)

                break

    return sorted(
        set(detected_skills),
        key=str.lower
    )


# =====================================================
# CONVERSION VERS LE NOM CANONIQUE
# =====================================================

def canonicalize_skill(value):
    """Convertit une variante connue vers son nom canonique."""

    normalized_value = normalize_text(value)

    for skill in SKILL_VOCABULARY:

        if normalized_value == normalize_text(skill):
            return normalize_text(skill)

        for alias in SKILL_ALIASES.get(skill, []):

            if normalized_value == normalize_text(alias):
                return normalize_text(skill)

    return normalized_value


# =====================================================
# NORMALISATION DES COMPÉTENCES DU PROFIL
# =====================================================

def split_current_skills(current_skills):
    """
    Accepte les compétences sous forme de texte,
    de liste, de tuple ou d'ensemble.
    """

    if not current_skills:
        return []

    if isinstance(current_skills, str):

        return [
            skill.strip()
            for skill in re.split(
                r"[,;\n]+",
                current_skills
            )
            if skill.strip()
        ]

    if isinstance(current_skills, (list, tuple, set)):

        return [
            str(skill).strip()
            for skill in current_skills
            if str(skill).strip()
        ]

    return [
        str(current_skills).strip()
    ]


# =====================================================
# ANALYSE DU CV
# =====================================================

def analyze_cv(file_path, current_skills=""):
    """
    Analyse un CV PDF et identifie les compétences
    détectées qui ne figurent pas dans le profil candidat.
    """

    # 1. Extraire le texte du PDF.
    cv_text = extract_pdf_text(file_path)

    # 2. Détecter les compétences présentes dans le CV.
    detected_skills = detect_skills(cv_text)

    # 3. Récupérer les compétences déjà enregistrées.
    current_skill_items = split_current_skills(
        current_skills
    )

    existing_skills = {
        canonicalize_skill(skill)
        for skill in current_skill_items
    }

    # 4. Identifier les compétences absentes du profil.
    suggested_skills = [
        skill
        for skill in detected_skills
        if canonicalize_skill(skill) not in existing_skills
    ]

    # 5. Retourner le résultat.
    return {
        "detected_skills": detected_skills,
        "current_skills": current_skills or "",
        "suggested_skills": suggested_skills,
        "text_characters": len(cv_text),
    }
