from django.http import JsonResponse
from django.urls import include, path


def health_check(request):
    return JsonResponse({
        "status": "ok",
        "service": "AI Workspace API",
        "version": "v1",
    })


urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("auth/", include("apps.users.urls")),
]