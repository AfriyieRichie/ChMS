from rest_framework.routers import DefaultRouter

from .views import (
    FundViewSet,
    GivingCategoryViewSet,
    FinancialPeriodViewSet,
    PledgeViewSet,
    ContributionViewSet,
    ContributionBatchViewSet,
    BankDepositViewSet,
)

router = DefaultRouter()
router.register("finance/funds",          FundViewSet,              basename="fund")
router.register("finance/categories",     GivingCategoryViewSet,    basename="giving-category")
router.register("finance/periods",        FinancialPeriodViewSet,   basename="financial-period")
router.register("finance/pledges",        PledgeViewSet,            basename="pledge")
router.register("finance/contributions",  ContributionViewSet,      basename="contribution")
router.register("finance/batches",        ContributionBatchViewSet, basename="contribution-batch")
router.register("finance/deposits",       BankDepositViewSet,       basename="bank-deposit")

urlpatterns = router.urls
