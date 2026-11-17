
import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from .cv_analyzer import (
    SKILL_VOCABULARY,
    normalize_text,
    skill_pattern,
    extract_pdf_text,
    detect_skills,
    canonicalize_skill,
    split_current_skills,
    analyze_cv,
)


# =====================================================
# NORMALISATION DU TEXTE
# =====================================================

class CVNormalizeTextTests(SimpleTestCase):

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
            normalize_text("  Python    Django  "),
            "python django",
        )

    def test_normalize_text_handles_none(self):
        self.assertEqual(normalize_text(None), "")

    def test_normalize_text_handles_numbers(self):
        self.assertEqual(normalize_text(12345), "12345")


# =====================================================
# CONSTRUCTION DES EXPRESSIONS RÉGULIÈRES
# =====================================================

class CVSkillPatternTests(SimpleTestCase):

    def test_skill_pattern_detects_exact_skill(self):
        pattern = skill_pattern("Python")

        self.assertIsNotNone(
            pattern.search("Je maîtrise Python.")
        )

    def test_skill_pattern_ignores_case(self):
        pattern = skill_pattern("Python")

        self.assertIsNotNone(
            pattern.search("PYTHON")
        )

    def test_skill_pattern_avoids_partial_matches(self):
        pattern = skill_pattern("SQL")

        self.assertIsNone(
            pattern.search("MySQL")
        )

    def test_skill_pattern_detects_skill_between_words(self):
        pattern = skill_pattern("Django")

        self.assertIsNotNone(
            pattern.search("Expérience avec Django et React")
        )


# =====================================================
# EXTRACTION ET DÉTECTION DES COMPÉTENCES
# =====================================================

class CVDetectSkillsTests(SimpleTestCase):

    def test_detect_python(self):
        result = detect_skills(
            "Compétences techniques : Python"
        )

        self.assertIn("Python", result)

    def test_detect_multiple_skills(self):
        result = detect_skills(
            "Développeur Python, Django, React et Docker."
        )

        self.assertIn("Python", result)
        self.assertIn("Django", result)
        self.assertIn("React", result)
        self.assertIn("Docker", result)

    def test_detect_skill_aliases(self):
        result = detect_skills(
            "Utilisation de DRF, ReactJS et Postgres."
        )

        self.assertIn("Django REST Framework", result)
        self.assertIn("React", result)
        self.assertIn("PostgreSQL", result)

    def test_detect_skills_is_case_insensitive(self):
        result = detect_skills(
            "PYTHON DJANGO JAVASCRIPT"
        )

        self.assertIn("Python", result)
        self.assertIn("Django", result)
        self.assertIn("JavaScript", result)

    def test_detect_skills_does_not_return_duplicates(self):
        result = detect_skills(
            "Python Python PYTHON"
        )

        self.assertEqual(
            result.count("Python"),
            1,
        )

    def test_detect_skills_returns_sorted_list(self):
        result = detect_skills(
            "Python Django React"
        )

        self.assertEqual(
            result,
            sorted(result, key=str.lower),
        )

    def test_detect_skills_returns_empty_list_when_unknown(self):
        result = detect_skills(
            "Candidat ayant une expérience professionnelle."
        )

        self.assertEqual(result, [])

    def test_detect_skills_uses_known_vocabulary(self):
        result = detect_skills(
            "Python, Django, Docker, AWS"
        )

        for skill in result:
            self.assertIn(skill, SKILL_VOCABULARY)


# =====================================================
# CONVERSION VERS LE NOM CANONIQUE
# =====================================================

class CVCanonicalizeSkillTests(SimpleTestCase):

    def test_canonicalize_python(self):
        self.assertEqual(
            canonicalize_skill("Python"),
            "python",
        )

    def test_canonicalize_react_alias(self):
        self.assertEqual(
            canonicalize_skill("React.js"),
            "react",
        )

    def test_canonicalize_drf_alias(self):
        self.assertEqual(
            canonicalize_skill("DRF"),
            "django rest framework",
        )

    def test_canonicalize_postgres_alias(self):
        self.assertEqual(
            canonicalize_skill("Postgres"),
            "postgresql",
        )

    def test_canonicalize_unknown_skill(self):
        self.assertEqual(
            canonicalize_skill("Compétence inconnue"),
            "competence inconnue",
        )


