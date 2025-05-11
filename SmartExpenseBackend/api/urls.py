from django.urls import path
from .views import RegisterView, LoginView, InitialBalanceView, HomeView, TransactionView, CategoryView, UserUpdateView, ChangePasswordView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('initial-balance/', InitialBalanceView.as_view(), name='initial-balance'),
    path('home/', HomeView.as_view(), name='home'),
    path('transactions/', TransactionView.as_view(), name='transactions'),
    path('categories/', CategoryView.as_view(), name='categories'),
    path('categories/<int:pk>/', CategoryView.as_view(), name='category-detail'),
    path('users/<int:user_id>/', UserUpdateView.as_view(), name='user-update'),
    path('users/<int:user_id>/change-password/', ChangePasswordView.as_view(), name='change-password'),
]