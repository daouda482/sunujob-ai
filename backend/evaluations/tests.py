
from datetime import timedelta

from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from users.models import User
from companies.models import Company
from jobs.models import Job
from applications.models import Application
from interviews.models import Interview
from audit_logs.models import AuditLog

from .models import Evaluation
from .serializers import EvaluationSerializer


class EvaluationTestBase(APITestCase):
    """
    Configuration commune aux tests du module Evaluations.
    """

    def setUp(self):
        self.client = APIClient()

        # --------------------------------------------------
        # Utilisateurs
        # --------------------------------------------------

        self.recruiter = User.objects.create_user(
            email="recruteur1@test.com",
            password="TestPassword123!",
            first_name="Mamadou",
            last_name="Diallo",
            role=User.Role.RECRUITER,
        )

        self.other_recruiter = User.objects.create_user(
            email="recruteur2@test.com",
            password="TestPassword123!",
            first_name="Abdou",
            last_name="Fall",
            role=User.Role.RECRUITER,
        )

        self.candidate = User.objects.create_user(
            email="candidat1@test.com",
            password="TestPassword123!",
            first_name="Aminata",
            last_name="Ndiaye",
            role=User.Role.CANDIDATE,
        )

        self.other_candidate = User.objects.create_user(
            email="candidat2@test.com",
            password="TestPassword123!",
            first_name="Fatou",
            last_name="Sow",
            role=User.Role.CANDIDATE,
        )

        self.admin = User.objects.create_user(
            email="admin@test.com",
            password="TestPassword123!",
            first_name="Administrateur",
            last_name="SunuJob",
            role=User.Role.ADMIN,
        )

        self.training_provider = User.objects.create_user(
            email="formation@test.com",
            password="TestPassword123!",
            first_name="Centre",
            last_name="Formation",
            role=User.Role.TRAINING_PROVIDER,
        )

        # --------------------------------------------------
        # Entreprises
        # --------------------------------------------------

        self.company = Company.objects.create(
            recruiter=self.recruiter,
            name="Entreprise Test",
            sector="Informatique",
        )

        self.other_company = Company.objects.create(
            recruiter=self.other_recruiter,
            name="Autre Entreprise",
            sector="Technologie",
        )

        # --------------------------------------------------
        # Offres d'emploi
        # --------------------------------------------------

        self.job = Job.objects.create(
            recruiter=self.recruiter,
            company=self.company,
            title="Développeur FullStack",
            description="Développement d'applications web.",
            sector="Informatique",
            location="Dakar",
            contract_type=Job.ContractType.CDI,
            status=Job.Status.PUBLISHED,
        )

        self.other_job = Job.objects.create(
            recruiter=self.other_recruiter,
            company=self.other_company,
            title="Développeur Backend",
            description="Développement backend.",
            sector="Technologie",
            location="Thiès",
            contract_type=Job.ContractType.CDI,
            status=Job.Status.PUBLISHED,
        )

        # --------------------------------------------------
        # Candidatures
        # --------------------------------------------------

        self.application = Application.objects.create(
            candidate=self.candidate,
            job=self.job,
        )

        self.other_application = Application.objects.create(
            candidate=self.other_candidate,
            job=self.other_job,
        )

        # --------------------------------------------------
        # Entretiens
        # --------------------------------------------------

        self.interview = Interview.objects.create(
            application=self.application,
            recruiter=self.recruiter,
            scheduled_at=timezone.now() + timedelta(days=2),
        )

        self.other_interview = Interview.objects.create(
            application=self.other_application,
            recruiter=self.other_recruiter,
            scheduled_at=timezone.now() + timedelta(days=3),
        )

        # --------------------------------------------------
        # Évaluation existante
        # --------------------------------------------------

        self.evaluation = Evaluation.objects.create(
            application=self.application,
            interview=self.interview,
            evaluator=self.recruiter,
            technical_score=4,
            communication_score=5,
            experience_score=3,
            motivation_score=4,
            adaptability_score=4,
            strengths="Bonne maîtrise technique.",
            weaknesses="Expérience à approfondir.",
            comments="Profil intéressant.",
            recommendation=Evaluation.Recommendation.RECOMMENDED,
            status=Evaluation.Status.DRAFT,
        )

        self.list_url = reverse("evaluation-list-create")

    def detail_url(self, evaluation=None):
        evaluation = evaluation or self.evaluation

        return reverse(
            "evaluation-detail",
            kwargs={"pk": evaluation.pk},
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def get_result_count(self, response):
        """
        Retourne le nombre d'évaluations d'une réponse
        paginée ou non paginée.
        """

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        if isinstance(response.data, dict):
            return response.data.get(
                "count",
                len(response.data.get("results", [])),
            )

        return len(response.data)

    def valid_evaluation_payload(self, **overrides):
        payload = {
            "application": self.application.pk,
            "interview": self.interview.pk,
            "technical_score": 4,
            "communication_score": 4,
            "experience_score": 4,
            "motivation_score": 5,
            "adaptability_score": 3,
            "strengths": "Bonne capacité d'analyse.",
            "weaknesses": "Améliorer certaines connaissances.",
            "comments": "Candidat intéressant.",
            "recommendation": Evaluation.Recommendation.RECOMMENDED,
            "status": Evaluation.Status.DRAFT,
        }

        payload.update(overrides)

        return payload

    def create_evaluation(self, application=None, **overrides):
        data = {
            "application": application or self.application,
            "evaluator": self.recruiter,
            "technical_score": 4,
            "communication_score": 4,
            "experience_score": 3,
            "motivation_score": 5,
            "adaptability_score": 4,
            "strengths": "Bonne analyse.",
            "weaknesses": "Expérience à renforcer.",
            "comments": "Évaluation de test.",
            "recommendation": Evaluation.Recommendation.RECOMMENDED,
            "status": Evaluation.Status.DRAFT,
        }

        data.update(overrides)

        return Evaluation.objects.create(**data)

    def complete_evaluation(self, evaluation=None):
        """
        Termine une évaluation afin de la rendre visible
        au candidat concerné.
        """

        evaluation = evaluation or self.evaluation

        evaluation.status = Evaluation.Status.COMPLETED
        evaluation.save(update_fields=["status", "updated_at"])

        return evaluation


# ==========================================================
# TESTS DU MODÈLE
# ==========================================================

class EvaluationModelTests(EvaluationTestBase):

    def test_evaluation_is_created(self):
        self.assertEqual(Evaluation.objects.count(), 1)

    def test_evaluation_is_linked_to_application(self):
        self.assertEqual(
            self.evaluation.application,
            self.application,
        )

    def test_evaluation_is_linked_to_interview(self):
        self.assertEqual(
            self.evaluation.interview,
            self.interview,
        )

    def test_evaluation_is_linked_to_evaluator(self):
        self.assertEqual(
            self.evaluation.evaluator,
            self.recruiter,
        )

    def test_default_status_is_draft(self):
        evaluation = self.create_evaluation()

        self.assertEqual(
            evaluation.status,
            Evaluation.Status.DRAFT,
        )

    def test_default_recommendation_is_to_discuss(self):
        evaluation = Evaluation.objects.create(
            application=self.application,
            evaluator=self.recruiter,
        )

        self.assertEqual(
            evaluation.recommendation,
            Evaluation.Recommendation.TO_DISCUSS,
        )

    def test_average_score_is_correct(self):
        self.assertEqual(
            self.evaluation.average_score,
            4.0,
        )

    def test_percentage_score_is_correct(self):
        self.assertEqual(
            self.evaluation.percentage_score,
            80.0,
        )

    def test_average_score_with_decimal_result(self):
        self.evaluation.technical_score = 5
        self.evaluation.communication_score = 4
        self.evaluation.experience_score = 3
        self.evaluation.motivation_score = 4
        self.evaluation.adaptability_score = 3

        self.assertEqual(
            self.evaluation.average_score,
            3.8,
        )

    def test_percentage_score_with_decimal_result(self):
        self.evaluation.technical_score = 5
        self.evaluation.communication_score = 4
        self.evaluation.experience_score = 3
        self.evaluation.motivation_score = 4
        self.evaluation.adaptability_score = 3

        self.assertEqual(
            self.evaluation.percentage_score,
            76.0,
        )

    def test_interview_can_be_null(self):
        evaluation = self.create_evaluation(
            interview=None,
        )

        self.assertIsNone(evaluation.interview)

    def test_evaluator_can_be_null(self):
        evaluation = self.create_evaluation(
            evaluator=None,
        )

        self.assertIsNone(evaluation.evaluator)

    def test_string_representation(self):
        self.assertIn(
            str(self.application.pk),
            str(self.evaluation),
        )


# ==========================================================
# TESTS DU SERIALIZER
# ==========================================================

class EvaluationSerializerTests(EvaluationTestBase):

    def test_serializer_returns_average_score(self):
        serializer = EvaluationSerializer(
            self.evaluation,
        )

        self.assertEqual(
            serializer.data["average_score"],
            4.0,
        )

    def test_serializer_returns_percentage_score(self):
        serializer = EvaluationSerializer(
            self.evaluation,
        )

        self.assertEqual(
            serializer.data["percentage_score"],
            80.0,
        )

    def test_serializer_returns_candidate_name(self):
        serializer = EvaluationSerializer(
            self.evaluation,
        )

        self.assertEqual(
            serializer.data["candidate_name"],
            "Aminata Ndiaye",
        )

    def test_serializer_returns_job_title(self):
        serializer = EvaluationSerializer(
            self.evaluation,
        )

        self.assertEqual(
            serializer.data["job_title"],
            "Développeur FullStack",
        )

    def test_serializer_returns_evaluator_email(self):
        serializer = EvaluationSerializer(
            self.evaluation,
        )

        self.assertEqual(
            serializer.data["evaluator_email"],
            self.recruiter.email,
        )

    def test_serializer_returns_recommendation_label(self):
        serializer = EvaluationSerializer(
            self.evaluation,
        )

        self.assertEqual(
            serializer.data["recommendation_label"],
            "Recommandé",
        )

    def test_serializer_returns_status_label(self):
        serializer = EvaluationSerializer(
            self.evaluation,
        )

        self.assertEqual(
            serializer.data["status_label"],
            "Brouillon",
        )

    def test_recruiter_cannot_select_another_recruiter_application(self):
        self.authenticate(self.recruiter)

        serializer = EvaluationSerializer(
            data=self.valid_evaluation_payload(
                application=self.other_application.pk,
                interview=self.other_interview.pk,
            ),
            context={
                "request": type(
                    "Request",
                    (),
                    {"user": self.recruiter},
                )()
            },
        )

        self.assertFalse(serializer.is_valid())

        self.assertIn(
            "application",
            serializer.errors,
        )

    def test_interview_must_belong_to_selected_application(self):
        self.authenticate(self.recruiter)

        serializer = EvaluationSerializer(
            data=self.valid_evaluation_payload(
                interview=self.other_interview.pk,
            ),
            context={
                "request": type(
                    "Request",
                    (),
                    {"user": self.recruiter},
                )()
            },
        )

        self.assertFalse(serializer.is_valid())

        self.assertIn(
            "interview",
            serializer.errors,
        )

    def test_completed_evaluation_requires_strengths(self):
        self.authenticate(self.recruiter)

        payload = self.valid_evaluation_payload(
            status=Evaluation.Status.COMPLETED,
            strengths="",
        )

        response = self.client.post(
            self.list_url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertIn(
            "strengths",
            response.data,
        )

    def test_completed_evaluation_requires_comments(self):
        self.authenticate(self.recruiter)

        payload = self.valid_evaluation_payload(
            status=Evaluation.Status.COMPLETED,
            comments="",
        )

        response = self.client.post(
            self.list_url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertIn(
            "comments",
            response.data,
        )

    def test_completed_evaluation_accepts_required_fields(self):
        self.authenticate(self.recruiter)

        payload = self.valid_evaluation_payload(
            status=Evaluation.Status.COMPLETED,
        )

        response = self.client.post(
            self.list_url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

    def test_score_greater_than_five_is_rejected(self):
        self.authenticate(self.recruiter)

        response = self.client.post(
            self.list_url,
            self.valid_evaluation_payload(
                technical_score=6,
            ),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_negative_score_is_rejected(self):
        self.authenticate(self.recruiter)

        response = self.client.post(
            self.list_url,
            self.valid_evaluation_payload(
                technical_score=-1,
            ),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )


# ==========================================================
# TESTS DES PERMISSIONS ET DE L'API
# ==========================================================

class EvaluationAPITests(EvaluationTestBase):

    def test_anonymous_user_cannot_list_evaluations(self):
        response = self.client.get(self.list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_anonymous_user_cannot_create_evaluation(self):
        response = self.client.post(
            self.list_url,
            self.valid_evaluation_payload(),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_recruiter_can_list_own_evaluations(self):
        self.authenticate(self.recruiter)

        response = self.client.get(self.list_url)

        self.assertEqual(
            self.get_result_count(response),
            1,
        )

    def test_recruiter_cannot_see_other_recruiter_evaluations(self):
        self.create_evaluation(
            application=self.other_application,
            evaluator=self.other_recruiter,
        )

        self.authenticate(self.recruiter)

        response = self.client.get(self.list_url)

        self.assertEqual(
            self.get_result_count(response),
            1,
        )

    def test_candidate_can_list_own_evaluations(self):
        # Une évaluation terminée est visible au candidat.
        self.complete_evaluation()

        self.authenticate(self.candidate)

        response = self.client.get(self.list_url)

        self.assertEqual(
            self.get_result_count(response),
            1,
        )

    def test_candidate_cannot_see_another_candidate_evaluations(self):
        # L'évaluation du candidat courant est terminée.
        self.complete_evaluation()

        # L'évaluation de l'autre candidat est également terminée.
        # Le test vérifie donc réellement l'isolation par propriétaire.
        self.create_evaluation(
            application=self.other_application,
            evaluator=self.other_recruiter,
            interview=self.other_interview,
            status=Evaluation.Status.COMPLETED,
        )

        self.authenticate(self.candidate)

        response = self.client.get(self.list_url)

        self.assertEqual(
            self.get_result_count(response),
            1,
        )

    def test_candidate_cannot_see_own_draft_evaluations(self):
        self.authenticate(self.candidate)

        response = self.client.get(self.list_url)

        self.assertEqual(
            self.get_result_count(response),
            0,
        )

    def test_candidate_cannot_access_another_candidate_evaluation_detail(self):
        other_evaluation = self.create_evaluation(
            application=self.other_application,
            evaluator=self.other_recruiter,
            interview=self.other_interview,
            status=Evaluation.Status.COMPLETED,
        )

        self.authenticate(self.candidate)

        response = self.client.get(
            self.detail_url(other_evaluation),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_candidate_cannot_create_evaluation(self):
        self.authenticate(self.candidate)

        response = self.client.post(
            self.list_url,
            self.valid_evaluation_payload(),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_candidate_cannot_update_evaluation(self):
        self.complete_evaluation()

        self.authenticate(self.candidate)

        response = self.client.patch(
            self.detail_url(),
            {"technical_score": 1},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_recruiter_can_create_evaluation(self):
        self.authenticate(self.recruiter)

        response = self.client.post(
            self.list_url,
            self.valid_evaluation_payload(),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertEqual(
            Evaluation.objects.count(),
            2,
        )

        evaluation = Evaluation.objects.latest("created_at")

        self.assertEqual(
            evaluation.evaluator,
            self.recruiter,
        )

    def test_other_recruiter_cannot_create_evaluation(self):
        self.authenticate(self.other_recruiter)

        response = self.client.post(
            self.list_url,
            self.valid_evaluation_payload(),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            Evaluation.objects.count(),
            1,
        )

    def test_recruiter_can_retrieve_own_evaluation(self):
        self.authenticate(self.recruiter)

        response = self.client.get(
            self.detail_url(),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_other_recruiter_cannot_retrieve_evaluation(self):
        self.authenticate(self.other_recruiter)

        response = self.client.get(
            self.detail_url(),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_admin_can_list_all_evaluations(self):
        self.create_evaluation(
            application=self.other_application,
            evaluator=self.other_recruiter,
            interview=self.other_interview,
        )

        self.authenticate(self.admin)

        response = self.client.get(self.list_url)

        self.assertEqual(
            self.get_result_count(response),
            2,
        )

    def test_admin_can_create_evaluation(self):
        self.authenticate(self.admin)

        response = self.client.post(
            self.list_url,
            self.valid_evaluation_payload(),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

    def test_training_provider_cannot_create_evaluation(self):
        self.authenticate(self.training_provider)

        response = self.client.post(
            self.list_url,
            self.valid_evaluation_payload(),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_training_provider_sees_no_evaluations(self):
        self.authenticate(self.training_provider)

        response = self.client.get(self.list_url)

        self.assertEqual(
            self.get_result_count(response),
            0,
        )

    def test_filter_by_application(self):
        self.authenticate(self.recruiter)

        response = self.client.get(
            self.list_url,
            {"application": self.application.pk},
        )

        self.assertEqual(
            self.get_result_count(response),
            1,
        )

    def test_filter_by_status(self):
        self.authenticate(self.recruiter)

        response = self.client.get(
            self.list_url,
            {"status": Evaluation.Status.DRAFT},
        )

        self.assertEqual(
            self.get_result_count(response),
            1,
        )

    def test_filter_by_recommendation(self):
        self.authenticate(self.recruiter)

        response = self.client.get(
            self.list_url,
            {
                "recommendation":
                    Evaluation.Recommendation.RECOMMENDED
            },
        )

        self.assertEqual(
            self.get_result_count(response),
            1,
        )

    def test_invalid_application_filter_returns_empty_list(self):
        self.authenticate(self.recruiter)

        response = self.client.get(
            self.list_url,
            {"application": 999999},
        )

        self.assertEqual(
            self.get_result_count(response),
            0,
        )


# ==========================================================
# TESTS DES JOURNAUX D'AUDIT
# ==========================================================

class EvaluationAuditTests(EvaluationTestBase):

    def test_creation_creates_audit_log(self):
        self.authenticate(self.recruiter)

        response = self.client.post(
            self.list_url,
            self.valid_evaluation_payload(),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        audit = AuditLog.objects.filter(
            action=AuditLog.ActionType.EVALUATION_CREATED,
            actor=self.recruiter,
            application=self.application,
        ).first()

        self.assertIsNotNone(audit)

    def test_creation_audit_contains_evaluation_id(self):
        self.authenticate(self.recruiter)

        response = self.client.post(
            self.list_url,
            self.valid_evaluation_payload(),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        audit = AuditLog.objects.filter(
            action=AuditLog.ActionType.EVALUATION_CREATED,
        ).latest("created_at")

        self.assertEqual(
            audit.metadata["evaluation_id"],
            response.data["id"],
        )

    def test_update_creates_audit_log(self):
        self.authenticate(self.recruiter)

        response = self.client.patch(
            self.detail_url(),
            {"technical_score": 5},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        audit = AuditLog.objects.filter(
            action=AuditLog.ActionType.EVALUATION_UPDATED,
            actor=self.recruiter,
            application=self.application,
        ).first()

        self.assertIsNotNone(audit)

    def test_update_audit_contains_old_and_new_values(self):
        self.authenticate(self.recruiter)

        self.client.patch(
            self.detail_url(),
            {"technical_score": 5},
            format="json",
        )

        audit = AuditLog.objects.filter(
            action=AuditLog.ActionType.EVALUATION_UPDATED,
        ).latest("created_at")

        self.assertIn(
            "technical_score",
            audit.old_value,
        )

        self.assertIn(
            "technical_score",
            audit.new_value,
        )

    def test_update_audit_contains_average_score(self):
        self.authenticate(self.recruiter)

        self.client.patch(
            self.detail_url(),
            {"technical_score": 5},
            format="json",
        )

        audit = AuditLog.objects.filter(
            action=AuditLog.ActionType.EVALUATION_UPDATED,
        ).latest("created_at")

        self.assertIn(
            "average_score",
            audit.metadata,
        )

        self.assertIn(
            "percentage_score",
            audit.metadata,
        )