# =====================================================
# NORMALISATION DES COMPÉTENCES DU PROFIL
# =====================================================

class CVSplitCurrentSkillsTests(SimpleTestCase):

    def test_split_skills_from_comma_separated_text(self):
        result = split_current_skills(
            "Python, Django, React"
        )

        self.assertEqual(
            result,
            ["Python", "Django", "React"],
        )

    def test_split_skills_from_semicolon_separated_text(self):
        result = split_current_skills(
            "Python; Django; React"
        )

        self.assertEqual(
            result,
            ["Python", "Django", "React"],
        )

    def test_split_skills_from_list(self):
        result = split_current_skills([
            "Python",
            "Django",
            "React",
        ])

        self.assertEqual(
            result,
            ["Python", "Django", "React"],
        )

    def test_split_skills_from_tuple(self):
        result = split_current_skills(
            ("Python", "Django")
        )

        self.assertEqual(
            result,
            ["Python", "Django"],
        )

    def test_split_skills_from_set(self):
        result = split_current_skills(
            {"Python", "Django"}
        )

        self.assertEqual(
            set(result),
            {"Python", "Django"},
        )

    def test_split_skills_from_newline_separated_text(self):
        result = split_current_skills(
            "Python\nDjango\nReact"
        )

        self.assertEqual(
            result,
            ["Python", "Django", "React"],
        )

    def test_split_skills_removes_empty_values(self):
        result = split_current_skills(
            "Python, , Django, "
        )

        self.assertEqual(
            result,
            ["Python", "Django"],
        )

    def test_split_skills_handles_none(self):
        self.assertEqual(
            split_current_skills(None),
            [],
        )

    def test_split_skills_handles_empty_string(self):
        self.assertEqual(
            split_current_skills(""),
            [],
        )


# =====================================================
# EXTRACTION DU TEXTE PDF
# =====================================================

class CVExtractPDFTextTests(SimpleTestCase):

    @patch("matching.cv_analyzer.PdfReader")
    def test_extract_pdf_text_successfully(self, mock_pdf_reader):

        mock_reader = MagicMock()
        mock_reader.is_encrypted = False

        mock_reader.pages = [
            SimpleNamespace(
                extract_text=lambda: "Développeur Python"
            ),
            SimpleNamespace(
                extract_text=lambda: "Expert Django"
            ),
        ]

        mock_pdf_reader.return_value = mock_reader

        result = extract_pdf_text("cv_test.pdf")

        self.assertEqual(
            result,
            "Développeur Python\nExpert Django",
        )

    @patch("matching.cv_analyzer.PdfReader")
    def test_extract_pdf_text_handles_encrypted_pdf(
        self,
        mock_pdf_reader,
    ):

        mock_reader = MagicMock()
        mock_reader.is_encrypted = True

        mock_pdf_reader.return_value = mock_reader

        with self.assertRaisesMessage(
            ValueError,
            "Le PDF est protégé par un mot de passe.",
        ):
            extract_pdf_text("cv_protege.pdf")

    @patch("matching.cv_analyzer.PdfReader")
    def test_extract_pdf_text_handles_empty_pdf(
        self,
        mock_pdf_reader,
    ):

        mock_reader = MagicMock()
        mock_reader.is_encrypted = False

        mock_reader.pages = [
            SimpleNamespace(extract_text=lambda: ""),
            SimpleNamespace(extract_text=lambda: None),
        ]

        mock_pdf_reader.return_value = mock_reader

        with self.assertRaisesMessage(
            ValueError,
            "Aucun texte lisible",
        ):
            extract_pdf_text("cv_vide.pdf")

    @patch("matching.cv_analyzer.PdfReader")
    def test_extract_pdf_text_handles_spaces_only(
        self,
        mock_pdf_reader,
    ):

        mock_reader = MagicMock()
        mock_reader.is_encrypted = False

        mock_reader.pages = [
            SimpleNamespace(extract_text=lambda: "   "),
        ]

        mock_pdf_reader.return_value = mock_reader

        with self.assertRaises(ValueError):
            extract_pdf_text("cv_sans_texte.pdf")


