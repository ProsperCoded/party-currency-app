from django.shortcuts import render
from  rest_framework.decorators import api_view,authentication_classes,permission_classes
from rest_framework.response import Response
from authentication.models import CustomUser
from rest_framework.authentication import TokenAuthentication,SessionAuthentication
from rest_framework.permissions import IsAuthenticated,AllowAny

# Create your views here.

@api_view(['GET'])
@authentication_classes([TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_users(request):
    if not request.user.is_superuser:
        return Response({'error': 'Access denied. Superuser privileges required.'}, status=403)
        
    users = CustomUser.objects.all()
    user_data = []
    for user in users:
        user_data.append({
            'username': user.username,
            'name': f"{user.first_name} {user.last_name}",
            'role': user.type,
            'isActive': user.is_active,
            "last_login": user.last_login,
        })
    return Response({'users': user_data})


