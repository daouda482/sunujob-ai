
from datetime import timedelta
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from users.models import User
from companies.models import Company

from .models import Job
from .serializers import JobSerializer, PublishedJobSerializer


class JobTestBase(APITestCase):
    """Configuration commune aux tests de l'application jobs."""

    def setUp(self):
        self.recruiter = User.objects.create_user(
            email="recruiter@example.com",
            password="TestPassword123!",
            first_name="Amadou",
            last_name="Diallo",
            role=User.Role.RECRUITER,
        )

        self.other_recruiter = User.objects.create_user(
            email="other.recruiter@example.com",
            password="TestPassword123!",
            first_name="Moussa",
            last_name="Fall",
            role=User.Role.RECRUITER,
        )

        self.candidate = User.objects.create_user(
            email="candidate@example.com",
            password="TestPassword123!",
            first_name="Fatou",
            last_name="Ndiaye",
            role=User.Role.CANDIDATE,
        )

        self.company = Company.objects.create(
            recruiter=self.recruiter,
            name="SunuTech",
            description="Entreprise spécialisée dans le numérique.",
            sector="Informatique",
            city="Dakar",
            country="Sénégal",
        )

        self.other_company = Company.objects.create(
            recruiter=self.other_recruiter,
            name="Digital Solutions",
            description="Entreprise de solutions digitales.",
            sector="Technologie",
            city="Thiès",
            country="Sénégal",
        )

        self.job = self.create_job()

        self.job_list_url = reverse("job-list-create")
        self.published_list_url = reverse("published-job-list")

    def create_job(self, **kwargs):
        """Crée une offre d'emploi avec des valeurs valides."""

        defaults = {
            "recruiter": self.recruiter,
            "company": self.company,
            "title": "Développeur Python",
            "description": "Développement d'applications web.",
            "sector": "Informatique",
            "location": "Dakar",
            "contract_type": Job.ContractType.CDI,
            "experience_required": 2,
            "education_level": "Bac+3",
            "salary_min": Decimal("300000"),
            "salary_max": Decimal("500000"),
            "skills_required": "Python, Django, React",
            "deadline": timezone.localdate() + timedelta(days=30),
            "status": Job.Status.PUBLISHED,
        }

        defaults.update(kwargs)

        return Job.objects.create(**defaults)

    def authenticate_as(self, user):
        self.client.force_authenticate(user=user)


