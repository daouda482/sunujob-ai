
import hmac
import os
import uuid

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST


@csrf_exempt
@require_POST
def storage_diagnostic(request):
    # Production uniquement
    if not settings.IS_PRODUCTION:
        return JsonResponse(
            {"success": False, "error": "Production required"},
            status=404,
        )

    # Vérification du jeton secret
    expected_token = os.getenv("STORAGE_DIAGNOSTIC_TOKEN", "")
    supplied_token = request.headers.get(
        "X-Storage-Diagnostic-Token", ""
    )

    if (
        not expected_token
        or not supplied_token
        or not hmac.compare_digest(expected_token, supplied_token)
    ):
        return JsonResponse(
            {"success": False, "error": "Unauthorized"},
            status=403,
        )

    # Vérification du backend
    storage_class = default_storage.__class__.__name__

    if storage_class != "S3Storage":
        return JsonResponse(
            {
                "success": False,
                "storage_class": storage_class,
                "error": "Unexpected storage backend",
            },
            status=500,
        )

    # Fichier de test isolé
    test_name = (
        f"_diagnostics/storage-test-{uuid.uuid4().hex}.txt"
    )
    test_content = (
        f"SunuJob AI storage diagnostic {uuid.uuid4().hex}"
    ).encode("utf-8")

    saved_name = None
    write_ok = False
    read_ok = False
    delete_ok = False

    try:
        saved_name = default_storage.save(
            test_name,
            ContentFile(test_content),
        )
        write_ok = True

        with default_storage.open(saved_name, "rb") as file:
            read_ok = file.read() == test_content

    except Exception:
        # Les détails techniques ne sont pas exposés publiquement.
        pass

    finally:
        if saved_name:
            try:
                default_storage.delete(saved_name)
                delete_ok = not default_storage.exists(saved_name)
            except Exception:
                delete_ok = False

    success = write_ok and read_ok and delete_ok

    return JsonResponse(
        {
            "success": success,
            "storage_class": storage_class,
            "bucket": settings.SUPABASE_S3_BUCKET_NAME,
            "write": write_ok,
            "read": read_ok,
            "delete": delete_ok,
        },
        status=200 if success else 500,
    )
