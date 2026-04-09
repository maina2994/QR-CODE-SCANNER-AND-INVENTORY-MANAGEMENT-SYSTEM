from django.shortcuts import render
from django.http import JsonResponse
import requests
import qrcode
import io
import base64
from urllib.parse import urlencode

from django.conf import settings
API_BASE_URL = getattr(settings, 'NODE_API_URL', 'http://localhost:3000')

def get_menu(request):
    """Fetch menu items from Express API"""
    try:
        response = requests.get(f'{API_BASE_URL}/menu')
        data = response.json()
        return data['menu']
    except:
        return []

def menu_view(request):
    """Display restaurant menu"""
    menu_items = get_menu(request)
    context = {
        'menu_items': menu_items,
    }
    return render(request, 'menu/menu.html', context)

def cart_view(request):
    """Display shopping cart"""
    return render(request, 'menu/cart.html')

def login_view(request):
    """User login"""
    return render(request, 'menu/login.html')

def admin_view(request):
    """Admin dashboard"""
    return render(request, 'menu/admin.html')

def staff_view(request):
    """Staff dashboard"""
    return render(request, 'menu/staff.html')

def qr_generate_view(request):
    """Generate QR code for table"""
    qr_image = None
    qr_url = None
    table_id = None
    
    if request.method == 'POST':
        table_id = request.POST.get('table_id')
        if table_id:
            # Generate QR code that links to the menu with table_id parameter
            qr_url = request.build_absolute_uri(f'/?table_id={table_id}')
            
            # Create QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(qr_url)
            qr.make(fit=True)
            
            # Convert to image
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64 for embedding in HTML
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            img_base64 = base64.b64encode(buffer.getvalue()).decode()
            qr_image = img_base64
    
    context = {
        'qr_image': qr_image,
        'table_id': table_id,
        'qr_url': qr_url,
    }
    return render(request, 'menu/qr-generate.html', context)

def order_details_view(request, order_id):
    """Order details page"""
    try:
        response = requests.get(f'{API_BASE_URL}/order/{order_id}')
        data = response.json()
        context = {
            'order': data['order'],
            'items': data['items'],
        }
        return render(request, 'menu/order-details.html', context)
    except:
        return render(request, 'menu/order-details.html', {'error': 'Order not found'})

def confirmation_view(request):
    """Order confirmation"""
    return render(request, 'menu/confirmation.html')
