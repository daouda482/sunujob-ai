
import tempfile
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse

from docx import Document

from rest_framework import status
from rest_framework.test import APITestCase

from .models import CandidateProfile, CVAnalysis
from .cv_services import (
    analyze_cv_file,
    build_local_analysis,
    detect_sections,
    extract_skills,
    normalize_heading,
    normalize_text,
    read_resume_file,
)


User = get_user_model()


# =====================================================
# OUTILS DE TEST
# =====================================================

def create_docx_content():
    """
    Génère un véritable document DOCX de test.

    Le texte est suffisamment long pour permettre
    à l'analyse locale de fonctionner.
    """

    document = Document()

    document.add_heading(
        "Curriculum Vitae",
        level=1,
    )

    document.add_heading(
        "Profil professionnel",
        level=2,
    )

    document.add_paragraph(
        "Développeur informatique spécialisé dans "
        "la conception et le développement d'applications "
        "web et mobiles. Je possède une expérience dans "
        "la réalisation de projets informatiques et "
        "la gestion de bases de données."
    )

    document.add_heading(
        "Expérience professionnelle",
        level=2,
    )

    document.add_paragraph(
        "Développement d'applications avec Python, Django, "
        "React et JavaScript. Participation à la conception "
        "des API REST, à la gestion des bases de données "
        "et à l'amélioration des performances des applications."
    )

    document.add_heading(
        "Formation et études",
        level=2,
    )

    document.add_paragraph(
        "Master en informatique, spécialité conception "
        "et développement d'applications web et mobiles."
    )

    document.add_heading(
        "Compétences",
        level=2,
    )

    document.add_paragraph(
        "Python, Django, Django REST Framework, React, "
        "JavaScript, HTML, CSS, Git, Docker et SQL."
    )

    document.add_heading(
        "Projets et réalisations",
        level=2,
    )

    document.add_paragraph(
        "Conception d'une plateforme numérique de recrutement "
        "et de gestion des candidatures."
    )

    document.add_heading(
        "Langues",
        level=2,
    )

    document.add_paragraph(
        "Français et anglais."
    )

    buffer = BytesIO()

    document.save(buffer)

    return buffer.getvalue()


def create_docx_upload(
    filename="cv_test.docx",
    content=None,
):
    """
    Crée un fichier DOCX téléversable dans les tests.
    """

    if content is None:
        content = create_docx_content()

    return SimpleUploadedFile(
        name=filename,
        content=content,
        content_type=(
            "application/vnd.openxmlformats-officedocument."
            "wordprocessingml.document"
        ),
    )


# =====================================================
# TESTS DE NORMALISATION
# =====================================================

class NormalizeTextTests(APITestCase):

    def test_normalize_text_removes_accents(self):
        self.assertEqual(
            normalize_text("Développeur Sénégalais"),
            "developpeur senegalais",
        )

    def test_normalize_text_converts_to_lowercase(self):
        self.assertEqual(
            normalize_text("PYTHON DJANGO"),
            "python django",
        )

    def test_normalize_text_normalizes_spaces(self):
        self.assertEqual(
            normalize_text("Python     Django"),
            "python django",
        )

    def test_normalize_text_handles_none(self):
        self.assertEqual(
            normalize_text(None),
            "",
        )

    def test_normalize_heading_removes_numbering(self):
        self.assertEqual(
            normalize_heading("1. Expérience professionnelle :"),
            "experience professionnelle",
        )


# =====================================================
# TESTS DE DÉTECTION DES COMPÉTENCES
# =====================================================

class ExtractSkillsTests(APITestCase):

    def test_extract_skills_detects_known_skills(self):

        text = (
            "Développement avec Python, Django, "
            "React, JavaScript, Docker et PostgreSQL."
        )

        skills = extract_skills(text)

        self.assertIn("Python", skills)
        self.assertIn("Django", skills)
        self.assertIn("React", skills)
        self.assertIn("JavaScript", skills)
        self.assertIn("Docker", skills)
        self.assertIn("PostgreSQL", skills)

    def test_extract_skills_removes_duplicates(self):

        text = (
            "Python Python PYTHON Django Django"
        )

        skills = extract_skills(text)

        self.assertEqual(
            skills.count("Python"),
            1,
        )

        self.assertEqual(
            skills.count("Django"),
            1,
        )

    def test_extract_skills_returns_empty_list_without_skills(self):

        skills = extract_skills(
            "Je suis une personne motivée et dynamique."
        )

        self.assertEqual(
            skills,
            [],
        )

    def test_extract_skills_returns_sorted_list(self):

        skills = extract_skills(
            "Python, Django, React, Docker"
        )

        self.assertEqual(
            skills,
            sorted(skills, key=str.lower),
        )


