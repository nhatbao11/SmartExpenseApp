import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { COLORS } from '../utils/colors';
import { API_BASE_URL } from '../utils/config';

// Hàm định dạng số với dấu chấm (từ HomeScreen)
const formatNumberWithDot = (number) => {
  if (number === undefined || number === null || isNaN(number)) return '0';
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allTransactions, setAllTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Lấy toàn bộ giao dịch khi màn hình được mở
  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('SearchScreen: Fetching all transactions');
      const response = await axios.get(`${API_BASE_URL}/api/transactions/`, {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('SearchScreen: API response:', response.data);
      const transactions = response.data || [];
      setAllTransactions(transactions);
      setFilteredTransactions(transactions);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('SearchScreen: API error:', error.response?.data, error.response?.status);
      setAllTransactions([]);
      setFilteredTransactions([]);
    }
  };

  // Lọc và sắp xếp giao dịch khi searchQuery thay đổi
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTransactions([...allTransactions].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      ));
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = allTransactions.filter((transaction) => {
        const description = transaction.description?.toLowerCase() || '';
        const amount = transaction.amount?.toString() || '';
        return description.includes(query) || amount.includes(query);
      });
      setFilteredTransactions([...filtered].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      ));
    }

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 0,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    });
  }, [searchQuery, allTransactions]);

  // Hàm định dạng ngày và lấy thứ trong tuần
  const formatDateWithDay = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date)) return 'Ngày không xác định';

    const daysOfWeek = [
      'Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'
    ];
    const dayOfWeek = daysOfWeek[date.getDay()];
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${dayOfWeek}, ${day}/${month}/${year}`;
  };

  const renderTransaction = ({ item }) => {
    const isIncome = item.transaction_type === 'income';
    // Bỏ phần thập phân và định dạng số tiền giống HomeScreen
    const displayAmount = parseInt(item.amount); // Loại bỏ .00
    return (
      <Animated.View style={[styles.transactionCard, { opacity: fadeAnim }]}>
        <View style={styles.transactionHeader}>
          <View style={styles.iconContainer}>
            <Icon
              name={isIncome ? 'arrow-upward' : 'arrow-downward'}
              size={20}
              color={isIncome ? '#34D399' : '#F87171'}
            />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionText}>
              {item.description || 'Không có mô tả'}
            </Text>
            <Text style={[styles.transactionAmount, { color: isIncome ? '#34D399' : '#F87171' }]}>
              {isIncome ? '+' : '-'} {formatNumberWithDot(displayAmount)} VND
            </Text>
          </View>
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionType}>
            {isIncome ? 'Thu nhập' : 'Chi tiêu'}
          </Text>
          <Text style={styles.transactionCategory}>
            Danh mục: {item.category_name || 'Không xác định'}
          </Text>
          <Text style={styles.transactionDate}>
            {formatDateWithDay(item.created_at)}
          </Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.container}>
      <Text style={styles.title}>Tìm kiếm giao dịch</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Nhập mô tả hoặc số tiền..."
          placeholderTextColor={COLORS.text + '80'}
          value={searchQuery}
          onChangeText={(text) => setSearchQuery(text)}
        />
      </View>
      {filteredTransactions.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.noDataText}>Chưa có giao dịch</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id.toString()}
          style={styles.transactionList}
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Roboto-Bold',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginHorizontal: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 20,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.text + '33',
    fontFamily: 'Roboto-Regular',
  },
  transactionList: {
    marginHorizontal: 20,
  },
  transactionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.text + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: 'bold',
    fontFamily: 'Roboto-Medium',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Roboto-Medium',
  },
  transactionDetails: {
    marginLeft: 50,
  },
  transactionType: {
    fontSize: 14,
    color: COLORS.text + '80',
    fontFamily: 'Roboto-Regular',
  },
  transactionCategory: {
    fontSize: 14,
    color: COLORS.text + '80',
    fontFamily: 'Roboto-Regular',
  },
  transactionDate: {
    fontSize: 14,
    color: COLORS.text + '80',
    fontFamily: 'Roboto-Regular',
    marginTop: 4,
  },
  noDataText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    fontFamily: 'Roboto-Regular',
  },
});

export default SearchScreen;