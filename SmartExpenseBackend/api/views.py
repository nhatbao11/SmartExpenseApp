from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .serializers import UserSerializer, TransactionSerializer
from .models import User, Transaction
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.db.models import Sum
from rest_framework.permissions import AllowAny

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response({'token': token.key}, status=status.HTTP_201_CREATED)
        print('Register errors:', serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        if not username or not password:
            return Response(
                {'error': 'Vui lòng cung cấp tên đăng nhập và mật khẩu'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user = authenticate(username=username, password=password)
        if user:
            token, _ = Token.objects.get_or_create(user=user)
            return Response({'token': token.key}, status=status.HTTP_200_OK)
        return Response(
            {'error': 'Tên đăng nhập hoặc mật khẩu không đúng'},
            status=status.HTTP_401_UNAUTHORIZED
        )

class InitialBalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        initial_balance = request.data.get('initial_balance')
        if initial_balance is None or initial_balance < 0:
            return Response({'error': 'Số dư ban đầu không hợp lệ'}, status=400)
        request.user.initial_balance = initial_balance
        request.user.save()
        return Response({'message': 'Số dư ban đầu đã được lưu'}, status=200)

class HomeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        # Tính số dư hiện tại
        transactions = Transaction.objects.filter(user=user)
        total_income = transactions.filter(transaction_type='INCOME').aggregate(Sum('amount'))['amount__sum'] or 0
        total_expense = transactions.filter(transaction_type='EXPENSE').aggregate(Sum('amount'))['amount__sum'] or 0
        current_balance = user.initial_balance + total_income - total_expense

        # Lấy 5 giao dịch gần đây
        recent_transactions = transactions.order_by('-created_at')[:5]
        transaction_serializer = TransactionSerializer(recent_transactions, many=True)

        return Response({
            'current_balance': current_balance,
            'total_income': total_income,
            'total_expense': total_expense,
            'recent_transactions': transaction_serializer.data
        })