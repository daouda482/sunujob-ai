
import re
import unicodedata

from pypdf import PdfReader


# Compétences que SunuJob AI sait détecter.
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


# Variantes courantes des noms de compétences.
# Le résultat renvoyé à l'API reste le nom canonique.
SKILL_ALIASES = {
    "Django REST Framework": [
        "DRF",
        "Django-REST-Framework",
    ],
    "JavaScript": [
        "JS",
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


def normalize_text(value):
    """Normalise le texte pour faciliter la comparaison."""
    value = (value or "").lower()

    value = unicodedata.normalize("NFKD", value)

    value = "".join(
        character
        for character in value
        if not unicodedata.combining(character)
    )

    # Uniformise les espaces et les retours à la ligne.
    value = re.sub(r"\s+", " ", value)

    return value.strip()


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


def skill_pattern(skill):
    """Construit une expression régulière pour un nom de compétence."""
    normalized_skill = normalize_text(skill)

    # Permet plusieurs espaces ou un retour à la ligne
    # entre les mots d'une compétence.
    escaped_skill = re.escape(normalized_skill)
    escaped_skill = escaped_skill.replace(r"\ ", r"\s+")

    # Évite notamment de détecter SQL à l'intérieur de MySQL.
    return re.compile(
        r"(?<![a-z0-9])"
        + escaped_skill
        + r"(?![a-z0-9])"
    )


def detect_skills(cv_text):
    """Détecte les compétences du vocabulaire dans le CV."""
    normalized_cv = normalize_text(cv_text)
    detected_skills = []

    for skill in SKILL_VOCABULARY:
        variants = [skill]
        variants.extend(SKILL_ALIASES.get(skill, []))

        for variant in variants:
            pattern = skill_pattern(variant)

            if pattern.search(normalized_cv):
                detected_skills.append(skill)
                break

    return sorted(set(detected_skills), key=str.lower)


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


def analyze_cv(file_path, current_skills=""):
    """
    Analyse un CV PDF et identifie les compétences
    détectées qui ne figurent pas dans le profil.
    """
    cv_text = extract_pdf_text(file_path)

    detected_skills = detect_skills(cv_text)

    # Accepte les compétences du profil séparées par
    # des virgules, des points-virgules ou des retours à la ligne.
    current_skill_items = re.split(
        r"[,;\n]+",
        current_skills or "",
    )

    existing_skills = {
        canonicalize_skill(skill.strip())
        for skill in current_skill_items
        if skill.strip()
    }

    suggested_skills = [
        skill
        for skill in detected_skills
        if canonicalize_skill(skill) not in existing_skills
    ]

    return {
        "detected_skills": detected_skills,
        "current_skills": current_skills or "",
        "suggested_skills": suggested_skills,
        "text_characters": len(cv_text),
    }
