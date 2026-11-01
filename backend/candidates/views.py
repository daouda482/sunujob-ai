
from django.shortcuts import get_object_or_404

from rest_framework import generics
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated

from users.permissions import IsCandidate

from .models import CandidateProfile
from .serializers import CandidateProfileSerializer


class CandidateProfileCreateView(generics.CreateAPIView):
    """
    Création du profil du candidat connecté.
    """

    serializer_class = CandidateProfileSerializer

    permission_classes = [
        IsAuthenticated,
        IsCandidate,
    ]

    parser_classes = [
        MultiPartParser,
        FormParser,
        JSONParser,
    ]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CandidateProfileDetailView(generics.RetrieveUpdateAPIView):
    """
    Consultation et modification du profil
    du candidat connecté.
    """

    serializer_class = CandidateProfileSerializer

    permission_classes = [
        IsAuthenticated,
        IsCandidate,
    ]

    parser_classes = [
        MultiPartParser,
        FormParser,
        JSONParser,
    ]

    def get_object(self):
        return get_object_or_404(
            CandidateProfile,
            user=self.request.user,
        )
