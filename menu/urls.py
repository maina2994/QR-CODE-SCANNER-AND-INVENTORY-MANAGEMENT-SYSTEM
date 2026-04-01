from django.urls import path
from . import views

urlpatterns = [
    path('', views.menu_view, name='menu'),
    path('cart/', views.cart_view, name='cart'),
    path('login/', views.login_view, name='login'),
    path('admin/', views.admin_view, name='admin'),
    path('staff/', views.staff_view, name='staff'),
    path('qr-generate/', views.qr_generate_view, name='qr-generate'),
    path('order/<int:order_id>/', views.order_details_view, name='order-details'),
    path('confirmation/', views.confirmation_view, name='confirmation'),
]
