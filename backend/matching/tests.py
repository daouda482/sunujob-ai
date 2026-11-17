
from types import SimpleNamespace

from django.test import SimpleTestCase

from .services import (
    normalize_text,
    normalize_skill,
    extract_skills,
    get_education_rank,
    calculate_match,
)


class NormalizeTextTests(SimpleTestCase):
    """Tests de normalisation des textes."""

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

    def test_normalize_none_returns_empty_string(self):
        self.assertEqual(normalize_text(None), "")


class NormalizeSkillTests(SimpleTestCase):
    """Tests des alias et de la normalisation des compétences."""

    def test_javascript_aliases(self):
        self.assertEqual(normalize_skill("JS"), "javascript")
        self.assertEqual(normalize_skill("ECMAScript"), "javascript")

    def test_python_aliases(self):
        self.assertEqual(normalize_skill("PY"), "python")
        self.assertEqual(normalize_skill("Python"), "python")

    def test_react_aliases(self):
        self.assertEqual(normalize_skill("React.js"), "react")
        self.assertEqual(normalize_skill("ReactJS"), "react")

    def test_node_aliases(self):
        self.assertEqual(normalize_skill("NodeJS"), "node.js")
        self.assertEqual(normalize_skill("Node"), "node.js")

    def test_database_aliases(self):
        self.assertEqual(normalize_skill("Postgres"), "postgresql")
        self.assertEqual(normalize_skill("MySQL"), "mysql")

    def test_other_aliases(self):
        self.assertEqual(normalize_skill("K8s"), "kubernetes")
        self.assertEqual(normalize_skill("AWS"), "aws")
        self.assertEqual(normalize_skill("DRF"), "django rest framework")

    def test_empty_skill(self):
        self.assertEqual(normalize_skill(""), "")


class ExtractSkillsTests(SimpleTestCase):
    """Tests d'extraction des compétences."""

    def test_extract_skills_from_comma_separated_text(self):
        result = extract_skills("Python, Django, React")

        self.assertEqual(
            result,
            {"python", "django", "react"},
        )

    def test_extract_skills_from_semicolon_separated_text(self):
        result = extract_skills("Python; Django; React")

        self.assertEqual(
            result,
            {"python", "django", "react"},
        )

    def test_extract_skills_from_list(self):
        result = extract_skills([
            "Python",
            "JS",
            "React.js",
        ])

        self.assertEqual(
            result,
            {"python", "javascript", "react"},
        )

    def test_extract_skills_removes_duplicates(self):
        result = extract_skills(
            "Python, PY, python, Django"
        )

        self.assertEqual(
            result,
            {"python", "django"},
        )

    def test_extract_skills_from_empty_value(self):
        self.assertEqual(extract_skills(None), set())
        self.assertEqual(extract_skills(""), set())


class EducationLevelTests(SimpleTestCase):
    """Tests de reconnaissance des niveaux d'études."""

    def test_bfem_level(self):
        self.assertEqual(get_education_rank("BFEM"), 1)

    def test_baccalaureate_level(self):
        self.assertEqual(get_education_rank("Baccalauréat"), 2)

    def test_bac_plus_levels(self):
        self.assertEqual(get_education_rank("Bac+2"), 3)
        self.assertEqual(get_education_rank("Bac+3"), 4)
        self.assertEqual(get_education_rank("Bac+4"), 5)
        self.assertEqual(get_education_rank("Bac+5"), 6)

    def test_master_levels(self):
        self.assertEqual(get_education_rank("Master 1"), 5)
        self.assertEqual(get_education_rank("Master 2"), 6)

    def test_doctorate_level(self):
        self.assertEqual(get_education_rank("Doctorat"), 7)

    def test_unknown_education_level(self):
        self.assertIsNone(get_education_rank("Formation inconnue"))

    def test_empty_education_level(self):
        self.assertIsNone(get_education_rank(None))
        self.assertIsNone(get_education_rank(""))


