
import json
import logging
import requests

from django.conf import settings


logger = logging.getLogger(__name__)

# =====================================================
# CONFIGURATION
# =====================================================

DEMO_MODE = False


class AICoachError(Exception):
    """Erreur liée au service d'intelligence artificielle."""
    pass


def get_ollama_configuration():
    """
    Réutilise la configuration Ollama de l'analyseur de CV.
    """

    url = getattr(
        settings,
        "CV_AI_OLLAMA_URL",
        "http://127.0.0.1:11434/api/generate"
    )

    model = getattr(
        settings,
        "CV_AI_OLLAMA_MODEL",
        "qwen2.5:3b"
    )

    timeout = getattr(
        settings,
        "CV_AI_OLLAMA_TIMEOUT",
        180
    )

    try:
        timeout = int(timeout)
    except (TypeError, ValueError):
        timeout = 180

    if timeout <= 0:
        timeout = 180

    return url, model, timeout


# =====================================================
# COMMUNICATION AVEC OLLAMA
# =====================================================

def ask_ollama(prompt):
    """
    Envoie un prompt à Ollama et retourne un objet JSON.
    """

    url, model, timeout = get_ollama_configuration()

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.3,
            "num_predict": 2500,
        },
    }

    try:
        response = requests.post(
            url,
            json=payload,
            timeout=timeout,
        )

        response.raise_for_status()

        try:
            result = response.json()
        except ValueError as exc:
            raise AICoachError(
                "Ollama a retourné une réponse HTTP qui n'est pas du JSON."
            ) from exc

        if not isinstance(result, dict):
            raise AICoachError(
                "La réponse reçue depuis Ollama est invalide."
            )

        generated_text = result.get("response", "")

        if not isinstance(generated_text, str) or not generated_text.strip():
            raise AICoachError(
                "Ollama a répondu, mais aucune réponse n'a été générée."
            )

        try:
            parsed_result = json.loads(generated_text)
        except json.JSONDecodeError as exc:
            logger.error(
                "Réponse JSON invalide d'Ollama : %s",
                generated_text[:1000],
            )

            raise AICoachError(
                "Le modèle IA a retourné un JSON invalide. "
                "Veuillez réessayer."
            ) from exc

        if not isinstance(parsed_result, dict):
            raise AICoachError(
                "Le résultat généré par le modèle IA doit être un objet JSON."
            )

        return parsed_result

    except requests.exceptions.ConnectionError as exc:
        logger.exception("Impossible de joindre Ollama.")

        raise AICoachError(
            "Impossible de joindre Ollama. Vérifiez que le serveur "
            "fonctionne sur http://127.0.0.1:11434."
        ) from exc

    except requests.exceptions.Timeout as exc:
        logger.exception("Délai d'attente Ollama dépassé.")

        raise AICoachError(
            "Ollama met trop de temps à répondre. "
            "Réessayez ou augmentez le délai d'attente."
        ) from exc

    except requests.exceptions.HTTPError as exc:
        status_code = (
            exc.response.status_code
            if exc.response is not None
            else "inconnu"
        )

        logger.exception("Erreur HTTP Ollama.")

        raise AICoachError(
            f"Erreur HTTP Ollama : {status_code}. "
            "Vérifiez le modèle et la configuration du serveur."
        ) from exc

    except requests.exceptions.RequestException as exc:
        logger.exception("Erreur réseau pendant la communication Ollama.")

        raise AICoachError(
            "Erreur réseau pendant la communication avec Ollama."
        ) from exc


# =====================================================
# GÉNÉRATION DES QUESTIONS D'ENTRETIEN
# =====================================================

