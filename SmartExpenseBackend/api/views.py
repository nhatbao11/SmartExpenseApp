from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from .serializers import UserSerializer, TransactionSerializer, CategorySerializer
from .models import User, Transaction, Category
from rest_framework.authtoken.models import Token  # type: ignore
from django.contrib.auth import authenticate
from django.db.models import Sum, Q
from decimal import Decimal
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from datetime import datetime, timedelta
import datetime

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response({'token': token.key, 'user_id': user.id}, status=status.HTTP_201_CREATED)
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
            return Response({'token': token.key, 'user_id': user.id}, status=status.HTTP_200_OK)
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
        try:
            filter_by = request.query_params.get('filter_by', 'all')
            transactions = Transaction.objects.filter(user=request.user)

            now = timezone.now()
            if filter_by == 'day':
                start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
                transactions = transactions.filter(created_at__gte=start_date)
            elif filter_by == 'week':
                start_date = now - timedelta(days=now.weekday())
                start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
                transactions = transactions.filter(created_at__gte=start_date)
            elif filter_by == 'month':
                start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                transactions = transactions.filter(created_at__gte=start_date)
            elif filter_by == 'year':
                start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
                transactions = transactions.filter(created_at__gte=start_date)

            total_income = sum(t.amount for t in transactions if t.transaction_type == 'income')
            total_expense = sum(t.amount for t in transactions if t.transaction_type == 'expense')
            initial_balance = request.user.initial_balance if request.user.initial_balance is not None else Decimal('0')
            current_balance = initial_balance + total_income - total_expense
            recent_transactions = transactions.order_by('-created_at')[:5]
            serializer = TransactionSerializer(recent_transactions, many=True)
            print(f"HomeView: Returning data for user={request.user.username}")
            return Response({
                'current_balance': float(current_balance),
                'total_income': float(total_income),
                'total_expense': float(total_expense),
                'recent_transactions': serializer.data
            })
        except Exception as e:
            print(f"HomeView: Error: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TransactionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TransactionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            print(f"TransactionView: Saved transaction for user={request.user.username}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        print(f"TransactionView: Invalid data: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request):
        search_query = request.query_params.get('search', '')
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)

        transactions = Transaction.objects.filter(user=request.user)

        if search_query:
            transactions = transactions.filter(
                Q(description__icontains=search_query) |
                Q(amount__icontains=search_query)
            )

        if start_date and end_date:
            try:
                start_date = datetime.datetime.strptime(start_date, '%Y-%m-%d')
                end_date = datetime.datetime.strptime(end_date, '%Y-%m-%d')
                transactions = transactions.filter(
                    created_at__date__gte=start_date,
                    created_at__date__lte=end_date
                )
            except ValueError as e:
                print(f"TransactionView: Invalid date format: {e}")
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = TransactionSerializer(transactions, many=True)
        print(f"TransactionView: Returned {len(serializer.data)} transactions for user={request.user.username}")
        return Response(serializer.data, status=status.HTTP_200_OK)

class CategoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            categories = Category.objects.filter(Q(user=request.user) | Q(user__isnull=True))
            serializer = CategorySerializer(categories, many=True)
            print(f"CategoryView: Returned {len(serializer.data)} categories for user={request.user.username}")
            return Response(serializer.data)
        except Exception as e:
            print(f"CategoryView: GET error: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        try:
            serializer = CategorySerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(user=request.user if not serializer.validated_data.get('is_default') else None)
                print(f"CategoryView: Created new category for user={request.user.username}")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            print(f"CategoryView: Invalid data: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"CategoryView: POST error: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request, pk=None):
        try:
            if not pk:
                return Response({'error': 'Category ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
            category = Category.objects.get(pk=pk)
            if category.is_default:
                return Response({'error': 'Cannot edit default categories.'}, status=status.HTTP_403_FORBIDDEN)
            if category.user != request.user:
                return Response({'error': 'You can only edit your own categories.'}, status=status.HTTP_403_FORBIDDEN)

            serializer = CategorySerializer(category, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                print(f"CategoryView: Updated category id={pk} for user={request.user.username}")
                return Response(serializer.data, status=status.HTTP_200_OK)
            print(f"CategoryView: Invalid data for update: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Category.DoesNotExist:
            return Response({'error': 'Category not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"CategoryView: PUT error: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, pk=None):
        try:
            if not pk:
                return Response({'error': 'Category ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
            print(f"CategoryView: Attempting to delete category id={pk} for user={request.user.username}")
            category = Category.objects.get(pk=pk)
            if category.is_default:
                return Response({'error': 'Cannot delete default categories.'}, status=status.HTTP_403_FORBIDDEN)
            if category.user != request.user:
                return Response({'error': 'You can only delete your own categories.'}, status=status.HTTP_403_FORBIDDEN)
            category.delete()
            print(f"CategoryView: Deleted category id={pk} for user={request.user.username}")
            return Response({'detail': 'Category deleted.'}, status=status.HTTP_204_NO_CONTENT)
        except Category.DoesNotExist:
            return Response({'error': 'Category not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"CategoryView: DELETE error: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, user_id):
        try:
            print(f"UserUpdateView: Attempting to update user id={user_id} for user={request.user.username}")
            if request.user.id != user_id:
                return Response(
                    {"error": "Bạn không có quyền sửa thông tin người dùng này."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            username = request.data.get('username')
            if not username:
                return Response(
                    {"error": "Tên người dùng không được để trống."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if User.objects.filter(username=username).exclude(id=user_id).exists():
                return Response(
                    {"error": "Tên người dùng đã tồn tại."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = request.user
            user.username = username
            user.save()
            print(f"UserUpdateView: Updated username to {username} for user id={user_id}")
            return Response({"id": user.id, "username": user.username}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"UserUpdateView: Error: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, user_id):
        try:
            print(f"ChangePasswordView: Attempting to change password for user id={user_id}, user={request.user.username}")
            if request.user.id != user_id:
                return Response(
                    {"error": "Bạn không có quyền đổi mật khẩu người dùng này."},
                    status=status.HTTP_403_FORBIDDEN
                )

            old_password = request.data.get('old_password')
            new_password = request.data.get('new_password')

            if not old_password or not new_password:
                return Response(
                    {"error": "Vui lòng cung cấp mật khẩu cũ và mật khẩu mới."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = request.user
            if not user.check_password(old_password):
                return Response(
                    {"error": "Mật khẩu cũ không đúng."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if len(new_password) < 8:
                return Response(
                    {"error": "Mật khẩu mới phải có ít nhất 8 ký tự."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user.set_password(new_password)
            user.save()
            print(f"ChangePasswordView: Password changed successfully for user id={user_id}")
            return Response({"message": "Đổi mật khẩu thành công."}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"ChangePasswordView: Error: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)