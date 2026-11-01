import os

from django.db.models import Count, Q
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date

from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from companies.models import Company
from users.permissions import IsAdmin, IsRecruiter
from users.verification_models import CompanyVerificationRequest
from users.verification_serializers import (
    CompanyVerificationCreateSerializer,
    CompanyVerificationRequestSerializer,
)


class RecruiterCompanyVerificationAPIView(APIView):
    """
    Permet à un recruteur de soumettre une demande et de consulter
    uniquement ses propres demandes de vérification.
    """
    permission_classes = [IsAuthenticated, IsRecruiter]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        queryset = CompanyVerificationRequest.objects.filter(
            submitted_by=request.user
        ).select_related("company", "reviewed_by")

        serializer = CompanyVerificationRequestSerializer(
            queryset,
            many=True,
        )
        return Response(serializer.data)

    def post(self, request):
        company_id = request.data.get("company")

        if not company_id:
            raise ValidationError({
                "company": "Veuillez sélectionner une entreprise."
            })

        company = Company.objects.filter(
            pk=company_id,
            recruiter=request.user,
        ).first()

        if not company:
            raise ValidationError({
                "company": (
                    "Entreprise introuvable ou vous n'êtes pas "
                    "autorisé à soumettre son dossier."
                )
            })

        has_verified_field = any(
            field.name == "is_verified"
            for field in Company._meta.get_fields()
        )

        if has_verified_field and getattr(company, "is_verified", False):
            raise ValidationError({
                "company": "Cette entreprise est déjà vérifiée."
            })

        pending_exists = CompanyVerificationRequest.objects.filter(
            company=company,
            status=CompanyVerificationRequest.Status.PENDING,
        ).exists()

        if pending_exists:
            raise ValidationError({
                "company": (
                    "Une demande de vérification est déjà en attente "
                    "pour cette entreprise."
                )
            })

        serializer = CompanyVerificationCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        verification = serializer.save(
            company=company,
            company_name=company.name,
            submitted_by=request.user,
            submitted_by_email=getattr(request.user, "email", "") or "",
        )

        return Response(
            CompanyVerificationRequestSerializer(verification).data,
            status=status.HTTP_201_CREATED,
        )


class AdminCompanyVerificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

class AdminCompanyVerificationListAPIView(generics.ListAPIView):
    serializer_class = CompanyVerificationRequestSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = AdminCompanyVerificationPagination

    def get_queryset(self):
        queryset = CompanyVerificationRequest.objects.select_related(
            "company",
            "submitted_by",
            "reviewed_by",
        ).all()

        params = self.request.query_params
        search = params.get("search", "").strip()
        selected_status = params.get("status", "").upper()
        start_date = parse_date(params.get("start_date", ""))
        end_date = parse_date(params.get("end_date", ""))

        valid_statuses = {
            choice.value for choice in CompanyVerificationRequest.Status
        }

        if selected_status in valid_statuses:
            queryset = queryset.filter(status=selected_status)

        if search:
            queryset = queryset.filter(
                Q(company_name__icontains=search)
                | Q(registration_number__icontains=search)
                | Q(submitted_by_email__icontains=search)
                | Q(admin_notes__icontains=search)
            )

        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)

        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)

        return queryset

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)

        response.data["summary"] = (
            CompanyVerificationRequest.objects.aggregate(
                total=Count("id"),
                pending=Count(
                    "id",
                    filter=Q(
                        status=CompanyVerificationRequest.Status.PENDING
                    ),
                ),
                approved=Count(
                    "id",
                    filter=Q(
                        status=CompanyVerificationRequest.Status.APPROVED
                    ),
                ),
                rejected=Count(
                    "id",
                    filter=Q(
                        status=CompanyVerificationRequest.Status.REJECTED
                    ),
                ),
            )
        )

        return response


class AdminCompanyVerificationDecisionAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        verification = get_object_or_404(
            CompanyVerificationRequest.objects.select_related("company"),
            pk=pk,
        )

        new_status = str(request.data.get("status", "")).upper()
        allowed_statuses = {
            CompanyVerificationRequest.Status.APPROVED,
            CompanyVerificationRequest.Status.REJECTED,
        }

        if new_status not in allowed_statuses:
            raise ValidationError({
                "status": "Choisissez Approuvée ou Rejetée."
            })

        if verification.status != CompanyVerificationRequest.Status.PENDING:
            raise ValidationError({
                "detail": (
                    "Cette demande a déjà été traitée. "
                    "Aucune nouvelle décision n'est autorisée."
                )
            })

        notes = request.data.get("admin_notes", verification.admin_notes)

        if not isinstance(notes, str):
            raise ValidationError({
                "admin_notes": "La note administrative doit être du texte."
            })

        if len(notes) > 10000:
            raise ValidationError({
                "admin_notes": "La note ne peut pas dépasser 10 000 caractères."
            })

        verification.status = new_status
        verification.admin_notes = notes.strip()
        verification.reviewed_by = request.user
        verification.reviewed_at = timezone.now()
        verification.save(
            update_fields=[
                "status",
                "admin_notes",
                "reviewed_by",
                "reviewed_at",
                "updated_at",
            ]
        )

        # Met à jour le drapeau de vérification si le modèle Company
        # possède ce champ. Cela n'impose pas de champ inexistant.
        company = verification.company

        if (
            company
            and new_status == CompanyVerificationRequest.Status.APPROVED
        ):
            try:
                company._meta.get_field("is_verified")
            except Exception:
                pass
            else:
                company.is_verified = True
                company.save(update_fields=["is_verified"])

        return Response(
            CompanyVerificationRequestSerializer(verification).data,
            status=status.HTTP_200_OK,
        )
class AdminCompanyVerificationDocumentAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, pk):
        verification = get_object_or_404(
            CompanyVerificationRequest,
            pk=pk,
        )

        if not verification.document:
            raise ValidationError({
                "document": "Aucun justificatif n'est disponible."
            })

        try:
            file_handle = verification.document.open("rb")
        except (OSError, ValueError):
            raise ValidationError({
                "document": "Impossible d'ouvrir le justificatif."
            })

        filename = os.path.basename(verification.document.name)

        return FileResponse(
            file_handle,
            as_attachment=True,
            filename=filename,
        )