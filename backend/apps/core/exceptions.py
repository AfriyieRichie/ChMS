from rest_framework.views import exception_handler
from rest_framework.response import Response


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    detail = response.data
    if isinstance(detail, dict):
        field_errors = {
            k: v for k, v in detail.items() if k not in ("detail", "code")
        }
        top_detail = detail.get("detail", str(exc))
        code = detail.get("code", "error")
    else:
        field_errors = {}
        top_detail = str(detail[0]) if isinstance(detail, list) else str(detail)
        code = getattr(exc, "default_code", "error")

    response.data = {
        "detail": top_detail,
        "code": code,
        "field_errors": field_errors,
    }
    return response