def generate_questions(job_title, interview_type, experience_level):
    """
    Génère exactement 10 questions personnalisées.

    Cette signature correspond à l'appel effectué dans views.py.
    """

    prompt = f"""
Tu es un expert en recrutement et en préparation aux entretiens
professionnels au Sénégal et à l'international.

Tu dois préparer un candidat à un entretien professionnel.

INFORMATIONS DU CANDIDAT

Métier : {job_title}
Type d'entretien : {interview_type}
Niveau d'expérience : {experience_level}

MISSION

Génère exactement 10 questions pertinentes et progressives.

Les questions doivent :
- Être rédigées exclusivement en français.
- Être adaptées au métier demandé.
- Être adaptées au type d'entretien.
- Correspondre au niveau d'expérience.
- Être professionnelles et réalistes.
- Éviter les répétitions.
- Couvrir différentes compétences du métier.

FORMAT OBLIGATOIRE

Retourne exclusivement un objet JSON valide.

Structure attendue :

{{
    "questions": [
        {{
            "question_text": "Première question",
            "position": 1
        }},
        {{
            "question_text": "Deuxième question",
            "position": 2
        }}
    ]
}}

Le tableau doit contenir exactement 10 questions.
N'ajoute aucun commentaire en dehors du JSON.
"""

    result = ask_ollama(prompt)

    questions = result.get("questions", [])

    if not isinstance(questions, list):
        raise AICoachError(
            "Le format des questions générées est incorrect."
        )

    cleaned_questions = []
    seen_questions = set()

    for item in questions:

        if not isinstance(item, dict):
            continue

        question_text = item.get("question_text", "")

        if not isinstance(question_text, str):
            continue

        question_text = question_text.strip()

        if not question_text:
            continue

        normalized = question_text.casefold()

        if normalized in seen_questions:
            continue

        seen_questions.add(normalized)

        cleaned_questions.append({
            "question_text": question_text,
            "position": len(cleaned_questions) + 1,
        })

        if len(cleaned_questions) == 10:
            break

    if len(cleaned_questions) < 10:
        raise AICoachError(
            "Le modèle IA n'a pas généré les 10 questions attendues. "
            "Veuillez relancer la génération."
        )

    logger.info(
        "Génération réussie : %s questions pour le métier %s.",
        len(cleaned_questions),
        job_title,
    )

    return cleaned_questions


# =====================================================
# ÉVALUATION DES RÉPONSES DU CANDIDAT
# =====================================================

def evaluate_answer(question_text, candidate_answer, job_title):
    """
    Évalue une réponse du candidat.

    Cette signature correspond à l'appel effectué dans views.py.
    """

    prompt = f"""
Tu es un recruteur professionnel et un coach spécialisé
dans la préparation aux entretiens d'embauche.

MÉTIER CONCERNÉ :
{job_title}

QUESTION POSÉE :
{question_text}

RÉPONSE DU CANDIDAT :
{candidate_answer}

MISSION :

Évalue la réponse du candidat de manière constructive et pédagogique.

Analyse :
- La pertinence de la réponse.
- La clarté de l'explication.
- La précision des informations.
- La cohérence avec le métier.
- La qualité de l'argumentation.
- La capacité du candidat à répondre précisément à la question.

Attribue une note entière comprise entre 0 et 100.

FORMAT OBLIGATOIRE :

Retourne exclusivement un objet JSON valide :

{{
    "score": 75,
    "feedback": "Votre réponse est pertinente, mais pourrait être davantage détaillée.",
    "strengths": [
        "Bonne compréhension de la question",
        "Explication claire"
    ],
    "improvements": [
        "Ajouter des exemples concrets",
        "Mieux structurer la réponse"
    ],
    "suggested_answer": "Voici un exemple de réponse améliorée..."
}}

CONSIGNES :

- Tous les commentaires doivent être rédigés en français.
- Le score doit être un entier entre 0 et 100.
- Le feedback doit être constructif.
- Les forces et améliorations doivent être des listes.
- La réponse suggérée doit être adaptée au métier.
- N'ajoute aucun commentaire en dehors du JSON.
"""

    result = ask_ollama(prompt)

    score = result.get("score")

    if (
        not isinstance(score, int)
        or isinstance(score, bool)
        or not 0 <= score <= 100
    ):
        raise AICoachError(
            "Le modèle IA a retourné un score invalide."
        )

    feedback = result.get("feedback", "")

    if not isinstance(feedback, str) or not feedback.strip():
        raise AICoachError(
            "L'évaluation générée par l'IA ne contient aucun commentaire."
        )

    strengths = result.get("strengths", [])
    improvements = result.get("improvements", [])
    suggested_answer = result.get("suggested_answer", "")

    if not isinstance(strengths, list):
        strengths = []

    if not isinstance(improvements, list):
        improvements = []

    if not isinstance(suggested_answer, str):
        suggested_answer = ""

    strengths = [
        item.strip()
        for item in strengths
        if isinstance(item, str) and item.strip()
    ]

    improvements = [
        item.strip()
        for item in improvements
        if isinstance(item, str) and item.strip()
    ]

    logger.info(
        "Évaluation IA réussie pour le métier %s. Score : %s/100.",
        job_title,
        score,
    )

    return {
        "score": score,
        "feedback": feedback.strip(),
        "ai_feedback": feedback.strip(),
        "strengths": strengths,
        "improvements": improvements,
        "suggested_answer": suggested_answer.strip(),
        "mode": "OLLAMA",
    }
