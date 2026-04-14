from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import requests, qrcode, io, base64, json

API = getattr(settings, 'NODE_API_URL', 'https://qr-backend-app.onrender.com')

def _api(path, timeout=8):
    try:
        r = requests.get(f'{API}{path}', timeout=timeout)
        r.raise_for_status()
        return r.json()
    except Exception:
        return None

def menu_view(request):
    table_id = request.GET.get('table_id', '')
    data = _api('/menu-full') or {}
    categories = data.get('categories', [])
    menu_items = data.get('menu', [])
    for cat in categories:
        if isinstance(cat, dict) and 'items' in cat:
            cat['dishes'] = cat.pop('items')
        elif isinstance(cat, dict) and 'dishes' not in cat:
            cat['dishes'] = []
    return render(request, 'menu/menu.html', {'categories': categories, 'menu_items': menu_items, 'table_id': table_id})

def cart_view(request):
    return render(request, 'menu/cart.html', {'table_id': request.GET.get('table_id', '')})

def payment_view(request):
    return render(request, 'menu/payment.html')

def track_order_view(request):
    return render(request, 'menu/track.html')

def confirmation_view(request):
    return render(request, 'menu/confirmation.html')

def login_view(request):
    return render(request, 'menu/login.html')

def signup_view(request):
    return render(request, 'menu/signup.html')

def staff_view(request):
    return render(request, 'menu/staff.html')

def waiter_view(request):
    return render(request, 'menu/waiter.html')

def kitchen_view(request):
    return render(request, 'menu/kitchen.html')

def store_view(request):
    return render(request, 'menu/store.html')

def admin_view(request):
    return render(request, 'menu/admin.html')

def reservations_view(request):
    return render(request, 'menu/reservations.html')

def loyalty_view(request):
    return render(request, 'menu/loyalty.html')

def attendance_view(request):
    return render(request, 'menu/attendance.html')

def order_history_view(request):
    return render(request, 'menu/order-history.html')

def qr_generate_view(request):
    qr_image = qr_url = table_id = None
    if request.method == 'POST':
        table_id = request.POST.get('table_id', '').strip()
        if table_id:
            qr_url = request.build_absolute_uri(f'/?table_id={table_id}')
            qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=4)
            qr.add_data(qr_url)
            qr.make(fit=True)
            img = qr.make_image(fill_color='#8B4513', back_color='white')
            buf = io.BytesIO()
            img.save(buf, format='PNG')
            buf.seek(0)
            qr_image = base64.b64encode(buf.getvalue()).decode()
    return render(request, 'menu/qr-generate.html', {'qr_image': qr_image, 'table_id': table_id, 'qr_url': qr_url})

def order_details_view(request, order_id):
    try:
        r = requests.get(f'{API}/order/{order_id}', timeout=8)
        r.raise_for_status()
        d = r.json()
        return render(request, 'menu/order-details.html', {'order': d.get('order'), 'items': d.get('items', [])})
    except Exception:
        return render(request, 'menu/order-details.html', {'error': 'Order not found'})

@csrf_exempt
def api_login(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
    try:
        body = json.loads(request.body)
        res = requests.post(f'{API}/login', json=body, timeout=10)
        return JsonResponse(res.json(), status=res.status_code)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)

@csrf_exempt
def api_signup(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
    try:
        body = json.loads(request.body)
        if not body.get('email', '').endswith('@restaurant.com'):
            return JsonResponse({'message': 'Must use @restaurant.com email'}, status=400)
        res = requests.post(f'{API}/signup', json=body, timeout=10)
        return JsonResponse(res.json(), status=res.status_code)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)
