
import json
import requests

from django.conf import settings


class OllamaServiceError(Exception):
    """Erreur de communication avec Ollama."""


def analyze_candidate_cv(cv_text):
    """
    Analyse le contenu textuel d'un CV avec Ollama.
    Retourne un dictionnaire Python.
    """

    if not cv_text or not cv_text.strip():
        raise ValueError("Le contenu du CV est vide.")

    if len(cv_text) > 30000:
        raise ValueError("Le contenu du CV est trop volumineux.")

    prompt = f"""
Tu es un expert en recrutement et en analyse de CV.

Analyse le CV suivant de manière objective.

Identifie :
- Le profil professionnel
- Les compétences techniques
- Les compétences comportementales
- Les diplômes et formations
- Les expériences professionnelles
- Les points forts
- Les compétences à développer
- Les recommandations professionnelles

Ne fabrique aucune information.
Si une information est absente, indique une valeur vide.

Retourne exclusivement un objet JSON valide avec cette structure :

{{
    "professional_profile": "",
    "technical_skills": [],
    "soft_skills": [],
    "education": [],
    "experience": [],
    "strengths": [],
    "missing_skills": [],
    "recommendations": [],
    "summary": ""
}}

CONTENU DU CV :

{cv_text}

Réponds en français.
"""

    url = (
        f"{settings.OLLAMA_BASE_URL.rstrip('/')}"
        "/api/generate"
    )

    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.2
        }
    }

    try:
        response = requests.post(
            url,
            json=payload,
            timeout=settings.OLLAMA_TIMEOUT
        )

        response.raise_for_status()

        result = response.json()

        generated_text = result.get("response", "")

        if not generated_text:
            raise OllamaServiceError(
                "Le modèle IA n'a retourné aucune réponse."
            )

        analysis = json.loads(generated_text)

        required_fields = [
            "professional_profile",
            "technical_skills",
            "soft_skills",
            "education",
            "experience",
            "strengths",
            "missing_skills",
            "recommendations",
            "summary"
        ]

        for field in required_fields:
            if field not in analysis:
                raise OllamaServiceError(
                    f"Champ manquant dans la réponse IA : {field}"
                )

        return analysis

    except requests.exceptions.Timeout as exc:
        raise OllamaServiceError(
            "Le moteur IA met trop de temps à répondre."
        ) from exc

    except requests.exceptions.ConnectionError as exc:
        raise OllamaServiceError(
            "Impossible de contacter Ollama. "
            "Vérifiez que le service est démarré."
        ) from exc

    except requests.exceptions.RequestException as exc:
        raise OllamaServiceError(
            "Erreur lors de la communication avec Ollama."
        ) from exc

    except json.JSONDecodeError as exc:
        raise OllamaServiceError(
            "La réponse du modèle IA n'est pas un JSON valide."
        ) from exc
