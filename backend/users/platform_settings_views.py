from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsAdmin
from users.platform_settings_models import PlatformSettings
from users.platform_settings_serializers import PlatformSettingsSerializer


class AdminPlatformSettingsAPIView(APIView):
    """Lecture et modification des paramètres généraux, réservées à ADMIN."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get_object(self):
        settings_obj, _ = PlatformSettings.objects.get_or_create(pk=1)
        return settings_obj

    def get(self, request):
        serializer = PlatformSettingsSerializer(self.get_object())
        return Response(serializer.data)

    def patch(self, request):
        settings_obj = self.get_object()
        serializer = PlatformSettingsSerializer(
            settings_obj,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        return Response(PlatformSettingsSerializer(settings_obj).data)
