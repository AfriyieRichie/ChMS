from rest_framework.routers import DefaultRouter

from .views import (
    FundViewSet,
    GivingCategoryViewSet,
    FinancialPeriodViewSet,
    PledgeViewSet,
    ContributionViewSet,
)

router = DefaultRouter()
router.register("finance/funds", FundViewSet, basename="fund")
router.register("finance/categories", GivingCategoryViewSet, basename="giving-category")
router.register("finance/periods", FinancialPeriodViewSet, basename="financial-period")
router.register("finance/pledges", PledgeViewSet, basename="pledge")
router.register("finance/contributions", ContributionViewSet, basename="contribution")

urlpatterns = router.urls
