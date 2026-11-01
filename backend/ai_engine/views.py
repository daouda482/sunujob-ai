
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .serializers import CVAnalysisSerializer
from .services import (
    analyze_candidate_cv,
    OllamaServiceError
)

from users.permissions import IsCandidate


class CVAnalysisAPIView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsCandidate
    ]

    def post(self, request):

        serializer = CVAnalysisSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        cv_text = serializer.validated_data["cv_text"]

        try:
            analysis = analyze_candidate_cv(cv_text)

            return Response(
                {
                    "success": True,
                    "message": "Analyse du CV effectuée avec succès.",
                    "provider": "ollama",
                    "model": "ollama",
                    "analysis": analysis
                },
                status=status.HTTP_200_OK
            )

        except OllamaServiceError as exc:

            return Response(
                {
                    "success": False,
                    "message": str(exc)
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        except ValueError as exc:

            return Response(
                {
                    "success": False,
                    "message": str(exc)
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception:
            return Response(
                {
                    "success": False,
                    "message": "Une erreur interne est survenue."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
