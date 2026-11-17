
import json
from unittest.mock import patch

import requests

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from .models import CVAnalysis
from .serializers import CVAnalysisSerializer
from .services import (
    OllamaServiceError,
    analyze_candidate_cv,
    validate_analysis_structure,
)


User = get_user_model()


# ==========================================================
# DONNÉES DE TEST
# ==========================================================

VALID_CV_TEXT = """
Développeur FullStack avec plusieurs années d'expérience
dans la conception et le développement d'applications web.

Compétences techniques :
Python, Django, React, JavaScript, HTML, CSS et SQL.

Expérience professionnelle :
Développement d'applications web, conception d'API REST,
gestion des bases de données et intégration de solutions IA.

Formation :
Master en informatique.
"""


VALID_ANALYSIS = {
    "professional_profile": "Développeur FullStack",
    "technical_skills": ["Python", "Django", "React"],
    "soft_skills": ["Communication", "Travail en équipe"],
    "education": ["Master en informatique"],
    "experience": ["Développement d'applications web"],
    "strengths": ["Maîtrise du développement web"],
    "missing_skills": ["Kubernetes"],
    "recommendations": ["Approfondir les compétences DevOps"],
    "summary": "Profil de développeur FullStack."
}


def make_ollama_response(analysis):
    """
    Construit une réponse simulée d'Ollama.
    """

    return {
        "response": json.dumps(
            analysis,
            ensure_ascii=False,
        )
    }


# ==========================================================
# TESTS DU MODÈLE CVAnalysis
# ==========================================================

class CVAnalysisModelTests(TestCase):

    def setUp(self):
        self.candidate = User.objects.create_user(
            email="candidate_ai@example.com",
            password="TestPassword123!",
            role="CANDIDATE",
        )

    def test_create_cv_analysis(self):
        analysis = CVAnalysis.objects.create(
            candidate=self.candidate,
            cv_text=VALID_CV_TEXT,
            analysis_result=VALID_ANALYSIS,
            status=CVAnalysis.Status.COMPLETED,
        )

        self.assertEqual(analysis.candidate, self.candidate)
        self.assertEqual(analysis.status, CVAnalysis.Status.COMPLETED)
        self.assertEqual(analysis.analysis_result, VALID_ANALYSIS)
        self.assertEqual(analysis.provider, "ollama")
        self.assertEqual(analysis.model_name, "llama3.2:3b")

    def test_default_status_is_pending(self):
        analysis = CVAnalysis.objects.create(
            candidate=self.candidate,
            cv_text=VALID_CV_TEXT,
        )

        self.assertEqual(
            analysis.status,
            CVAnalysis.Status.PENDING,
        )

    def test_default_analysis_result_is_empty_dictionary(self):
        analysis = CVAnalysis.objects.create(
            candidate=self.candidate,
            cv_text=VALID_CV_TEXT,
        )

        self.assertEqual(analysis.analysis_result, {})

    def test_default_provider_is_ollama(self):
        analysis = CVAnalysis.objects.create(
            candidate=self.candidate,
            cv_text=VALID_CV_TEXT,
        )

        self.assertEqual(analysis.provider, "ollama")

    def test_default_model_name(self):
        analysis = CVAnalysis.objects.create(
            candidate=self.candidate,
            cv_text=VALID_CV_TEXT,
        )

        self.assertEqual(analysis.model_name, "llama3.2:3b")

    def test_error_message_defaults_to_empty_string(self):
        analysis = CVAnalysis.objects.create(
            candidate=self.candidate,
            cv_text=VALID_CV_TEXT,
        )

        self.assertEqual(analysis.error_message, "")

    def test_string_representation(self):
        analysis = CVAnalysis.objects.create(
            candidate=self.candidate,
            cv_text=VALID_CV_TEXT,
        )

        self.assertIn("Analyse CV", str(analysis))
        self.assertIn("En attente", str(analysis))

    def test_analysis_ordering_by_creation_date(self):
        first = CVAnalysis.objects.create(
            candidate=self.candidate,
            cv_text=VALID_CV_TEXT,
        )

        second = CVAnalysis.objects.create(
            candidate=self.candidate,
            cv_text=VALID_CV_TEXT,
        )

        analyses = list(CVAnalysis.objects.all())

        self.assertEqual(analyses[0], second)
        self.assertEqual(analyses[1], first)

    def test_candidate_reverse_relation(self):
        CVAnalysis.objects.create(
            candidate=self.candidate,
            cv_text=VALID_CV_TEXT,
        )

        self.assertEqual(
            self.candidate.ai_engine_cv_analyses.count(),
            1,
        )