class CalculateMatchTests(SimpleTestCase):
    """Tests du moteur de calcul de compatibilité."""

    def setUp(self):
        self.candidate = SimpleNamespace(
            skills=["Python", "React"],
            years_of_experience=3,
            education_level="Master 2",
            field_of_study="Informatique",
        )

        self.job = SimpleNamespace(
            skills_required=["Python", "Django"],
            experience_required=2,
            education_level="Bac+3",
            sector="Informatique",
        )

    def test_calculate_match_returns_expected_structure(self):
        result = calculate_match(
            self.candidate,
            self.job,
        )

        self.assertIn("score", result)
        self.assertIn("coverage", result)
        self.assertIn("matched_skills", result)
        self.assertIn("missing_skills", result)
        self.assertIn("reasons", result)

    def test_calculate_match_returns_score_between_zero_and_100(self):
        result = calculate_match(
            self.candidate,
            self.job,
        )

        self.assertGreaterEqual(result["score"], 0)
        self.assertLessEqual(result["score"], 100)

    def test_calculate_match_with_all_criteria(self):
        result = calculate_match(
            self.candidate,
            self.job,
        )

        # Compétences : 1 sur 2 = 25 points
        # Expérience : 3 ans pour 2 demandés = 25 points
        # Formation : Master 2 supérieur à Bac+3 = 15 points
        # Domaine : correspondance = 10 points
        # Total : 75 points sur 100.

        self.assertEqual(result["score"], 75.0)
        self.assertEqual(result["coverage"], 100.0)

    def test_matched_skills_are_detected(self):
        result = calculate_match(
            self.candidate,
            self.job,
        )

        self.assertEqual(
            result["matched_skills"],
            ["python"],
        )

    def test_missing_skills_are_detected(self):
        result = calculate_match(
            self.candidate,
            self.job,
        )

        self.assertEqual(
            result["missing_skills"],
            ["django"],
        )

    def test_insufficient_experience_reduces_score(self):
        self.candidate.years_of_experience = 1

        result = calculate_match(
            self.candidate,
            self.job,
        )

        self.assertLess(result["score"], 75.0)

    def test_no_matching_skills(self):
        self.candidate.skills = []

        result = calculate_match(
            self.candidate,
            self.job,
        )

        self.assertEqual(result["matched_skills"], [])
        self.assertEqual(
            result["missing_skills"],
            ["django", "python"],
        )

    def test_no_required_skills_excludes_skill_criterion(self):
        self.job.skills_required = []

        result = calculate_match(
            self.candidate,
            self.job,
        )

        self.assertEqual(result["coverage"], 50.0)

    def test_no_required_experience_excludes_experience_criterion(self):
        self.job.experience_required = 0

        result = calculate_match(
            self.candidate,
            self.job,
        )

        self.assertEqual(result["coverage"], 75.0)

    def test_domain_mismatch_reduces_score(self):
        self.candidate.field_of_study = "Comptabilité"

        result = calculate_match(
            self.candidate,
            self.job,
        )

        self.assertLess(result["score"], 75.0)

    def test_missing_candidate_education_excludes_education_criterion(self):
        """
        Vérifie que le niveau d'études non renseigné
        est exclu du calcul de la couverture.
        """

        self.candidate.education_level = None

        result = calculate_match(
            self.candidate,
            self.job,
        )

        self.assertEqual(result["coverage"], 85.0)

        self.assertAlmostEqual(
            result["score"],
            70.59,
            places=2,
        )

    def test_no_evaluable_criteria_returns_zero_score(self):
        candidate = SimpleNamespace(
            skills=[],
            years_of_experience=0,
            education_level=None,
            field_of_study="",
        )

        job = SimpleNamespace(
            skills_required=[],
            experience_required=0,
            education_level=None,
            sector="",
        )

        result = calculate_match(candidate, job)

        self.assertEqual(result["score"], 0.0)
        self.assertEqual(result["coverage"], 0.0)
        self.assertTrue(result["reasons"])

    def test_reasons_are_returned_as_a_list(self):
        result = calculate_match(
            self.candidate,
            self.job,
        )

        self.assertIsInstance(result["reasons"], list)
        self.assertGreater(len(result["reasons"]), 0)

    def test_score_is_rounded_to_two_decimal_places(self):
        self.candidate.skills = ["Python"]
        self.job.skills_required = [
            "Python",
            "Django",
            "React",
        ]

        result = calculate_match(
            self.candidate,
            self.job,
        )

        self.assertEqual(
            result["score"],
            round(result["score"], 2),
        )
