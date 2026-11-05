
from datetime import timedelta
from unittest.mock import patch

from django.db import IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APIClient

from users.models import User
from candidates.models import CandidateProfile
from companies.models import Company
from jobs.models import Job
from applications.models import Application
from applications.serializers import (
    ApplicationStatusUpdateSerializer,
)
from audit_logs.models import AuditLog
from notifications.models import Notification


# ============================================================
# OUTILS COMMUNS
# ============================================================

class ApplicationTestDataMixin:
    """Méthodes communes de création des données de test."""

    def create_user(
        self,
        email,
        role=User.Role.CANDIDATE,
        first_name="Test",
        last_name="Utilisateur",
    ):
        return User.objects.create_user(
            email=email,
            password="TestPassword123!",
            first_name=first_name,
            last_name=last_name,
            role=role,
        )

    def create_company(self, recruiter, name="Entreprise Test"):
        return Company.objects.create(
            recruiter=recruiter,
            name=name,
            description="Entreprise utilisée pour les tests.",
            sector="Informatique",
        )

    def create_job(
        self,
        recruiter,
        company,
        title="Développeur FullStack",
        job_status=Job.Status.PUBLISHED,
        deadline=None,
    ):
        return Job.objects.create(
            recruiter=recruiter,
            company=company,
            title=title,
            description="Description du poste pour les tests.",
            sector="Informatique",
            location="Dakar",
            contract_type=Job.ContractType.CDI,
            experience_required=1,
            education_level="BAC_PLUS_3",
            skills_required="Python, Django, React",
            status=job_status,
            deadline=deadline,
        )

    def create_candidate(self, email):
        candidate = self.create_user(
            email=email,
            role=User.Role.CANDIDATE,
        )

        CandidateProfile.objects.create(
            user=candidate,
            resume="candidates/resumes/cv_test.pdf",
        )

        return candidate

    def create_application(
        self,
        candidate,
        job,
        application_status=Application.Status.PENDING,
        recruiter_note="",
    ):
        return Application.objects.create(
            candidate=candidate,
            job=job,
            status=application_status,
            recruiter_note=recruiter_note,
            cover_letter="Lettre de motivation de test.",
            resume="applications/resumes/cv_test.pdf",
        )


# ============================================================
# 1. TESTS DU MODÈLE APPLICATION
# ============================================================

