from django.urls import path
from .views import RegisterView, LoginView, InitialBalanceView, HomeView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('initial-balance/', InitialBalanceView.as_view(), name='initial_balance'),
    path('home/', HomeView.as_view(), name='home'),
]