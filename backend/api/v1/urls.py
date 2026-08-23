from django.urls import path
from django.http import JsonResponse


def health_check(request):
    return JsonResponse({
        "status": "ok",
        "service": "AI Workspace API",
        "version": "v1",
    })


urlpatterns = [
    path("health/", health_check, name="health-check"),
]