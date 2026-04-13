$templates = "menu\templates\menu"
$views    = "menu\views.py"

Write-Host "Applying Saveur template fixes..." -ForegroundColor Cyan

# Fix 1: views.py — wrong API endpoint /menu-full -> /menu
$content = Get-Content $views -Raw
$content = $content -replace "data = _api\('/menu-full'\) or \{\}", "data = _api('/menu') or []"
$content = $content -replace "categories = data\.get\('categories', \[\]\)\s*`n\s*menu_items = data\.get\('menu', \[\]\)", "menu_items = data if isinstance(data, list) else data.get('menu', [])
    categories = data.get('categories', []) if isinstance(data, dict) else []
    for cat in categories:
        if isinstance(cat, dict) and 'items' in cat:
            cat['dishes'] = cat.pop('items')"
Set-Content $views $content
Write-Host "  [1/7] views.py fixed" -ForegroundColor Green

# Fix 2: menu.html — category.items -> category.dishes
$file = "$templates\menu.html"
(Get-Content $file -Raw) -replace 'for item in category\.items', 'for item in category.dishes' | Set-Content $file
Write-Host "  [2/7] menu.html fixed" -ForegroundColor Green

# Fix 3: confirmation.html — ornament-line right -> ornament-line r
$file = "$templates\confirmation.html"
(Get-Content $file -Raw) -replace 'ornament-line right', 'ornament-line r' | Set-Content $file
Write-Host "  [3/7] confirmation.html fixed" -ForegroundColor Green

# Fix 4: staff.html — remove duplicate const API
$file = "$templates\staff.html"
(Get-Content $file -Raw) -replace "const API = 'https://qr-backend-app\.onrender\.com';\r?\n", '' | Set-Content $file
Write-Host "  [4/7] staff.html fixed" -ForegroundColor Green

# Fix 5: payment.html — remove duplicate const API
$file = "$templates\payment.html"
(Get-Content $file -Raw) -replace "const API = 'https://qr-backend-app\.onrender\.com';\r?\n", '' | Set-Content $file
Write-Host "  [5/7] payment.html fixed" -ForegroundColor Green

# Fix 6: admin.html + order-details.html — remove unused load static
foreach ($f in @("admin.html", "order-details.html")) {
    $file = "$templates\$f"
    (Get-Content $file -Raw) -replace "{% load static %}\r?\n", '' -replace "{% block header %}.*?{% endblock %}\r?\n", '' | Set-Content $file
}
Write-Host "  [6/7] admin.html + order-details.html fixed" -ForegroundColor Green

# Fix 7: base.html — add missing block header
$file = "$templates\base.html"
(Get-Content $file -Raw) -replace '{% block content %}{% endblock %}', "{% block header %}{% endblock %}`n{% block content %}{% endblock %}" | Set-Content $file
Write-Host "  [7/7] base.html fixed" -ForegroundColor Green

Write-Host "`nAll fixes applied successfully." -ForegroundColor Cyan