# =====================================================
# TESTS DE DÉTECTION DES RUBRIQUES
# =====================================================

class DetectSectionsTests(APITestCase):

    def test_detect_sections_finds_existing_sections(self):

        text = """
        Profil professionnel

        Développeur web expérimenté.

        Expérience professionnelle

        Développement d'applications.

        Formation et études

        Master en informatique.

        Compétences

        Python, Django et React.
        """

        found, missing = detect_sections(text)

        self.assertIn(
            "Profil professionnel",
            found,
        )

        self.assertIn(
            "Expérience professionnelle",
            found,
        )

        self.assertIn(
            "Formation et études",
            found,
        )

        self.assertIn(
            "Compétences",
            found,
        )

        self.assertNotIn(
            "Profil professionnel",
            missing,
        )

    def test_detect_sections_does_not_confuse_sentence_with_heading(self):

        text = """
        Je possède une expérience professionnelle
        dans le développement web.
        """

        found, missing = detect_sections(text)

        self.assertNotIn(
            "Expérience professionnelle",
            found,
        )

        self.assertIn(
            "Expérience professionnelle",
            missing,
        )


# =====================================================
# TESTS DU SCORE LOCAL
# =====================================================

class LocalAnalysisTests(APITestCase):

    def test_local_analysis_returns_score_between_zero_and_100(self):

        text = """
        Profil professionnel
        Développeur informatique expérimenté.

        Expérience professionnelle
        Développement d'applications avec Python et Django.

        Formation et études
        Master en informatique.

        Compétences
        Python, Django, React, JavaScript.

        Projets et réalisations
        Création d'une application web.

        Langues
        Français et anglais.

        Contact : candidat@example.com
        Téléphone : +221 77 123 45 67
        """

        result = build_local_analysis(
            text,
            page_count=2,
        )

        self.assertGreaterEqual(
            result["score"],
            0,
        )

        self.assertLessEqual(
            result["score"],
            100,
        )

    def test_local_analysis_contains_expected_fields(self):

        result = build_local_analysis(
            "Développeur Python Django.",
            page_count=1,
        )

        expected_fields = [
            "score",
            "score_label",
            "summary",
            "word_count",
            "page_count",
            "sections_found",
            "sections_missing",
            "skills",
            "strengths",
            "recommendations",
        ]

        for field in expected_fields:
            with self.subTest(field=field):
                self.assertIn(field, result)

    def test_local_analysis_does_not_claim_employment_probability(self):

        result = build_local_analysis(
            "Développeur Python Django.",
            page_count=1,
        )

        self.assertEqual(
            result["score_label"],
            "Indice de structure et de complétude du document",
        )


# =====================================================
# TESTS DE LECTURE DES CV
# =====================================================

@override_settings(
    CV_MAX_FILE_SIZE_MB=8,
    CV_AI_OLLAMA_ENABLED=False,
)
class ReadResumeFileTests(APITestCase):

    def test_read_valid_docx(self):

        uploaded_file = create_docx_upload()

        result = read_resume_file(uploaded_file)

        self.assertIn("text", result)
        self.assertIn("sha256", result)
        self.assertIn("filename", result)

        self.assertEqual(
            result["filename"],
            "cv_test.docx",
        )

        self.assertGreater(
            len(result["text"]),
            80,
        )

    def test_read_docx_generates_sha256(self):

        uploaded_file = create_docx_upload()

        result = read_resume_file(uploaded_file)

        self.assertEqual(
            len(result["sha256"]),
            64,
        )

    def test_read_unsupported_file_raises_value_error(self):

        uploaded_file = SimpleUploadedFile(
            "document.txt",
            b"Contenu de test suffisamment long.",
            content_type="text/plain",
        )

        with self.assertRaises(ValueError):
            read_resume_file(uploaded_file)

    def test_read_empty_file_raises_value_error(self):

        uploaded_file = SimpleUploadedFile(
            "cv.docx",
            b"",
            content_type=(
                "application/vnd.openxmlformats-officedocument."
                "wordprocessingml.document"
            ),
        )

        with self.assertRaises(ValueError):
            read_resume_file(uploaded_file)

    def test_read_invalid_docx_raises_value_error(self):

        uploaded_file = SimpleUploadedFile(
            "cv.docx",
            b"Ce contenu n'est pas un vrai document Word.",
            content_type="application/octet-stream",
        )

        with self.assertRaises(ValueError):
            read_resume_file(uploaded_file)

    def test_read_old_doc_format_is_rejected(self):

        uploaded_file = SimpleUploadedFile(
            "cv.doc",
            b"Ancien document Word",
            content_type="application/msword",
        )

        with self.assertRaises(ValueError):
            read_resume_file(uploaded_file)


# =====================================================
# TESTS DU SERVICE PRINCIPAL D'ANALYSE
# =====================================================

