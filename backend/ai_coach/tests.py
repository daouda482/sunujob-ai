
from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from ai_coach.models import CoachingSession, CoachingQuestion
from users.models import User


class AICoachAPITests(APITestCase):
    """
    Tests fonctionnels de l'application ai_coach.

    Les appels à Ollama sont simulés afin que les tests
    puissent fonctionner sans serveur IA externe.
    """

    password = "TestPassword123!"

    def setUp(self):
        self.client = APIClient()

        # Candidat principal
        self.candidate = User.objects.create_user(
            email="candidat@test.com",
            password=self.password,
            first_name="Fatou",
            last_name="Ndiaye",
            role=User.Role.CANDIDATE,
        )

        # Deuxième candidat pour vérifier l'isolation des données
        self.other_candidate = User.objects.create_user(
            email="autre.candidat@test.com",
            password=self.password,
            first_name="Aminata",
            last_name="Fall",
            role=User.Role.CANDIDATE,
        )

        # Recruteur pour vérifier les permissions
        self.recruiter = User.objects.create_user(
            email="recruteur@test.com",
            password=self.password,
            first_name="Moussa",
            last_name="Diallo",
            role=User.Role.RECRUITER,
        )

        self.client.force_authenticate(user=self.candidate)

        self.session_list_url = reverse(
            "ai_coach:session-list-create"
        )

        self.session = CoachingSession.objects.create(
            candidate=self.candidate,
            job_title="Développeur Python",
            interview_type=CoachingSession.InterviewType.TECHNICAL,
            experience_level="Junior",
        )

        self.session_detail_url = reverse(
            "ai_coach:session-detail",
            kwargs={"session_id": self.session.id},
        )

        self.generate_url = reverse(
            "ai_coach:generate-questions",
            kwargs={"session_id": self.session.id},
        )

        self.complete_url = reverse(
            "ai_coach:complete-session",
            kwargs={"session_id": self.session.id},
        )

    # =====================================================
    # OUTILS DE TEST
    # =====================================================

    def create_question(
        self,
        session=None,
        position=1,
        question_text="Qu'est-ce que Python ?",
        candidate_answer="Python est un langage de programmation.",
        ai_feedback="Bonne réponse.",
        score=80,
    ):
        """
        Crée une question associée à une session.
        """

        if session is None:
            session = self.session

        return CoachingQuestion.objects.create(
            session=session,
            question_text=question_text,
            candidate_answer=candidate_answer,
            ai_feedback=ai_feedback,
            score=score,
            strengths=["Bonne compréhension"],
            improvements=["Donner davantage d'exemples"],
            suggested_answer="Python est un langage de programmation.",
            position=position,
        )

    def authenticate_as(self, user):
        self.client.force_authenticate(user=user)

    def create_complete_session(self):
        """
        Prépare une session avec deux questions évaluées.
        """

        first_question = self.create_question(
            position=1,
            score=80,
        )

        second_question = self.create_question(
            position=2,
            question_text="Qu'est-ce que Django ?",
            score=90,
        )

        return first_question, second_question

    # =====================================================
    # AUTHENTIFICATION ET PERMISSIONS
    # =====================================================

    def test_unauthenticated_user_cannot_access_sessions(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(self.session_list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_recruiter_cannot_access_ai_coach(self):
        self.authenticate_as(self.recruiter)

        response = self.client.get(self.session_list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_candidate_can_access_ai_coach(self):
        response = self.client.get(self.session_list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    # =====================================================
    # CRÉATION ET LISTE DES SESSIONS
    # =====================================================

    def test_candidate_can_create_session(self):
        data = {
            "job_title": "Développeur Django",
            "interview_type": "TECHNICAL",
            "experience_level": "Junior",
        }

        response = self.client.post(
            self.session_list_url,
            data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            CoachingSession.objects.filter(
                candidate=self.candidate,
                job_title="Développeur Django",
            ).exists()
        )

        created_session = CoachingSession.objects.get(
            candidate=self.candidate,
            job_title="Développeur Django",
        )

        self.assertEqual(
            created_session.candidate,
            self.candidate,
        )

    def test_candidate_cannot_create_session_with_empty_job_title(self):
        data = {
            "job_title": "   ",
            "interview_type": "GENERAL",
            "experience_level": "Junior",
        }

        response = self.client.post(
            self.session_list_url,
            data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_candidate_can_list_only_own_sessions(self):
        CoachingSession.objects.create(
            candidate=self.other_candidate,
            job_title="Développeur Java",
            interview_type="TECHNICAL",
            experience_level="Senior",
        )

        response = self.client.get(self.session_list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data["results"]),
            1,
        )

        self.assertEqual(
            response.data["results"][0]["job_title"],
            self.session.job_title,
        )

    # =====================================================
    # CONSULTATION DES SESSIONS
    # =====================================================

    def test_candidate_can_view_own_session(self):
        response = self.client.get(self.session_detail_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["session"]["job_title"],
            self.session.job_title,
        )

    def test_candidate_cannot_view_another_candidate_session(self):
        other_session = CoachingSession.objects.create(
            candidate=self.other_candidate,
            job_title="Développeur Java",
            interview_type="TECHNICAL",
            experience_level="Senior",
        )

        url = reverse(
            "ai_coach:session-detail",
            kwargs={"session_id": other_session.id},
        )

        response = self.client.get(url)

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_candidate_cannot_view_nonexistent_session(self):
        url = reverse(
            "ai_coach:session-detail",
            kwargs={"session_id": 999999},
        )

        response = self.client.get(url)

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    # =====================================================
    # GÉNÉRATION DES QUESTIONS
    # =====================================================

    @patch("ai_coach.views.generate_questions")
    def test_candidate_can_generate_questions(self, mock_generate):
        mock_generate.return_value = [
            {
                "question_text": "Qu'est-ce que Python ?",
                "position": 1,
            },
            {
                "question_text": "Qu'est-ce que Django ?",
                "position": 2,
            },
        ]

        response = self.client.post(
            self.generate_url,
            {},
            format="json",
        )

        self.assertIn(
            response.status_code,
            [status.HTTP_200_OK, status.HTTP_201_CREATED],
        )

        self.assertEqual(
            CoachingQuestion.objects.filter(
                session=self.session
            ).count(),
            2,
        )

        mock_generate.assert_called_once()

    @patch("ai_coach.views.generate_questions")
    def test_generation_is_not_repeated_when_questions_exist(
        self,
        mock_generate,
    ):
        self.create_question()

        response = self.client.post(
            self.generate_url,
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        mock_generate.assert_not_called()

        self.assertEqual(
            CoachingQuestion.objects.filter(
                session=self.session
            ).count(),
            1,
        )

    @patch("ai_coach.views.generate_questions")
    def test_generation_fails_for_completed_session(
        self,
        mock_generate,
    ):
        self.session.status = CoachingSession.Status.COMPLETED
        self.session.save(update_fields=["status", "updated_at"])

        response = self.client.post(
            self.generate_url,
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        mock_generate.assert_not_called()

    @patch("ai_coach.views.generate_questions")
    def test_generation_handles_ai_service_error(
        self,
        mock_generate,
    ):
        from ai_coach.services import AICoachError

        mock_generate.side_effect = AICoachError(
            "Le service IA est indisponible."
        )

        response = self.client.post(
            self.generate_url,
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    @patch("ai_coach.views.generate_questions")
    def test_generation_rejects_invalid_ai_response(
        self,
        mock_generate,
    ):
        mock_generate.return_value = [
            {
                "question_text": "",
                "position": 1,
            }
        ]

        response = self.client.post(
            self.generate_url,
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_502_BAD_GATEWAY,
        )

        self.assertEqual(
            CoachingQuestion.objects.filter(
                session=self.session
            ).count(),
            0,
        )

    def test_other_candidate_cannot_generate_questions(self):
        other_session = CoachingSession.objects.create(
            candidate=self.other_candidate,
            job_title="Développeur Java",
            interview_type="TECHNICAL",
            experience_level="Senior",
        )

        url = reverse(
            "ai_coach:generate-questions",
            kwargs={"session_id": other_session.id},
        )

        response = self.client.post(
            url,
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    # =====================================================
    # SOUMISSION ET ÉVALUATION DES RÉPONSES
    # =====================================================

    def get_answer_url(self, question):
        return reverse(
            "ai_coach:submit-answer",
            kwargs={
                "session_id": self.session.id,
                "question_id": question.id,
            },
        )

    @patch("ai_coach.views.evaluate_answer")
    def test_candidate_can_submit_answer(self, mock_evaluate):
        question = self.create_question(
            candidate_answer="",
            ai_feedback="",
            score=None,
        )

        mock_evaluate.return_value = {
            "score": 85,
            "feedback": "Bonne réponse, bien structurée.",
            "ai_feedback": "Bonne réponse, bien structurée.",
            "strengths": [
                "Bonne compréhension",
                "Réponse claire",
            ],
            "improvements": [
                "Ajouter un exemple concret",
            ],
            "suggested_answer": (
                "Python est un langage de programmation "
                "polyvalent et interprété."
            ),
            "mode": "OLLAMA",
        }

        response = self.client.post(
            self.get_answer_url(question),
            {
                "answer": "Python est un langage interprété."
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        question.refresh_from_db()

        self.assertEqual(
            question.candidate_answer,
            "Python est un langage interprété.",
        )

        self.assertEqual(question.score, 85)

        self.assertNotEqual(question.ai_feedback, "")

        mock_evaluate.assert_called_once()

    def test_candidate_cannot_submit_empty_answer(self):
        question = self.create_question(
            candidate_answer="",
            ai_feedback="",
            score=None,
        )

        response = self.client.post(
            self.get_answer_url(question),
            {"answer": "   "},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_candidate_cannot_submit_answer_longer_than_10000_characters(
        self,
    ):
        question = self.create_question(
            candidate_answer="",
            ai_feedback="",
            score=None,
        )

        response = self.client.post(
            self.get_answer_url(question),
            {"answer": "A" * 10001},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    @patch("ai_coach.views.evaluate_answer")
    def test_answer_evaluation_handles_ai_service_error(
        self,
        mock_evaluate,
    ):
        from ai_coach.services import AICoachError

        question = self.create_question(
            candidate_answer="",
            ai_feedback="",
            score=None,
        )

        mock_evaluate.side_effect = AICoachError(
            "Le service IA est indisponible."
        )

        response = self.client.post(
            self.get_answer_url(question),
            {"answer": "Ma réponse."},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    @patch("ai_coach.views.evaluate_answer")
    def test_answer_evaluation_rejects_invalid_score(
        self,
        mock_evaluate,
    ):
        question = self.create_question(
            candidate_answer="",
            ai_feedback="",
            score=None,
        )

        mock_evaluate.return_value = {
            "score": 150,
            "feedback": "Évaluation incorrecte.",
            "ai_feedback": "Évaluation incorrecte.",
            "strengths": [],
            "improvements": [],
            "suggested_answer": "",
            "mode": "OLLAMA",
        }

        response = self.client.post(
            self.get_answer_url(question),
            {"answer": "Ma réponse."},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_502_BAD_GATEWAY,
        )

    def test_candidate_cannot_answer_question_from_another_session(
        self,
    ):
        other_session = CoachingSession.objects.create(
            candidate=self.other_candidate,
            job_title="Développeur Java",
            interview_type="TECHNICAL",
            experience_level="Senior",
        )

        other_question = self.create_question(
            session=other_session,
        )

        url = reverse(
            "ai_coach:submit-answer",
            kwargs={
                "session_id": self.session.id,
                "question_id": other_question.id,
            },
        )

        response = self.client.post(
            url,
            {"answer": "Ma réponse."},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_candidate_cannot_answer_completed_session(self):
        question = self.create_question()

        self.session.status = CoachingSession.Status.COMPLETED
        self.session.save(update_fields=["status", "updated_at"])

        response = self.client.post(
            self.get_answer_url(question),
            {"answer": "Ma réponse."},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    # =====================================================
    # CLÔTURE DES SESSIONS
    # =====================================================

    def test_candidate_cannot_complete_session_without_questions(self):
        response = self.client.post(
            self.complete_url,
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_candidate_cannot_complete_session_with_unanswered_question(
        self,
    ):
        self.create_question(
            candidate_answer="",
            ai_feedback="",
            score=None,
        )

        response = self.client.post(
            self.complete_url,
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_candidate_can_complete_fully_evaluated_session(self):
        self.create_complete_session()

        response = self.client.post(
            self.complete_url,
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.session.refresh_from_db()

        self.assertEqual(
            self.session.status,
            CoachingSession.Status.COMPLETED,
        )

        self.assertEqual(
            self.session.score,
            85,
        )

    def test_completed_session_keeps_same_score_when_completed_again(
        self,
    ):
        self.create_complete_session()

        self.client.post(
            self.complete_url,
            {},
            format="json",
        )

        self.session.refresh_from_db()
        first_score = self.session.score

        response = self.client.post(
            self.complete_url,
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.session.refresh_from_db()

        self.assertEqual(
            self.session.score,
            first_score,
        )

    def test_other_candidate_cannot_complete_session(self):
        other_session = CoachingSession.objects.create(
            candidate=self.other_candidate,
            job_title="Développeur Java",
            interview_type="TECHNICAL",
            experience_level="Senior",
        )

        url = reverse(
            "ai_coach:complete-session",
            kwargs={"session_id": other_session.id},
        )

        response = self.client.post(
            url,
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    # =====================================================
    # INTÉGRITÉ DES DONNÉES
    # =====================================================

    def test_new_session_has_in_progress_status(self):
        self.assertEqual(
            self.session.status,
            CoachingSession.Status.IN_PROGRESS,
        )

    def test_new_session_has_no_score(self):
        self.assertIsNone(self.session.score)

    def test_question_is_associated_with_correct_session(self):
        question = self.create_question()

        self.assertEqual(
            question.session,
            self.session,
        )

    def test_questions_are_ordered_by_position(self):
        third = self.create_question(position=3)
        first = self.create_question(position=1)
        second = self.create_question(position=2)

        questions = list(
            self.session.questions.all()
        )

        self.assertEqual(
            [question.position for question in questions],
            [1, 2, 3],
        )

        self.assertEqual(
            questions[0].id,
            first.id,
        )

        self.assertEqual(
            questions[1].id,
            second.id,
        )

        self.assertEqual(
            questions[2].id,
            third.id,
        )