class ApplicationModelTests(
    ApplicationTestDataMixin,
    TestCase,
):

    def setUp(self):
        self.recruiter = self.create_user(
            "recruiter@test.com",
            User.Role.RECRUITER,
        )

        self.company = self.create_company(
            self.recruiter,
        )

        self.job = self.create_job(
            self.recruiter,
            self.company,
        )

        self.candidate = self.create_candidate(
            "candidate@test.com",
        )

    def test_application_default_status_is_pending(self):
        application = Application.objects.create(
            candidate=self.candidate,
            job=self.job,
        )

        self.assertEqual(
            application.status,
            Application.Status.PENDING,
        )

    def test_application_is_linked_to_correct_candidate_and_job(self):
        application = self.create_application(
            self.candidate,
            self.job,
        )

        self.assertEqual(
            application.candidate,
            self.candidate,
        )

        self.assertEqual(
            application.job,
            self.job,
        )

    def test_application_status_choices_are_available(self):
        available_statuses = {
            value
            for value, label in Application.Status.choices
        }

        expected_statuses = {
            "PENDING",
            "REVIEWING",
            "SHORTLISTED",
            "INTERVIEW",
            "ACCEPTED",
            "REJECTED",
            "WITHDRAWN",
        }

        self.assertSetEqual(
            available_statuses,
            expected_statuses,
        )

    def test_candidate_cannot_apply_twice_to_same_job(self):
        self.create_application(
            self.candidate,
            self.job,
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Application.objects.create(
                    candidate=self.candidate,
                    job=self.job,
                )


# ============================================================
# 2. TESTS DES TRANSITIONS DE STATUT
# ============================================================

class ApplicationStatusTransitionTests(
    ApplicationTestDataMixin,
    TestCase,
):

    def setUp(self):
        self.recruiter = self.create_user(
            "recruiter-ats@test.com",
            User.Role.RECRUITER,
        )

        self.company = self.create_company(
            self.recruiter,
            "Entreprise ATS",
        )

        self.job = self.create_job(
            self.recruiter,
            self.company,
        )

        self.candidate_counter = 0

    def create_application_for_transition(
        self,
        application_status=None,
    ):
        self.candidate_counter += 1

        candidate = self.create_candidate(
            f"candidate-ats-{self.candidate_counter}@test.com"
        )

        return self.create_application(
            candidate=candidate,
            job=self.job,
            application_status=(
                application_status
                or Application.Status.PENDING
            ),
        )

    def validate_status_transition(
        self,
        application,
        new_status,
    ):
        serializer = ApplicationStatusUpdateSerializer(
            instance=application,
            data={"status": new_status},
            partial=True,
        )

        return (
            serializer.is_valid(),
            serializer.errors,
        )

    def test_pending_can_become_reviewing(self):
        application = self.create_application_for_transition()

        valid, errors = self.validate_status_transition(
            application,
            Application.Status.REVIEWING,
        )

        self.assertTrue(valid, errors)

    def test_pending_can_become_shortlisted(self):
        application = self.create_application_for_transition()

        valid, errors = self.validate_status_transition(
            application,
            Application.Status.SHORTLISTED,
        )

        self.assertTrue(valid, errors)

    def test_reviewing_can_become_shortlisted(self):
        application = self.create_application_for_transition(
            Application.Status.REVIEWING,
        )

        valid, errors = self.validate_status_transition(
            application,
            Application.Status.SHORTLISTED,
        )

        self.assertTrue(valid, errors)

    def test_interview_can_become_accepted(self):
        application = self.create_application_for_transition(
            Application.Status.INTERVIEW,
        )

        valid, errors = self.validate_status_transition(
            application,
            Application.Status.ACCEPTED,
        )

        self.assertTrue(valid, errors)

    def test_interview_can_become_rejected(self):
        application = self.create_application_for_transition(
            Application.Status.INTERVIEW,
        )

        valid, errors = self.validate_status_transition(
            application,
            Application.Status.REJECTED,
        )

        self.assertTrue(valid, errors)

    def test_pending_cannot_become_accepted_directly(self):
        application = self.create_application_for_transition()

        valid, errors = self.validate_status_transition(
            application,
            Application.Status.ACCEPTED,
        )

        self.assertFalse(valid)
        self.assertIn("status", errors)

    def test_pending_cannot_become_interview_manually(self):
        application = self.create_application_for_transition()

        valid, errors = self.validate_status_transition(
            application,
            Application.Status.INTERVIEW,
        )

        self.assertFalse(valid)
        self.assertIn("status", errors)

    def test_accepted_application_is_terminal(self):
        application = self.create_application_for_transition(
            Application.Status.ACCEPTED,
        )

        for new_status in [
            Application.Status.PENDING,
            Application.Status.REVIEWING,
            Application.Status.SHORTLISTED,
            Application.Status.REJECTED,
        ]:
            with self.subTest(new_status=new_status):
                valid, errors = self.validate_status_transition(
                    application,
                    new_status,
                )

                self.assertFalse(valid)

    def test_rejected_application_is_terminal(self):
        application = self.create_application_for_transition(
            Application.Status.REJECTED,
        )

        for new_status in [
            Application.Status.PENDING,
            Application.Status.REVIEWING,
            Application.Status.SHORTLISTED,
            Application.Status.ACCEPTED,
        ]:
            with self.subTest(new_status=new_status):
                valid, errors = self.validate_status_transition(
                    application,
                    new_status,
                )

                self.assertFalse(valid)

    def test_withdrawn_application_cannot_be_reopened(self):
        application = self.create_application_for_transition(
            Application.Status.WITHDRAWN,
        )

        valid, errors = self.validate_status_transition(
            application,
            Application.Status.PENDING,
        )

        self.assertFalse(valid)

    def test_recruiter_can_update_note_without_changing_status(self):
        application = self.create_application_for_transition()

        serializer = ApplicationStatusUpdateSerializer(
            instance=application,
            data={
                "recruiter_note": "Profil intéressant.",
            },
            partial=True,
        )

        self.assertTrue(
            serializer.is_valid(),
            serializer.errors,
        )

    def test_same_status_can_be_submitted_without_error(self):
        application = self.create_application_for_transition()

        valid, errors = self.validate_status_transition(
            application,
            Application.Status.PENDING,
        )

        self.assertTrue(valid, errors)

    def test_empty_update_is_rejected(self):
        application = self.create_application_for_transition()

        serializer = ApplicationStatusUpdateSerializer(
            instance=application,
            data={},
            partial=True,
        )

        self.assertFalse(serializer.is_valid())


# ============================================================
# 3. TESTS DES API ET DES PERMISSIONS
# ============================================================

class ApplicationAPITests(
    ApplicationTestDataMixin,
    TestCase,
):

    def setUp(self):
        self.client = APIClient()

        self.recruiter = self.create_user(
            "api-recruiter@test.com",
            User.Role.RECRUITER,
        )

        self.other_recruiter = self.create_user(
            "other-recruiter@test.com",
            User.Role.RECRUITER,
        )

        self.candidate = self.create_candidate(
            "api-candidate@test.com",
        )

        self.other_candidate = self.create_candidate(
            "other-candidate@test.com",
        )

        self.admin = self.create_user(
            "api-admin@test.com",
            User.Role.ADMIN,
        )

        self.company = self.create_company(
            self.recruiter,
            "Entreprise API",
        )

        self.other_company = self.create_company(
            self.other_recruiter,
            "Autre entreprise API",
        )

        self.job = self.create_job(
            self.recruiter,
            self.company,
        )

        self.other_job = self.create_job(
            self.other_recruiter,
            self.other_company,
            title="Autre poste",
        )

        self.application = self.create_application(
            self.candidate,
            self.job,
            recruiter_note="Note strictement interne.",
        )

        self.other_application = self.create_application(
            self.other_candidate,
            self.other_job,
        )

        self.create_url = reverse("application-create")
        self.my_list_url = reverse("my-applications")

        self.my_detail_url = reverse(
            "my-application-detail",
            kwargs={"pk": self.application.pk},
        )

        self.received_url = reverse(
            "received-applications",
        )

        self.received_detail_url = reverse(
            "received-application-detail",
            kwargs={"pk": self.application.pk},
        )

        self.status_url = reverse(
            "application-status-update",
            kwargs={"pk": self.application.pk},
        )

    # --------------------------------------------------------
    # AUTHENTIFICATION ET RÔLES
    # --------------------------------------------------------

    def test_anonymous_user_cannot_access_candidate_applications(self):
        response = self.client.get(self.my_list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_recruiter_cannot_access_candidate_application_list(self):
        self.client.force_authenticate(
            user=self.recruiter,
        )

        response = self.client.get(self.my_list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_candidate_cannot_access_recruiter_received_list(self):
        self.client.force_authenticate(
            user=self.candidate,
        )

        response = self.client.get(self.received_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_admin_cannot_access_recruiter_received_list(self):
        self.client.force_authenticate(
            user=self.admin,
        )

        response = self.client.get(self.received_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    # --------------------------------------------------------
    # ISOLATION DES CANDIDATURES
    # --------------------------------------------------------

    def test_candidate_only_sees_own_applications(self):
        self.client.force_authenticate(
            user=self.candidate,
        )

        response = self.client.get(self.my_list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        returned_ids = {
            item["id"]
            for item in response.data
        }

        self.assertIn(
            self.application.pk,
            returned_ids,
        )

        self.assertNotIn(
            self.other_application.pk,
            returned_ids,
        )

    def test_candidate_cannot_view_another_candidate_application(self):
        self.client.force_authenticate(
            user=self.candidate,
        )

        url = reverse(
            "my-application-detail",
            kwargs={"pk": self.other_application.pk},
        )

        response = self.client.get(url)

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_recruiter_only_sees_applications_for_own_jobs(self):
        self.client.force_authenticate(
            user=self.recruiter,
        )

        response = self.client.get(self.received_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        returned_ids = {
            item["id"]
            for item in response.data
        }

        self.assertIn(
            self.application.pk,
            returned_ids,
        )

        self.assertNotIn(
            self.other_application.pk,
            returned_ids,
        )

    def test_recruiter_cannot_view_another_recruiter_application(self):
        self.client.force_authenticate(
            user=self.recruiter,
        )

        url = reverse(
            "received-application-detail",
            kwargs={"pk": self.other_application.pk},
        )

        response = self.client.get(url)

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    # --------------------------------------------------------
    # CONFIDENTIALITÉ DES NOTES INTERNES
    # --------------------------------------------------------

    def test_candidate_cannot_see_recruiter_note(self):
        self.client.force_authenticate(
            user=self.candidate,
        )

        response = self.client.get(
            self.my_detail_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertNotIn(
            "recruiter_note",
            response.data,
        )

        self.assertNotIn(
            "Note strictement interne.",
            str(response.data),
        )

    def test_recruiter_can_see_own_internal_note(self):
        self.client.force_authenticate(
            user=self.recruiter,
        )

        response = self.client.get(
            self.received_detail_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertIn(
            "recruiter_note",
            response.data,
        )

        self.assertEqual(
            response.data["recruiter_note"],
            "Note strictement interne.",
        )

    # --------------------------------------------------------
    # MODIFICATION DU STATUT
    # --------------------------------------------------------

    @patch("applications.views.notify_application_status")
    def test_recruiter_can_update_application_status(
        self,
        notification_mock,
    ):
        self.client.force_authenticate(
            user=self.recruiter,
        )

        response = self.client.patch(
            self.status_url,
            {"status": Application.Status.REVIEWING},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.application.refresh_from_db()

        self.assertEqual(
            self.application.status,
            Application.Status.REVIEWING,
        )

        notification_mock.assert_called_once()

    def test_candidate_cannot_update_application_status(self):
        self.client.force_authenticate(
            user=self.candidate,
        )

        response = self.client.patch(
            self.status_url,
            {"status": Application.Status.REVIEWING},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_other_recruiter_cannot_update_application_status(self):
        self.client.force_authenticate(
            user=self.other_recruiter,
        )

        response = self.client.patch(
            self.status_url,
            {"status": Application.Status.REVIEWING},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_forbidden_status_transition_is_rejected_by_api(self):
        self.client.force_authenticate(
            user=self.recruiter,
        )

        response = self.client.patch(
            self.status_url,
            {"status": Application.Status.ACCEPTED},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.application.refresh_from_db()

        self.assertEqual(
            self.application.status,
            Application.Status.PENDING,
        )

    # --------------------------------------------------------
    # JOURNAL D'ACTIVITÉ
    # --------------------------------------------------------

    def test_status_update_creates_audit_log(self):
        self.client.force_authenticate(
            user=self.recruiter,
        )

        response = self.client.patch(
            self.status_url,
            {"status": Application.Status.REVIEWING},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        audit_exists = AuditLog.objects.filter(
            application=self.application,
            actor=self.recruiter,
            action=AuditLog.ActionType.APPLICATION_STATUS_CHANGED,
            old_value=Application.Status.PENDING,
            new_value=Application.Status.REVIEWING,
        ).exists()

        self.assertTrue(audit_exists)

    def test_note_update_creates_audit_log(self):
        self.client.force_authenticate(
            user=self.recruiter,
        )

        response = self.client.patch(
            self.status_url,
            {
                "recruiter_note": "Compétences techniques intéressantes.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertTrue(
            AuditLog.objects.filter(
                application=self.application,
                actor=self.recruiter,
                action=AuditLog.ActionType.APPLICATION_NOTE_UPDATED,
            ).exists()
        )

    # --------------------------------------------------------
    # NOTIFICATIONS
    # --------------------------------------------------------

    @patch("applications.views.notify_application_status")
    def test_status_change_dispatches_candidate_notification(
        self,
        notification_mock,
    ):
        self.client.force_authenticate(
            user=self.recruiter,
        )

        response = self.client.patch(
            self.status_url,
            {"status": Application.Status.REVIEWING},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        notification_mock.assert_called_once_with(
            self.application,
            Application.Status.PENDING,
            Application.Status.REVIEWING,
        )

    @patch("applications.views.notify_application_status")
    def test_note_only_update_does_not_dispatch_status_notification(
        self,
        notification_mock,
    ):
        self.client.force_authenticate(
            user=self.recruiter,
        )

        response = self.client.patch(
            self.status_url,
            {"recruiter_note": "Note de test."},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        notification_mock.assert_not_called()

    # --------------------------------------------------------
    # DÉPÔT D'UNE NOUVELLE CANDIDATURE
    # --------------------------------------------------------

    @patch("applications.views.notify_new_application")
    def test_candidate_can_apply_to_published_job(
        self,
        notification_mock,
    ):
        self.client.force_authenticate(
            user=self.candidate,
        )

        response = self.client.post(
            self.create_url,
            {
                "job": self.other_job.pk,
                "cover_letter": "Je souhaite rejoindre votre entreprise.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
            response.data,
        )

        application = Application.objects.get(
            candidate=self.candidate,
            job=self.other_job,
        )

        self.assertEqual(
            application.status,
            Application.Status.PENDING,
        )

        self.assertEqual(
            application.resume.name,
            "candidates/resumes/cv_test.pdf",
        )

        notification_mock.assert_called_once()

        self.assertTrue(
            AuditLog.objects.filter(
                application=application,
                actor=self.candidate,
                action=AuditLog.ActionType.APPLICATION_CREATED,
            ).exists()
        )

    def test_candidate_cannot_apply_to_closed_job(self):
        closed_job = self.create_job(
            self.recruiter,
            self.company,
            title="Poste clôturé",
            job_status=Job.Status.CLOSED,
        )

        self.client.force_authenticate(
            user=self.candidate,
        )

        response = self.client.post(
            self.create_url,
            {
                "job": closed_job.pk,
                "cover_letter": "Ma candidature.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertFalse(
            Application.objects.filter(
                candidate=self.candidate,
                job=closed_job,
            ).exists()
        )

    def test_candidate_cannot_apply_to_expired_job(self):
        expired_job = self.create_job(
            self.recruiter,
            self.company,
            title="Poste expiré",
            job_status=Job.Status.PUBLISHED,
            deadline=timezone.localdate() - timedelta(days=1),
        )

        self.client.force_authenticate(
            user=self.candidate,
        )

        response = self.client.post(
            self.create_url,
            {
                "job": expired_job.pk,
                "cover_letter": "Ma candidature.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertFalse(
            Application.objects.filter(
                candidate=self.candidate,
                job=expired_job,
            ).exists()
        )

    def test_candidate_cannot_apply_twice_through_api(self):
        self.client.force_authenticate(
            user=self.candidate,
        )

        response = self.client.post(
            self.create_url,
            {
                "job": self.job.pk,
                "cover_letter": "Deuxième candidature.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            Application.objects.filter(
                candidate=self.candidate,
                job=self.job,
            ).count(),
            1,
        )