@override_settings(
    CV_MAX_FILE_SIZE_MB=8,
    CV_AI_OLLAMA_ENABLED=False,
)
class AnalyzeCVFileTests(APITestCase):

    def test_analyze_valid_docx(self):

        uploaded_file = create_docx_upload()

        analysis = analyze_cv_file(uploaded_file)

        self.assertIn("result", analysis)
        self.assertIn("sha256", analysis)
        self.assertIn("filename", analysis)

        self.assertEqual(
            analysis["result"]["engine"],
            "local_rules",
        )

        self.assertIn(
            "score",
            analysis["result"],
        )

        self.assertIn(
            "notice",
            analysis["result"],
        )

    def test_analyze_cv_returns_valid_score(self):

        uploaded_file = create_docx_upload()

        analysis = analyze_cv_file(uploaded_file)

        score = analysis["result"]["score"]

        self.assertGreaterEqual(score, 0)
        self.assertLessEqual(score, 100)

    def test_analyze_cv_rejects_invalid_file(self):

        uploaded_file = SimpleUploadedFile(
            "cv.txt",
            b"Document non autorise.",
            content_type="text/plain",
        )

        with self.assertRaises(ValueError):
            analyze_cv_file(uploaded_file)


# =====================================================
# TESTS DES API CANDIDAT
# =====================================================