class JobPermissionTests(JobTestBase):
    """Vérifie les permissions liées aux offres d'emploi."""

    def test_recruiter_can_access_job_list(self):
        self.authenticate_as(self.recruiter)

        response = self.client.get(self.job_list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_candidate_cannot_access_recruiter_job_list(self):
        self.authenticate_as(self.candidate)

        response = self.client.get(self.job_list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_unauthenticated_user_cannot_access_recruiter_job_list(self):
        response = self.client.get(self.job_list_url)

        self.assertIn(
            response.status_code,
            [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN,
            ],
        )

    def test_recruiter_sees_only_own_jobs(self):
        self.create_job(
            recruiter=self.other_recruiter,
            company=self.other_company,
            title="Développeur Java",
        )

        self.authenticate_as(self.recruiter)

        response = self.client.get(self.job_list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], self.job.title)

    def test_recruiter_cannot_retrieve_another_recruiters_job(self):
        other_job = self.create_job(
            recruiter=self.other_recruiter,
            company=self.other_company,
            title="Développeur Java",
        )

        self.authenticate_as(self.recruiter)

        response = self.client.get(
            reverse("job-detail", kwargs={"pk": other_job.pk})
        )

        self.assertIn(
            response.status_code,
            [
                status.HTTP_403_FORBIDDEN,
                status.HTTP_404_NOT_FOUND,
            ],
        )

    def test_recruiter_cannot_update_another_recruiters_job(self):
        other_job = self.create_job(
            recruiter=self.other_recruiter,
            company=self.other_company,
            title="Développeur Java",
        )

        self.authenticate_as(self.recruiter)

        response = self.client.patch(
            reverse("job-detail", kwargs={"pk": other_job.pk}),
            {"title": "Titre modifié"},
            format="json",
        )

        self.assertIn(
            response.status_code,
            [
                status.HTTP_403_FORBIDDEN,
                status.HTTP_404_NOT_FOUND,
            ],
        )


class JobCreationTests(JobTestBase):
    """Vérifie la création et la validation des offres."""

    def setUp(self):
        super().setUp()
        self.authenticate_as(self.recruiter)

    def get_valid_payload(self):
        return {
            "company": self.company.pk,
            "title": "Développeur FullStack",
            "description": "Développement frontend et backend.",
            "sector": "Informatique",
            "location": "Dakar",
            "contract_type": Job.ContractType.CDI,
            "experience_required": 2,
            "education_level": "Bac+3",
            "salary_min": "350000",
            "salary_max": "600000",
            "skills_required": "Python, Django, React",
            "deadline": (
                timezone.localdate() + timedelta(days=30)
            ).isoformat(),
            "status": Job.Status.DRAFT,
        }

    def test_recruiter_can_create_job(self):
        payload = self.get_valid_payload()

        response = self.client.post(
            self.job_list_url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        job = Job.objects.get(title="Développeur FullStack")

        self.assertEqual(job.recruiter, self.recruiter)
        self.assertEqual(job.company, self.company)

    def test_recruiter_cannot_use_another_recruiters_company(self):
        payload = self.get_valid_payload()
        payload["company"] = self.other_company.pk

        response = self.client.post(
            self.job_list_url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_salary_max_cannot_be_lower_than_salary_min(self):
        payload = self.get_valid_payload()
        payload["salary_min"] = "600000"
        payload["salary_max"] = "300000"

        response = self.client.post(
            self.job_list_url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_past_deadline_is_rejected(self):
        payload = self.get_valid_payload()
        payload["deadline"] = (
            timezone.localdate() - timedelta(days=1)
        ).isoformat()

        response = self.client.post(
            self.job_list_url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_expired_status_cannot_be_created_manually(self):
        payload = self.get_valid_payload()
        payload["status"] = Job.Status.EXPIRED

        response = self.client.post(
            self.job_list_url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )


class JobStatusTransitionTests(JobTestBase):
    """Vérifie les transitions autorisées entre les statuts."""

    def setUp(self):
        super().setUp()
        self.authenticate_as(self.recruiter)

    def update_status(self, job, new_status):
        return self.client.patch(
            reverse("job-detail", kwargs={"pk": job.pk}),
            {"status": new_status},
            format="json",
        )

    def test_draft_can_be_published(self):
        job = self.create_job(status=Job.Status.DRAFT)

        response = self.update_status(job, Job.Status.PUBLISHED)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        job.refresh_from_db()
        self.assertEqual(job.status, Job.Status.PUBLISHED)

    def test_draft_can_be_closed(self):
        job = self.create_job(status=Job.Status.DRAFT)

        response = self.update_status(job, Job.Status.CLOSED)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        job.refresh_from_db()
        self.assertEqual(job.status, Job.Status.CLOSED)

    def test_published_can_be_suspended(self):
        job = self.create_job(status=Job.Status.PUBLISHED)

        response = self.update_status(job, Job.Status.SUSPENDED)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        job.refresh_from_db()
        self.assertEqual(job.status, Job.Status.SUSPENDED)

    def test_suspended_can_be_published(self):
        job = self.create_job(status=Job.Status.SUSPENDED)

        response = self.update_status(job, Job.Status.PUBLISHED)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        job.refresh_from_db()
        self.assertEqual(job.status, Job.Status.PUBLISHED)

    def test_closed_job_cannot_be_published_again(self):
        job = self.create_job(status=Job.Status.CLOSED)

        response = self.update_status(job, Job.Status.PUBLISHED)

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_expired_status_cannot_be_set_manually(self):
        job = self.create_job(status=Job.Status.PUBLISHED)

        response = self.update_status(job, Job.Status.EXPIRED)

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_archived_status_cannot_be_set_manually(self):
        job = self.create_job(status=Job.Status.PUBLISHED)

        response = self.update_status(job, Job.Status.ARCHIVED)

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )


class PublishedJobTests(JobTestBase):
    """Vérifie les offres accessibles publiquement."""

    def test_anonymous_user_can_list_published_jobs(self):
        response = self.client.get(self.published_list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_published_job_is_visible(self):
        response = self.client.get(self.published_list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        results = response.data

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], self.job.title)

    def test_draft_job_is_not_visible(self):
        self.create_job(
            title="Offre brouillon",
            status=Job.Status.DRAFT,
        )

        response = self.client.get(self.published_list_url)
        results = response.data

        self.assertFalse(
            any(
                item["title"] == "Offre brouillon"
                for item in results
            )
        )

    def test_suspended_job_is_not_visible(self):
        self.create_job(
            title="Offre suspendue",
            status=Job.Status.SUSPENDED,
        )

        response = self.client.get(self.published_list_url)
        results = response.data

        self.assertFalse(
            any(
                item["title"] == "Offre suspendue"
                for item in results
            )
        )

    def test_closed_job_is_not_visible(self):
        self.create_job(
            title="Offre clôturée",
            status=Job.Status.CLOSED,
        )

        response = self.client.get(self.published_list_url)
        results = response.data

        self.assertFalse(
            any(
                item["title"] == "Offre clôturée"
                for item in results
            )
        )

    def test_expired_job_is_not_visible(self):
        self.create_job(
            title="Offre expirée",
            deadline=timezone.localdate() - timedelta(days=1),
        )

        response = self.client.get(self.published_list_url)
        results = response.data

        self.assertFalse(
            any(
                item["title"] == "Offre expirée"
                for item in results
            )
        )

    def test_job_with_deadline_today_is_visible(self):
        self.create_job(
            title="Offre valable aujourd'hui",
            deadline=timezone.localdate(),
        )

        response = self.client.get(self.published_list_url)
        results = response.data

        self.assertTrue(
            any(
                item["title"] == "Offre valable aujourd'hui"
                for item in results
            )
        )

    def test_job_without_deadline_is_visible(self):
        self.create_job(
            title="Offre sans date limite",
            deadline=None,
        )

        response = self.client.get(self.published_list_url)
        results = response.data

        self.assertTrue(
            any(
                item["title"] == "Offre sans date limite"
                for item in results
            )
        )

    def test_published_job_detail_is_accessible(self):
        response = self.client.get(
            reverse(
                "published-job-detail",
                kwargs={"pk": self.job.pk},
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_draft_job_detail_is_not_accessible(self):
        draft_job = self.create_job(
            status=Job.Status.DRAFT,
        )

        response = self.client.get(
            reverse(
                "published-job-detail",
                kwargs={"pk": draft_job.pk},
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_public_serializer_excludes_recruiter_information(self):
        data = PublishedJobSerializer(self.job).data

        self.assertNotIn("recruiter", data)
        self.assertNotIn("recruiter_email", data)


class JobSearchFilterTests(JobTestBase):
    """Vérifie les filtres et la recherche des offres publiées."""

    def setUp(self):
        super().setUp()

        self.create_job(
            title="Développeur Java",
            sector="Informatique",
            location="Thiès",
            contract_type=Job.ContractType.CDD,
        )

        self.create_job(
            title="Comptable",
            sector="Finance",
            location="Dakar",
            contract_type=Job.ContractType.CDI,
        )

    def get_public_results(self, params=None):
        response = self.client.get(
            self.published_list_url,
            params or {},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        return response.data

    def test_search_by_title(self):
        results = self.get_public_results(
            {"search": "Comptable"}
        )

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "Comptable")

    def test_search_by_company(self):
        results = self.get_public_results(
            {"search": "SunuTech"}
        )

        self.assertGreaterEqual(len(results), 1)

    def test_search_by_sector(self):
        results = self.get_public_results(
            {"search": "Finance"}
        )

        self.assertTrue(
            any(
                item["title"] == "Comptable"
                for item in results
            )
        )

    def test_filter_by_location(self):
        results = self.get_public_results(
            {"location": "Thiès"}
        )

        self.assertTrue(
            all(
                item["location"] == "Thiès"
                for item in results
            )
        )

    def test_filter_by_contract_type(self):
        results = self.get_public_results(
            {"contract_type": Job.ContractType.CDD}
        )

        self.assertTrue(
            all(
                item["contract_type"] == Job.ContractType.CDD
                for item in results
            )
        )

    def test_invalid_contract_type_returns_empty_results(self):
        results = self.get_public_results(
            {"contract_type": "CONTRAT_INVALIDE"}
        )

        self.assertEqual(len(results), 0)


class JobSerializerTests(JobTestBase):
    """Vérifie la représentation des offres par les serializers."""

    def test_job_serializer_contains_expected_fields(self):
        data = JobSerializer(self.job).data

        expected_fields = [
            "id",
            "company",
            "company_name",
            "recruiter",
            "recruiter_email",
            "title",
            "description",
            "sector",
            "location",
            "contract_type",
            "experience_required",
            "education_level",
            "salary_min",
            "salary_max",
            "skills_required",
            "deadline",
            "status",
        ]

        for field in expected_fields:
            self.assertIn(field, data)

    def test_job_serializer_returns_recruiter_email(self):
        data = JobSerializer(self.job).data

        self.assertEqual(
            data["recruiter_email"],
            self.recruiter.email,
        )

    def test_job_serializer_returns_company_name(self):
        data = JobSerializer(self.job).data

        self.assertEqual(
            data["company_name"],
            self.company.name,
        )

    def test_job_is_associated_with_correct_recruiter_and_company(self):
        self.assertEqual(self.job.recruiter, self.recruiter)
        self.assertEqual(self.job.company, self.company)
