from django.urls import path
from . import views

urlpatterns = [
    path('', views.menu_view, name='menu'),
    path('cart/', views.cart_view, name='cart'),
    path('login/', views.login_view, name='login'),
    path('signup/', views.signup_view, name='signup'),
    path('admin-dashboard/', views.admin_view, name='admin'),
    path('staff/', views.staff_view, name='staff'),
    path('qr-generate/', views.qr_generate_view, name='qr-generate'),
    path('order/<int:order_id>/', views.order_details_view, name='order-details'),
    path('confirmation/', views.confirmation_view, name='confirmation'),
    # API proxy
    path('api/login/', views.api_login, name='api-login'),
    path('api/signup/', views.api_signup, name='api-signup'),
]