class CandidateAPITests(APITestCase):

    def setUp(self):

        self.temp_directory = tempfile.TemporaryDirectory()

        self.media_settings = override_settings(
            MEDIA_ROOT=self.temp_directory.name,
            CV_MAX_FILE_SIZE_MB=8,
            CV_AI_OLLAMA_ENABLED=False,
        )

        self.media_settings.enable()

        self.addCleanup(
            self.media_settings.disable
        )

        self.addCleanup(
            self.temp_directory.cleanup
        )

        self.candidate = User.objects.create_user(
            email="candidate@test.com",
            password="TestPassword123!",
            role="CANDIDATE",
            first_name="Candidat",
            last_name="Test",
        )

        self.recruiter = User.objects.create_user(
            email="recruiter@test.com",
            password="TestPassword123!",
            role="RECRUITER",
            first_name="Recruteur",
            last_name="Test",
        )

        self.profile = CandidateProfile.objects.create(
            user=self.candidate,
            city="Dakar",
            country="Sénégal",
        )

        self.client.force_authenticate(
            user=self.candidate,
        )

        self.profile_url = reverse(
            "candidate-profile-detail"
        )

        self.cv_url = reverse(
            "candidate-cv"
        )

        self.cv_download_url = reverse(
            "candidate-cv-download"
        )

        self.cv_analysis_url = reverse(
            "candidate-cv-analysis"
        )

        self.cv_history_url = reverse(
            "candidate-cv-analysis-history"
        )

    # -------------------------------------------------
    # PROFIL
    # -------------------------------------------------

    def test_candidate_can_view_own_profile(self):

        response = self.client.get(
            self.profile_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["email"],
            "candidate@test.com",
        )

    def test_recruiter_cannot_view_candidate_profile(self):

        self.client.force_authenticate(
            user=self.recruiter,
        )

        response = self.client.get(
            self.profile_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    # -------------------------------------------------
    # CONSULTATION DU CV
    # -------------------------------------------------

    def test_candidate_can_check_cv_without_upload(self):

        response = self.client.get(
            self.cv_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertFalse(
            response.data["has_cv"]
        )

        self.assertIsNone(
            response.data["name"]
        )

    # -------------------------------------------------
    # AJOUT DU CV
    # -------------------------------------------------

    def test_candidate_can_upload_valid_docx(self):

        uploaded_file = create_docx_upload()

        response = self.client.patch(
            self.cv_url,
            {
                "resume": uploaded_file,
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertTrue(
            response.data["has_cv"]
        )

        self.profile.refresh_from_db()

        self.assertTrue(
            bool(self.profile.resume)
        )

    def test_candidate_cannot_upload_unsupported_extension(self):

        uploaded_file = SimpleUploadedFile(
            "cv.txt",
            b"Document de test.",
            content_type="text/plain",
        )

        response = self.client.patch(
            self.cv_url,
            {
                "resume": uploaded_file,
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_candidate_cannot_upload_fake_pdf(self):

        uploaded_file = SimpleUploadedFile(
            "cv.pdf",
            b"Ce fichier n'est pas un vrai PDF.",
            content_type="application/pdf",
        )

        response = self.client.patch(
            self.cv_url,
            {
                "resume": uploaded_file,
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    # -------------------------------------------------
    # REMPLACEMENT DU CV
    # -------------------------------------------------

    def test_candidate_can_replace_cv(self):

        first_file = create_docx_upload(
            filename="ancien_cv.docx",
        )

        self.profile.resume.save(
            first_file.name,
            first_file,
            save=True,
        )

        second_file = create_docx_upload(
            filename="nouveau_cv.docx",
        )

        response = self.client.patch(
            self.cv_url,
            {
                "resume": second_file,
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.profile.refresh_from_db()

        self.assertEqual(
            Path(self.profile.resume.name).name,
            "nouveau_cv.docx",
        )

    # -------------------------------------------------
    # SUPPRESSION DU CV
    # -------------------------------------------------

    def test_candidate_can_remove_cv_from_profile(self):

        uploaded_file = create_docx_upload()

        self.profile.resume.save(
            uploaded_file.name,
            uploaded_file,
            save=True,
        )

        response = self.client.delete(
            self.cv_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.profile.refresh_from_db()

        self.assertFalse(
            bool(self.profile.resume)
        )

        self.assertFalse(
            response.data["has_cv"]
        )

    def test_remove_cv_without_existing_file_returns_404(self):

        response = self.client.delete(
            self.cv_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    # -------------------------------------------------
    # TÉLÉCHARGEMENT DU CV
    # -------------------------------------------------

    def test_candidate_can_download_own_cv(self):

        uploaded_file = create_docx_upload()

        self.profile.resume.save(
            uploaded_file.name,
            uploaded_file,
            save=True,
        )

        response = self.client.get(
            self.cv_download_url
        )

        try:
            self.assertEqual(
                response.status_code,
                status.HTTP_200_OK,
            )

            self.assertIn(
                "attachment",
                response.get("Content-Disposition", ""),
            )

            # Lire complètement le fichier téléchargé.
            downloaded_content = b"".join(
                response.streaming_content
            )

            # Vérifier que le contenu DOCX est bien récupéré.
            self.assertTrue(
                downloaded_content
            )

            # Un fichier DOCX est une archive ZIP.
            self.assertTrue(
                downloaded_content.startswith(b"PK")
            )

        finally:
            # Fermer explicitement le fichier sous Windows.
            response.close()

    def test_download_without_cv_returns_404(self):

        response = self.client.get(
            self.cv_download_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    # -------------------------------------------------
    # ANALYSE IA
    # -------------------------------------------------

    @patch("candidates.cv_views.analyze_cv_file")
    def test_candidate_can_analyze_own_cv(
        self,
        mock_analyze,
    ):

        uploaded_file = create_docx_upload()

        self.profile.resume.save(
            uploaded_file.name,
            uploaded_file,
            save=True,
        )

        mock_analyze.return_value = {
            "filename": "cv_test.docx",
            "sha256": "a" * 64,
            "result": {
                "score": 85,
                "engine": "local_rules",
                "summary": "Analyse de test.",
                "strengths": [
                    "CV bien structuré.",
                ],
                "recommendations": [
                    "Ajouter des réalisations mesurables.",
                ],
            },
        }

        response = self.client.post(
            self.cv_analysis_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertEqual(
            response.data["score"],
            85,
        )

        self.assertEqual(
            CVAnalysis.objects.filter(
                candidate=self.candidate
            ).count(),
            1,
        )

        mock_analyze.assert_called_once()

    def test_analysis_without_cv_returns_400(self):

        response = self.client.post(
            self.cv_analysis_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    # -------------------------------------------------
    # HISTORIQUE
    # -------------------------------------------------

    def test_candidate_can_view_own_analysis_history(self):

        CVAnalysis.objects.create(
            candidate=self.candidate,
            resume_name="cv_test.docx",
            resume_sha256="a" * 64,
            score=85,
            engine="local_rules",
            result={
                "summary": "Analyse de test.",
                "score": 85,
            },
        )

        response = self.client.get(
            self.cv_history_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["count"],
            1,
        )

        self.assertEqual(
            len(response.data["results"]),
            1,
        )

    def test_candidate_cannot_view_another_candidate_history(self):

        another_candidate = User.objects.create_user(
            email="another@test.com",
            password="TestPassword123!",
            role="CANDIDATE",
        )

        CVAnalysis.objects.create(
            candidate=another_candidate,
            resume_name="autre_cv.docx",
            resume_sha256="b" * 64,
            score=70,
            engine="local_rules",
            result={
                "summary": "Autre analyse.",
            },
        )

        response = self.client.get(
            self.cv_history_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["count"],
            0,
        )

    # -------------------------------------------------
    # PERMISSIONS
    # -------------------------------------------------

    def test_recruiter_cannot_manage_candidate_cv(self):

        self.client.force_authenticate(
            user=self.recruiter,
        )

        response = self.client.get(
            self.cv_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_unauthenticated_user_cannot_access_cv(self):

        self.client.force_authenticate(
            user=None,
        )

        response = self.client.get(
            self.cv_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
