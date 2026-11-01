from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from users.permissions import IsCandidate

from .models import JobAlert
from .serializers import JobAlertSerializer


class JobAlertListCreateView(generics.ListCreateAPIView):
    serializer_class = JobAlertSerializer
    permission_classes = [IsAuthenticated, IsCandidate]

    def get_queryset(self):
        return JobAlert.objects.filter(
            candidate=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(candidate=self.request.user)


class JobAlertDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = JobAlertSerializer
    permission_classes = [IsAuthenticated, IsCandidate]

    def get_queryset(self):
        return JobAlert.objects.filter(
            candidate=self.request.user
        )