# ==========================================================
# TESTS DU SERIALIZER
# ==========================================================

class CVAnalysisSerializerTests(TestCase):

    def test_valid_cv_text(self):
        serializer = CVAnalysisSerializer(
            data={
                "cv_text": VALID_CV_TEXT,
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_empty_cv_text_is_rejected(self):
        serializer = CVAnalysisSerializer(
            data={
                "cv_text": "",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("cv_text", serializer.errors)

    def test_short_cv_text_is_rejected(self):
        serializer = CVAnalysisSerializer(
            data={
                "cv_text": "Développeur web",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("cv_text", serializer.errors)

    def test_whitespace_only_cv_is_rejected(self):
        serializer = CVAnalysisSerializer(
            data={
                "cv_text": "          ",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("cv_text", serializer.errors)

    def test_cv_text_longer_than_maximum_is_rejected(self):
        serializer = CVAnalysisSerializer(
            data={
                "cv_text": "A" * 30001,
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("cv_text", serializer.errors)

    def test_cv_text_is_trimmed(self):
        serializer = CVAnalysisSerializer(
            data={
                "cv_text": "   " + VALID_CV_TEXT + "   ",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

        self.assertEqual(
            serializer.validated_data["cv_text"],
            VALID_CV_TEXT.strip(),
        )


# ==========================================================
# TESTS DE VALIDATION DE LA STRUCTURE JSON
# ==========================================================

class AnalysisStructureTests(TestCase):

    def test_valid_analysis_structure(self):
        result = validate_analysis_structure(VALID_ANALYSIS)

        self.assertEqual(result, VALID_ANALYSIS)

    def test_list_instead_of_dictionary_is_rejected(self):
        with self.assertRaises(OllamaServiceError):
            validate_analysis_structure([])

    def test_string_instead_of_dictionary_is_rejected(self):
        with self.assertRaises(OllamaServiceError):
            validate_analysis_structure("Réponse incorrecte")

    def test_missing_required_field_is_rejected(self):
        incomplete_analysis = {
            key: value
            for key, value in VALID_ANALYSIS.items()
            if key != "summary"
        }

        with self.assertRaises(OllamaServiceError):
            validate_analysis_structure(incomplete_analysis)

    def test_professional_profile_must_be_string(self):
        invalid_analysis = VALID_ANALYSIS.copy()
        invalid_analysis["professional_profile"] = []

        with self.assertRaises(OllamaServiceError):
            validate_analysis_structure(invalid_analysis)

    def test_summary_must_be_string(self):
        invalid_analysis = VALID_ANALYSIS.copy()
        invalid_analysis["summary"] = ["Résumé incorrect"]

        with self.assertRaises(OllamaServiceError):
            validate_analysis_structure(invalid_analysis)

    def test_technical_skills_must_be_list(self):
        invalid_analysis = VALID_ANALYSIS.copy()
        invalid_analysis["technical_skills"] = "Python, Django"

        with self.assertRaises(OllamaServiceError):
            validate_analysis_structure(invalid_analysis)

    def test_list_items_must_be_strings(self):
        invalid_analysis = VALID_ANALYSIS.copy()
        invalid_analysis["technical_skills"] = [
            "Python",
            123,
        ]

        with self.assertRaises(OllamaServiceError):
            validate_analysis_structure(invalid_analysis)

    def test_all_list_fields_are_checked(self):
        for field in (
            "soft_skills",
            "education",
            "experience",
            "strengths",
            "missing_skills",
            "recommendations",
        ):
            with self.subTest(field=field):
                invalid_analysis = VALID_ANALYSIS.copy()
                invalid_analysis[field] = "valeur incorrecte"

                with self.assertRaises(OllamaServiceError):
                    validate_analysis_structure(invalid_analysis)


# ==========================================================
# TESTS DU SERVICE OLLAMA
# ==========================================================

class OllamaServiceTests(TestCase):

    @patch("ai_engine.services.requests.post")
    def test_successful_cv_analysis(self, mock_post):
        mock_response = mock_post.return_value

        mock_response.json.return_value = make_ollama_response(
            VALID_ANALYSIS
        )

        mock_response.raise_for_status.return_value = None

        result = analyze_candidate_cv(VALID_CV_TEXT)

        self.assertEqual(result, VALID_ANALYSIS)
        mock_post.assert_called_once()

    def test_empty_cv_is_rejected(self):
        with self.assertRaises(ValueError):
            analyze_candidate_cv("")

    def test_whitespace_cv_is_rejected(self):
        with self.assertRaises(ValueError):
            analyze_candidate_cv("     ")

    def test_oversized_cv_is_rejected(self):
        with self.assertRaises(ValueError):
            analyze_candidate_cv("A" * 30001)

    def test_non_string_cv_is_rejected(self):
        with self.assertRaises(ValueError):
            analyze_candidate_cv(12345)

    @patch("ai_engine.services.requests.post")
    def test_ollama_timeout(self, mock_post):
        mock_post.side_effect = requests.exceptions.Timeout()

        with self.assertRaises(OllamaServiceError):
            analyze_candidate_cv(VALID_CV_TEXT)

    @patch("ai_engine.services.requests.post")
    def test_ollama_connection_error(self, mock_post):
        mock_post.side_effect = requests.exceptions.ConnectionError()

        with self.assertRaises(OllamaServiceError):
            analyze_candidate_cv(VALID_CV_TEXT)

    @patch("ai_engine.services.requests.post")
    def test_ollama_http_error(self, mock_post):
        mock_response = mock_post.return_value

        mock_response.raise_for_status.side_effect = (
            requests.exceptions.HTTPError("Erreur HTTP simulée")
        )

        with self.assertRaises(OllamaServiceError):
            analyze_candidate_cv(VALID_CV_TEXT)

    @patch("ai_engine.services.requests.post")
    def test_invalid_generated_json(self, mock_post):
        mock_response = mock_post.return_value

        mock_response.json.return_value = {
            "response": "ceci n'est pas du JSON"
        }

        mock_response.raise_for_status.return_value = None

        with self.assertRaises(OllamaServiceError):
            analyze_candidate_cv(VALID_CV_TEXT)

    @patch("ai_engine.services.requests.post")
    def test_missing_required_field(self, mock_post):
        incomplete_analysis = {
            "professional_profile": "Développeur",
            "technical_skills": [],
        }

        mock_response = mock_post.return_value

        mock_response.json.return_value = make_ollama_response(
            incomplete_analysis
        )

        mock_response.raise_for_status.return_value = None

        with self.assertRaises(OllamaServiceError):
            analyze_candidate_cv(VALID_CV_TEXT)

    @patch("ai_engine.services.requests.post")
    def test_ollama_returns_empty_response(self, mock_post):
        mock_response = mock_post.return_value

        mock_response.json.return_value = {
            "response": ""
        }

        mock_response.raise_for_status.return_value = None

        with self.assertRaises(OllamaServiceError):
            analyze_candidate_cv(VALID_CV_TEXT)

    @patch("ai_engine.services.requests.post")
    def test_ollama_response_is_not_a_dictionary(self, mock_post):
        mock_response = mock_post.return_value

        mock_response.json.return_value = []

        mock_response.raise_for_status.return_value = None

        with self.assertRaises(OllamaServiceError):
            analyze_candidate_cv(VALID_CV_TEXT)

    @patch("ai_engine.services.requests.post")
    def test_ollama_response_field_is_not_a_string(self, mock_post):
        mock_response = mock_post.return_value

        mock_response.json.return_value = {
            "response": 12345
        }

        mock_response.raise_for_status.return_value = None

        with self.assertRaises(OllamaServiceError):
            analyze_candidate_cv(VALID_CV_TEXT)

    @patch("ai_engine.services.requests.post")
    def test_generated_json_is_not_an_object(self, mock_post):
        mock_response = mock_post.return_value

        mock_response.json.return_value = {
            "response": json.dumps(["Python", "Django"])
        }

        mock_response.raise_for_status.return_value = None

        with self.assertRaises(OllamaServiceError):
            analyze_candidate_cv(VALID_CV_TEXT)

    @patch("ai_engine.services.requests.post")
    def test_invalid_analysis_field_type(self, mock_post):
        invalid_analysis = VALID_ANALYSIS.copy()
        invalid_analysis["technical_skills"] = "Python"

        mock_response = mock_post.return_value

        mock_response.json.return_value = make_ollama_response(
            invalid_analysis
        )

        mock_response.raise_for_status.return_value = None

        with self.assertRaises(OllamaServiceError):
            analyze_candidate_cv(VALID_CV_TEXT)

    @patch("ai_engine.services.requests.post")
    def test_invalid_json_http_response(self, mock_post):
        mock_response = mock_post.return_value

        mock_response.json.side_effect = requests.exceptions.JSONDecodeError(
            "JSON invalide",
            "contenu invalide",
            0,
        )

        mock_response.raise_for_status.return_value = None

        with self.assertRaises(OllamaServiceError):
            analyze_candidate_cv(VALID_CV_TEXT)


# ==========================================================
# TESTS DE L'API CV ANALYSIS
# ==========================================================

class CVAnalysisAPITests(APITestCase):

    def setUp(self):
        self.candidate = User.objects.create_user(
            email="api_candidate@example.com",
            password="TestPassword123!",
            role="CANDIDATE",
        )

        self.recruiter = User.objects.create_user(
            email="api_recruiter@example.com",
            password="TestPassword123!",
            role="RECRUITER",
        )

        self.url = reverse("analyze-cv")

    def test_anonymous_user_cannot_analyze_cv(self):
        response = self.client.post(
            self.url,
            {
                "cv_text": VALID_CV_TEXT,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_recruiter_cannot_analyze_cv(self):
        self.client.force_authenticate(user=self.recruiter)

        response = self.client.post(
            self.url,
            {
                "cv_text": VALID_CV_TEXT,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_candidate_can_analyze_cv(self):
        self.client.force_authenticate(user=self.candidate)

        with patch(
            "ai_engine.views.analyze_candidate_cv",
            return_value=VALID_ANALYSIS,
        ):
            response = self.client.post(
                self.url,
                {
                    "cv_text": VALID_CV_TEXT,
                },
                format="json",
            )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["provider"], "ollama")
        self.assertEqual(response.data["analysis"], VALID_ANALYSIS)

    def test_short_cv_returns_bad_request(self):
        self.client.force_authenticate(user=self.candidate)

        response = self.client.post(
            self.url,
            {
                "cv_text": "CV trop court",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_ollama_error_returns_service_unavailable(self):
        self.client.force_authenticate(user=self.candidate)

        with patch(
            "ai_engine.views.analyze_candidate_cv",
            side_effect=OllamaServiceError(
                "Ollama indisponible."
            ),
        ):
            response = self.client.post(
                self.url,
                {
                    "cv_text": VALID_CV_TEXT,
                },
                format="json",
            )

        self.assertEqual(
            response.status_code,
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    def test_value_error_returns_bad_request(self):
        self.client.force_authenticate(user=self.candidate)

        with patch(
            "ai_engine.views.analyze_candidate_cv",
            side_effect=ValueError("CV invalide."),
        ):
            response = self.client.post(
                self.url,
                {
                    "cv_text": VALID_CV_TEXT,
                },
                format="json",
            )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_unexpected_error_returns_internal_server_error(self):
        self.client.force_authenticate(user=self.candidate)

        with patch(
            "ai_engine.views.analyze_candidate_cv",
            side_effect=RuntimeError("Erreur interne"),
        ):
            response = self.client.post(
                self.url,
                {
                    "cv_text": VALID_CV_TEXT,
                },
                format="json",
            )

        self.assertEqual(
            response.status_code,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    def test_analysis_is_not_yet_saved_in_database(self):
        self.client.force_authenticate(user=self.candidate)

        with patch(
            "ai_engine.views.analyze_candidate_cv",
            return_value=VALID_ANALYSIS,
        ):
            response = self.client.post(
                self.url,
                {
                    "cv_text": VALID_CV_TEXT,
                },
                format="json",
            )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            CVAnalysis.objects.count(),
            0,
        )
