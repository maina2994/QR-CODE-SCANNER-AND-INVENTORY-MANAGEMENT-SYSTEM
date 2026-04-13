from django.urls import path
from . import views

urlpatterns = [
    path('', views.menu_view, name='menu'),
    path('cart/', views.cart_view, name='cart'),
    path('payment/', views.payment_view, name='payment'),
    path('track-order/', views.track_order_view, name='track-order'),
    path('confirmation/', views.confirmation_view, name='confirmation'),
    path('login/', views.login_view, name='login'),
    path('signup/', views.signup_view, name='signup'),
    path('staff/', views.staff_view, name='staff'),
    path('waiter/', views.waiter_view, name='waiter'),
    path('kitchen/', views.kitchen_view, name='kitchen'),
    path('store/', views.store_view, name='store'),
    path('admin-dashboard/', views.admin_view, name='admin'),
    path('reservations/', views.reservations_view, name='reservations'),
    path('loyalty/', views.loyalty_view, name='loyalty'),
    path('attendance/', views.attendance_view, name='attendance'),
    path('order-history/', views.order_history_view, name='order-history'),
    path('qr-generate/', views.qr_generate_view, name='qr-generate'),
    path('order/<int:order_id>/', views.order_details_view, name='order-details'),
    path('api/login/', views.api_login, name='api-login'),
    path('api/signup/', views.api_signup, name='api-signup'),
]
