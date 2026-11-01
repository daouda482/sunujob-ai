
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Company
from .permissions import IsRecruiter
from .serializers import CompanySerializer


class CompanyListCreateView(generics.ListCreateAPIView):
    """
    Liste les entreprises du recruteur connecté et en crée.
    """

    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated, IsRecruiter]

    def get_queryset(self):
        return Company.objects.filter(recruiter=self.request.user)

    def perform_create(self, serializer):
        serializer.save(recruiter=self.request.user)


class CompanyDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Consulte, modifie ou supprime une entreprise du recruteur connecté.
    """

    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated, IsRecruiter]

    def get_queryset(self):
        return Company.objects.filter(recruiter=self.request.user)
