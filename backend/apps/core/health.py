from django.http import JsonResponse


def health_check(request):
    return JsonResponse({"status": "ok", "version": "0.1.0"})
