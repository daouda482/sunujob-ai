from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from users.catalog_models import JobCategory, PlatformSkill
from users.catalog_serializers import JobCategorySerializer, PlatformSkillSerializer
from users.permissions import IsAdmin


class AdminCatalogPermissionMixin:
    permission_classes = [IsAuthenticated, IsAdmin]


class AdminJobCategoryListCreateAPIView(AdminCatalogPermissionMixin, generics.ListCreateAPIView):
    serializer_class = JobCategorySerializer

    def get_queryset(self):
        queryset = JobCategory.objects.all().order_by("name")
        active = self.request.query_params.get("active")
        if active in {"true", "false"}:
            queryset = queryset.filter(is_active=(active == "true"))
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(name__icontains=search)
        return queryset


class AdminJobCategoryDetailAPIView(AdminCatalogPermissionMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = JobCategory.objects.all()
    serializer_class = JobCategorySerializer


class AdminPlatformSkillListCreateAPIView(AdminCatalogPermissionMixin, generics.ListCreateAPIView):
    serializer_class = PlatformSkillSerializer

    def get_queryset(self):
        queryset = PlatformSkill.objects.select_related("category").all().order_by("name")
        active = self.request.query_params.get("active")
        if active in {"true", "false"}:
            queryset = queryset.filter(is_active=(active == "true"))
        category_id = self.request.query_params.get("category")
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(name__icontains=search)
        return queryset


class AdminPlatformSkillDetailAPIView(AdminCatalogPermissionMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = PlatformSkill.objects.select_related("category").all()
    serializer_class = PlatformSkillSerializer
