import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BarChart } from 'react-native-gifted-charts';
import { COLORS } from '../utils/colors';
import { API_BASE_URL } from '../utils/config';

// Lấy chiều rộng màn hình
const screenWidth = Dimensions.get('window').width;

// Hàm định dạng số với dấu chấm
const formatNumberWithDot = (number) => {
  if (number === undefined || number === null || isNaN(number)) {
    return '0';
  }
  return parseInt(number).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Hàm định dạng ngày theo kiểu dd/mm/yyyy
const formatDate = (date) => {
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
};

// Hàm định dạng ngày theo kiểu yyyy-mm-dd để so sánh
const formatDateForComparison = (date) => {
  if (!(date instanceof Date) || isNaN(date)) return null;
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Hàm tính khoảng thời gian hợp lý
const getDateRange = (period, currentDate) => {
  const startDate = new Date(currentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (period === 'Ngày') {
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  } else if (period === 'Tuần') {
    const dayOfWeek = startDate.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + diffToMonday);
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    if (endDate > today) {
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
    }
    return { startDate, endDate };
  } else if (period === 'Tháng') {
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);
    endDate.setHours(23, 59, 59, 999);
    if (endDate > today) {
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
    }
    return { startDate, endDate };
  } else if (period === 'Năm') {
    startDate.setMonth(0, 1);
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date(startDate);
    endDate.setMonth(11, 31);
    endDate.setHours(23, 59, 59, 999);
    if (endDate > today) {
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
    }
    return { startDate, endDate };
  }
};

// Hàm kiểm tra giao dịch có hợp lệ không
const isValidTransaction = (transaction) => {
  return (
    transaction &&
    typeof transaction === 'object' &&
    transaction.created_at &&
    !isNaN(new Date(transaction.created_at)) &&
    transaction.transaction_type &&
    ['income', 'expense'].includes(transaction.transaction_type) &&
    transaction.amount !== undefined &&
    !isNaN(Number(transaction.amount))
  );
};

// Component hiển thị giá trị trên đầu cột với định dạng linh hoạt
const renderTopLabel = (value) => {
  if (value === 0) {
    return (
      <Text style={styles.topLabelText}>
        0M
      </Text>
    );
  } else if (value < 0.1) {
    return (
      <Text style={styles.topLabelText}>
        {value.toFixed(3)}M
      </Text>
    );
  } else if (value < 1) {
    return (
      <Text style={styles.topLabelText}>
        {value.toFixed(1)}M
      </Text>
    );
  } else {
    return (
      <Text style={styles.topLabelText}>
        {Math.round(value)}M
      </Text>
    );
  }
};

// Chuẩn bị dữ liệu cho biểu đồ cột
const prepareChartData = (transactions, selectedTab, startDate, endDate) => {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return { chartData: [], maxValue: 0.1, stepValue: 0.02, chartWidth: screenWidth - 40 };
  }

  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const validTransactions = safeTransactions.filter(isValidTransaction);

  let chartData = [];
  const start = formatDateForComparison(startDate);
  const end = formatDateForComparison(endDate);

  // Tính maxValue động dựa trên dữ liệu
  const calculateMaxValue = (values) => {
    const max = Math.max(...values.filter(v => v !== undefined && !isNaN(v)), 0.1); // Mặc định tối thiểu 0.1 triệu
    if (max <= 0.1) return 0.1; // Trục Y: 0, 0.02, 0.04, ..., 0.1
    if (max <= 0.5) return 0.5; // Trục Y: 0, 0.1, 0.2, ..., 0.5
    if (max <= 1) return 1; // Trục Y: 0, 0.2, 0.4, ..., 1
    if (max <= 10) return 10; // Trục Y: 0, 2, 4, ..., 10
    return Math.ceil(max / 20) * 20; // Ví dụ: 0, 20, 40, ..., 80
  };

  if (selectedTab === 'Ngày') {
    const dailyTransactions = validTransactions.filter((t) => {
      const transDate = formatDateForComparison(new Date(t.created_at));
      return transDate === start;
    });
    const dailyIncome = dailyTransactions
      .filter((t) => t.transaction_type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const dailyExpense = dailyTransactions
      .filter((t) => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    console.log('Daily - Income:', dailyIncome, 'Expense:', dailyExpense);

    chartData = [
      {
        value: dailyIncome / 1000000 || 0,
        label: formatDate(startDate).split('/').slice(0, 2).join('/'),
        frontColor: '#34D399',
        topLabelComponent: () => renderTopLabel(dailyIncome / 1000000 || 0),
      },
      {
        value: dailyExpense / 1000000 || 0,
        label: '',
        frontColor: '#F87171',
        topLabelComponent: () => renderTopLabel(dailyExpense / 1000000 || 0),
      },
    ];
  } else if (selectedTab === 'Tuần') {
    chartData = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDate(d).split('/').slice(0, 2).join('/');
      const currentDateStr = formatDateForComparison(d);
      const dailyTransactions = validTransactions.filter((t) => {
        const transDate = formatDateForComparison(new Date(t.created_at));
        return transDate === currentDateStr;
      });
      const dailyIncome = dailyTransactions
        .filter((t) => t.transaction_type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const dailyExpense = dailyTransactions
        .filter((t) => t.transaction_type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      console.log(`Week ${dateStr} - Income:`, dailyIncome, 'Expense:', dailyExpense);

      chartData.push(
        {
          value: dailyIncome / 1000000 || 0,
          label: dateStr,
          frontColor: '#34D399',
          topLabelComponent: () => renderTopLabel(dailyIncome / 1000000 || 0),
        },
        {
          value: dailyExpense / 1000000 || 0,
          label: '',
          frontColor: '#F87171',
          topLabelComponent: () => renderTopLabel(dailyExpense / 1000000 || 0),
        }
      );
    }
  } else if (selectedTab === 'Tháng') {
    const labels = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];
    const incomeData = [0, 0, 0, 0];
    const expenseData = [0, 0, 0, 0];

    validTransactions.forEach((t) => {
      const transDate = new Date(t.created_at);
      const transDateStr = formatDateForComparison(transDate);
      if (!isNaN(transDate) && transDateStr >= start && transDateStr <= end) {
        const weekIndex = Math.floor((transDate.getDate() - 1) / 7);
        if (weekIndex < 4) {
          if (t.transaction_type === 'income') {
            incomeData[weekIndex] += Number(t.amount) || 0;
          } else if (t.transaction_type === 'expense') {
            expenseData[weekIndex] += Number(t.amount) || 0;
          }
        }
      }
    });

    console.log('Month - Income:', incomeData, 'Expense:', expenseData);

    chartData = labels.map((label, index) => [
      {
        value: incomeData[index] / 1000000 || 0,
        label,
        frontColor: '#34D399',
        topLabelComponent: () => renderTopLabel(incomeData[index] / 1000000 || 0),
      },
      {
        value: expenseData[index] / 1000000 || 0,
        label: '',
        frontColor: '#F87171',
        topLabelComponent: () => renderTopLabel(expenseData[index] / 1000000 || 0),
      },
    ]).flat();
  } else if (selectedTab === 'Năm') {
    const labels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    const incomeData = Array(12).fill(0);
    const expenseData = Array(12).fill(0);

    validTransactions.forEach((t) => {
      const transDate = new Date(t.created_at);
      const transDateStr = formatDateForComparison(transDate);
      if (!isNaN(transDate) && transDateStr >= start && transDateStr <= end) {
        const monthIndex = transDate.getMonth();
        if (t.transaction_type === 'income') {
          incomeData[monthIndex] += Number(t.amount) || 0;
        } else if (t.transaction_type === 'expense') {
          expenseData[monthIndex] += Number(t.amount) || 0;
        }
      }
    });

    console.log('Year - Income:', incomeData, 'Expense:', expenseData);

    chartData = labels.map((label, index) => [
      {
        value: incomeData[index] / 1000000 || 0,
        label,
        frontColor: '#34D399',
        topLabelComponent: () => renderTopLabel(incomeData[index] / 1000000 || 0),
      },
      {
        value: expenseData[index] / 1000000 || 0,
        label: '',
        frontColor: '#F87171',
        topLabelComponent: () => renderTopLabel(expenseData[index] / 1000000 || 0),
      },
    ]).flat();
  }

  // Tính maxValue dựa trên tất cả dữ liệu
  const allValues = chartData.map(item => item.value).filter(v => v !== undefined && !isNaN(v));
  const maxValue = allValues.length > 0 ? calculateMaxValue(allValues) : 0.1;
  const stepValue = maxValue <= 0.1 ? 0.02 : maxValue <= 0.5 ? 0.1 : maxValue <= 1 ? 0.2 : maxValue <= 10 ? 2 : maxValue / 5;

  // Tính chiều rộng biểu đồ dựa trên số lượng nhãn
  const uniqueLabels = [...new Set(chartData.map(item => item.label).filter(label => label))];
  const chartWidth = Math.max(screenWidth - 40, uniqueLabels.length * 100) + 50;

  return { chartData, maxValue, stepValue, chartWidth };
};

const ChartScreen = () => {
  const [selectedTab, setSelectedTab] = useState('Tuần');
  const [currentStartDate, setCurrentStartDate] = useState(new Date());
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [incomeCount, setIncomeCount] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const tabs = ['Ngày', 'Tuần', 'Tháng', 'Năm'];

  useEffect(() => {
    fetchTransactions();
  }, [selectedTab, currentStartDate]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const { startDate, endDate } = getDateRange(selectedTab, currentStartDate);
      const response = await axios.get(`${API_BASE_URL}/api/transactions/`, {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        params: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        },
      });

      if (response.status !== 200) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const rawData = response.data || [];
      console.log('API response raw:', rawData);

      if (!Array.isArray(rawData)) {
        console.warn('API response is not an array, defaulting to empty array');
        setTransactions([]);
        setIncome(0);
        setExpense(0);
        setIncomeCount(0);
        setExpenseCount(0);
      } else {
        const validTransactions = rawData.filter(t => {
          const isValid = isValidTransaction(t);
          if (!isValid) console.warn('Invalid transaction:', t);
          return isValid;
        });

        const start = formatDateForComparison(startDate);
        const end = formatDateForComparison(endDate);
        const filteredTransactions = validTransactions.filter((t) => {
          const transDate = formatDateForComparison(new Date(t.created_at));
          return transDate >= start && transDate <= end;
        });

        const incomeAmount = filteredTransactions
          .filter((t) => t.transaction_type === 'income')
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        const expenseAmount = filteredTransactions
          .filter((t) => t.transaction_type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        const incomeCount = filteredTransactions.filter((t) => t.transaction_type === 'income').length;
        const expenseCount = filteredTransactions.filter((t) => t.transaction_type === 'expense').length;

        console.log('Calculated - Income:', incomeAmount, 'Expense:', expenseAmount, 'Income Count:', incomeCount, 'Expense Count:', expenseCount);

        setTransactions(validTransactions);
        setIncome(incomeAmount);
        setExpense(expenseAmount);
        setIncomeCount(incomeCount);
        setExpenseCount(expenseCount);
      }
    } catch (error) {
      console.error('ChartScreen: Error:', error.message);
      setErrorMessage(error.message || 'Failed to fetch transactions');
      setTransactions([]);
      setIncome(0);
      setExpense(0);
      setIncomeCount(0);
      setExpenseCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    const newStartDate = new Date(currentStartDate);
    if (selectedTab === 'Ngày') {
      newStartDate.setDate(newStartDate.getDate() - 1);
    } else if (selectedTab === 'Tuần') {
      newStartDate.setDate(newStartDate.getDate() - 7);
    } else if (selectedTab === 'Tháng') {
      newStartDate.setMonth(newStartDate.getMonth() - 1);
    } else if (selectedTab === 'Năm') {
      newStartDate.setFullYear(newStartDate.getFullYear() - 1);
    }
    setCurrentStartDate(newStartDate);
  };

  const handleNext = () => {
    const newStartDate = new Date(currentStartDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedTab === 'Ngày') {
      newStartDate.setDate(newStartDate.getDate() + 1);
    } else if (selectedTab === 'Tuần') {
      newStartDate.setDate(newStartDate.getDate() + 7);
    } else if (selectedTab === 'Tháng') {
      newStartDate.setMonth(newStartDate.getMonth() + 1);
    } else if (selectedTab === 'Năm') {
      newStartDate.setFullYear(newStartDate.getFullYear() + 1);
    }
    if (newStartDate > today) {
      newStartDate.setTime(today.getTime());
    }
    setCurrentStartDate(newStartDate);
  };

  const { startDate, endDate } = getDateRange(selectedTab, currentStartDate);
  const dateRangeText = `${formatDate(startDate)} - ${formatDate(endDate)}`;
  const { chartData, maxValue, stepValue, chartWidth } = prepareChartData(transactions, selectedTab, startDate, endDate);

  return (
    <LinearGradient colors={[COLORS.secondary, COLORS.primary]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Tiêu đề */}
        <Text style={styles.title}>Thống kê Tài chính</Text>

        {/* Tabs thời gian */}
        <View style={styles.tabContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                selectedTab === tab ? styles.tabSelected : styles.tabUnselected,
              ]}
              onPress={() => setSelectedTab(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === tab ? styles.tabTextSelected : styles.tabTextUnselected,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Khoảng thời gian và nút điều hướng */}
        <View style={styles.dateContainer}>
          <TouchableOpacity onPress={handlePrevious} style={styles.navButton}>
            <Icon name="chevron-left" size={30} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.dateText}>{dateRangeText}</Text>
          <TouchableOpacity onPress={handleNext} style={styles.navButton}>
            <Icon name="chevron-right" size={30} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Hiển thị lỗi nếu có */}
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        {/* Biểu đồ */}
        <View style={styles.chartContainer}>
          {loading ? (
            <Text style={styles.loadingText}>Đang tải...</Text>
          ) : chartData.length > 0 ? (
            <>
              <Text style={styles.chartTitle}>Biểu đồ Thu nhập & Chi tiêu (triệu VND)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 30 }}
              >
                <BarChart
                  key={JSON.stringify({ selectedTab, startDate, endDate })}
                  data={chartData}
                  width={chartWidth}
                  height={300}
                  maxValue={maxValue}
                  stepValue={stepValue}
                  noOfSections={5}
                  barWidth={30}
                  spacing={20}
                  frontColor="#34D399"
                  yAxisLabelSuffix="M"
                  yAxisTextStyle={{ color: COLORS.text, fontSize: 12 }}
                  xAxisLabelTextStyle={{ color: COLORS.text, fontSize: 12 }}
                  showLine={false}
                  showFractionalValues={true}
                  fromZero
                  yAxisThickness={1}
                  xAxisThickness={1}
                  backgroundColor="#ffffff"
                  rulesColor="#e0e0e0"
                  barBorderRadius={4}
                />
              </ScrollView>
              {/* Thêm chú thích (legend) */}
              <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#34D399' }]} />
                  <Text style={styles.legendText}>Thu nhập</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#F87171' }]} />
                  <Text style={styles.legendText}>Chi tiêu</Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.noDataText}>Không có dữ liệu để hiển thị</Text>
          )}
        </View>

        {/* Tổng quan */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Icon name="arrow-upward" size={20} color="#34D399" />
              <Text style={styles.summaryLabel}>Thu nhập ({selectedTab})</Text>
            </View>
            <Text style={[styles.summaryValue, { color: '#34D399' }]}>
              {formatNumberWithDot(income)} VND
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Icon name="arrow-downward" size={20} color="#F87171" />
              <Text style={styles.summaryLabel}>Chi tiêu ({selectedTab})</Text>
            </View>
            <Text style={[styles.summaryValue, { color: '#F87171' }]}>
              {formatNumberWithDot(expense)} VND
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tổng còn lại ({selectedTab}):</Text>
            <Text style={[styles.summaryValue, { color: income >= expense ? '#34D399' : '#F87171' }]}>
              {formatNumberWithDot(income - expense)} VND
            </Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 25,
    fontFamily: 'Roboto-Bold',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 25,
    marginHorizontal: 5,
    backgroundColor: COLORS.white,
  },
  tabSelected: {
    backgroundColor: COLORS.primary,
  },
  tabUnselected: {
    backgroundColor: COLORS.white,
  },
  tabText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
  },
  tabTextSelected: {
    color: COLORS.white,
  },
  tabTextUnselected: {
    color: COLORS.text,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  navButton: {
    padding: 5,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dateText: {
    fontSize: 18,
    color: COLORS.white,
    fontFamily: 'Roboto-Medium',
  },
  chartContainer: {
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 25,
  },
  chartTitle: {
    fontSize: 18,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Roboto-Medium',
  },
  loadingText: {
    fontSize: 18,
    color: COLORS.text,
    fontFamily: 'Roboto-Regular',
  },
  noDataText: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: 'Roboto-Regular',
  },
  errorText: {
    fontSize: 16,
    color: '#F87171',
    textAlign: 'center',
    marginVertical: 10,
    fontFamily: 'Roboto-Regular',
  },
  summaryContainer: {
    marginHorizontal: 20,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 18,
    color: COLORS.text,
    marginLeft: 8,
    fontFamily: 'Roboto-Regular',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Roboto-Medium',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.text,
    fontFamily: 'Roboto-Regular',
  },
  topLabelText: {
    color: COLORS.text,
    fontSize: 10,
    fontFamily: 'Roboto-Medium',
    textAlign: 'center',
  },
});

export default ChartScreen;