
from django.core.paginator import Paginator
from django.db.models import Q
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import User
from users.permissions import IsAdmin


def _user_model_fields():
    """Retourne les noms des champs disponibles sur le modèle User."""
    return {field.name for field in User._meta.get_fields()}


def _serialize_user(user):
    """Prépare les informations publiques du compte pour l'administration."""
    first_name = getattr(user, "first_name", "") or ""
    last_name = getattr(user, "last_name", "") or ""
    email = getattr(user, "email", "") or ""
    role = getattr(user, "role", "") or ""

    full_name = f"{first_name} {last_name}".strip()
    if not full_name:
        full_name = email or f"Utilisateur #{user.pk}"

    role_labels = dict(User.Role.choices)

    joined_at = (
        getattr(user, "date_joined", None)
        or getattr(user, "created_at", None)
    )
    last_login = getattr(user, "last_login", None)

    return {
        "id": user.pk,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "full_name": full_name,
        "role": role,
        "role_label": role_labels.get(role, role),
        "is_active": bool(getattr(user, "is_active", True)),
        "is_superuser": bool(getattr(user, "is_superuser", False)),
        "date_joined": joined_at.isoformat() if joined_at else None,
        "last_login": last_login.isoformat() if last_login else None,
    }


class AdminUserListAPIView(APIView):
    """
    Recherche, filtrage et pagination des comptes de la plateforme.
    Réservé aux administrateurs authentifiés.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, *args, **kwargs):
        fields = _user_model_fields()
        queryset = User.objects.all()

        search = request.query_params.get("search", "").strip()
        role = request.query_params.get("role", "").strip()
        account_status = request.query_params.get("status", "all").strip().lower()

        valid_roles = dict(User.Role.choices)

        # Filtrage par rôle.
        if role:
            if role not in valid_roles:
                return Response(
                    {"detail": "Le rôle demandé est invalide."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.filter(role=role)

        # Filtrage par état du compte.
        if account_status in ("active", "inactive"):
            if "is_active" not in fields:
                return Response(
                    {
                        "detail": (
                            "Le modèle utilisateur ne possède pas le champ "
                            "is_active nécessaire à ce filtre."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            queryset = queryset.filter(
                is_active=(account_status == "active")
            )
        elif account_status != "all":
            return Response(
                {"detail": "Le filtre de statut est invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Recherche par nom, prénom ou adresse e-mail.
        if search:
            conditions = (
                Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )

            # Permet aussi de rechercher une personne par nom complet.
            if "first_name" in fields and "last_name" in fields:
                conditions |= Q(
                    first_name__icontains=search.split()[0],
                    last_name__icontains=search.split()[-1],
                )

            queryset = queryset.filter(conditions)

        # Les comptes les plus récents apparaissent en premier.
        ordering = "-date_joined" if "date_joined" in fields else "-pk"
        queryset = queryset.order_by(ordering, "-pk")

        # Pagination : 10, 20, 50 ou 100 comptes par page.
        try:
            requested_page = max(int(request.query_params.get("page", 1)), 1)
        except (TypeError, ValueError):
            requested_page = 1

        try:
            page_size = int(request.query_params.get("page_size", 10))
        except (TypeError, ValueError):
            page_size = 10

        if page_size not in (10, 20, 50, 100):
            page_size = 10

        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(requested_page)

        # Statistiques globales, indépendantes des filtres.
        all_users = User.objects.all()
        total_users = all_users.count()

        if "is_active" in fields:
            active_users = all_users.filter(is_active=True).count()
            inactive_users = all_users.filter(is_active=False).count()
        else:
            active_users = total_users
            inactive_users = 0

        role_counts = []
        for role_value, role_label in User.Role.choices:
            role_counts.append({
                "value": role_value,
                "label": role_label,
                "count": all_users.filter(role=role_value).count(),
            })

        return Response({
            "count": paginator.count,
            "page": page_obj.number,
            "page_size": page_size,
            "total_pages": paginator.num_pages,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
            "results": [
                _serialize_user(user)
                for user in page_obj.object_list
            ],
        "summary": {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": inactive_users,
        "role_counts": role_counts,
    },
    "roles": [
        {"value": value, "label": label}
        for value, label in User.Role.choices
    ],
    "role_counts": role_counts,
})


class AdminUserStatusAPIView(APIView):
    """
    Active ou désactive un compte utilisateur.
    Aucun changement de rôle ni suppression définitive n'est autorisé ici.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk, *args, **kwargs):
        fields = _user_model_fields()

        if "is_active" not in fields:
            return Response(
                {
                    "detail": (
                        "Le modèle utilisateur ne possède pas le champ "
                        "is_active. Vérifiez users/models.py."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_state = request.data.get("is_active")

        if not isinstance(new_state, bool):
            return Response(
                {"is_active": "Cette valeur doit être un booléen."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = get_object_or_404(User, pk=pk)

        # Ne permet pas de désactiver son propre compte.
        if user.pk == request.user.pk and new_state is False:
            return Response(
                {
                    "detail": (
                        "Vous ne pouvez pas désactiver votre propre compte "
                        "depuis cette interface."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Les comptes superutilisateurs nécessitent une gestion distincte.
        if getattr(user, "is_superuser", False):
            return Response(
                {
                    "detail": (
                        "Ce compte superutilisateur ne peut pas être modifié "
                        "depuis ce module."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Empêche de désactiver le dernier compte admin actif.
        if (
            new_state is False
            and user.role == User.Role.ADMIN
            and User.objects.filter(
                role=User.Role.ADMIN,
                is_active=True,
            ).count() <= 1
        ):
            return Response(
                {
                    "detail": (
                        "Impossible de désactiver le dernier administrateur "
                        "actif de la plateforme."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_active = new_state
        user.save(update_fields=["is_active"])

        return Response({
            "message": (
                "Compte activé avec succès."
                if new_state
                else "Compte désactivé avec succès."
            ),
            "user": _serialize_user(user),
        })