# =====================================================
# ANALYSE COMPLÈTE DU CV
# =====================================================

class CVAnalyzeTests(SimpleTestCase):

    @patch("matching.cv_analyzer.extract_pdf_text")
    def test_analyze_cv_returns_expected_structure(
        self,
        mock_extract,
    ):

        mock_extract.return_value = (
            "Développeur Python Django React Docker"
        )

        result = analyze_cv(
            file_path="cv.pdf",
            current_skills=["Python"],
        )

        self.assertIn("detected_skills", result)
        self.assertIn("current_skills", result)
        self.assertIn("suggested_skills", result)
        self.assertIn("text_characters", result)

    @patch("matching.cv_analyzer.extract_pdf_text")
    def test_analyze_cv_detects_skills(
        self,
        mock_extract,
    ):

        mock_extract.return_value = (
            "Développeur Python Django React"
        )

        result = analyze_cv(
            file_path="cv.pdf",
            current_skills=[],
        )

        self.assertIn(
            "Python",
            result["detected_skills"],
        )

        self.assertIn(
            "Django",
            result["detected_skills"],
        )

        self.assertIn(
            "React",
            result["detected_skills"],
        )

    @patch("matching.cv_analyzer.extract_pdf_text")
    def test_analyze_cv_suggests_missing_skills(
        self,
        mock_extract,
    ):

        mock_extract.return_value = (
            "Développeur Python Django React Docker"
        )

        result = analyze_cv(
            file_path="cv.pdf",
            current_skills=["Python"],
        )

        self.assertNotIn(
            "Python",
            result["suggested_skills"],
        )

        self.assertIn(
            "Django",
            result["suggested_skills"],
        )

        self.assertIn(
            "React",
            result["suggested_skills"],
        )

        self.assertIn(
            "Docker",
            result["suggested_skills"],
        )

    @patch("matching.cv_analyzer.extract_pdf_text")
    def test_analyze_cv_recognizes_skill_aliases(
        self,
        mock_extract,
    ):

        mock_extract.return_value = (
            "Développeur React.js et Postgres"
        )

        result = analyze_cv(
            file_path="cv.pdf",
            current_skills=["React", "PostgreSQL"],
        )

        self.assertNotIn(
            "React",
            result["suggested_skills"],
        )

        self.assertNotIn(
            "PostgreSQL",
            result["suggested_skills"],
        )

    @patch("matching.cv_analyzer.extract_pdf_text")
    def test_analyze_cv_returns_original_current_skills(
        self,
        mock_extract,
    ):

        mock_extract.return_value = "Développeur Python"

        current_skills = ["Python", "Django"]

        result = analyze_cv(
            file_path="cv.pdf",
            current_skills=current_skills,
        )

        self.assertEqual(
            result["current_skills"],
            current_skills,
        )

    @patch("matching.cv_analyzer.extract_pdf_text")
    def test_analyze_cv_counts_extracted_characters(
        self,
        mock_extract,
    ):

        cv_text = "Développeur Python"

        mock_extract.return_value = cv_text

        result = analyze_cv(
            file_path="cv.pdf",
            current_skills=[],
        )

        self.assertEqual(
            result["text_characters"],
            len(cv_text),
        )

    @patch("matching.cv_analyzer.extract_pdf_text")
    def test_analyze_cv_propagates_pdf_errors(
        self,
        mock_extract,
    ):

        mock_extract.side_effect = ValueError(
            "Le PDF est protégé par un mot de passe."
        )

        with self.assertRaises(ValueError):
            analyze_cv(
                file_path="cv.pdf",
                current_skills=[],
            )
