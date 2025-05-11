import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { COLORS } from '../utils/colors';
import { API_BASE_URL } from '../utils/config';

const ICONS = [
  { name: 'attach-money', label: 'Tiền lương' },
  { name: 'card-giftcard', label: 'Quà tặng' },
  { name: 'trending-up', label: 'Đầu tư' },
  { name: 'home', label: 'Nhà cửa' },
  { name: 'savings', label: 'Tiết kiệm' },
  { name: 'more-horiz', label: 'Khác' },
  { name: 'fastfood', label: 'Ăn uống' },
  { name: 'directions-bus', label: 'Di chuyển' },
  { name: 'school', label: 'Học tập' },
  { name: 'receipt', label: 'Hóa đơn' },
  { name: 'category', label: 'Mặc định' },
];

// Hàm retry để thử lại request khi gặp lỗi
const retryRequest = async (fn, retries = 5, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Thử lại lần ${i + 1}/${retries} sau ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

const CategoryScreen = () => {
  const [categories, setCategories] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('income');
  const [newCategoryIcon, setNewCategoryIcon] = useState('category');
  const [editCategory, setEditCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllIncome, setShowAllIncome] = useState(false);
  const [showAllExpense, setShowAllExpense] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletedCategoryIds, setDeletedCategoryIds] = useState([]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      console.log('Đang lấy danh mục với token:', token, 'userId:', userId);
      if (!token) {
        throw new Error('Token không hợp lệ. Vui lòng đăng nhập lại.');
      }
      const response = await retryRequest(() =>
        axios.get(`${API_BASE_URL}/api/categories/`, {
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        })
      );
      console.log('Danh mục trả về:', response.data);
      const updatedCategories = (response.data || []).filter(
        (cat) => !deletedCategoryIds.includes(cat.id)
      );
      setCategories(updatedCategories);
      return updatedCategories;
    } catch (error) {
      console.error('Lỗi API CategoryScreen:', error.message);
      let errorMessage = 'Không thể tải danh mục. Vui lòng kiểm tra kết nối mạng và thử lại.';
      if (error.response) {
        errorMessage = error.response.data?.error || error.response.data?.detail || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên danh mục.');
      return;
    }

    const userId = await AsyncStorage.getItem('userId');
    const newCategory = {
      name: newCategoryName.trim(),
      type: newCategoryType,
      icon: newCategoryIcon,
      user_id: userId,
      is_default: false,
    };

    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log('Thêm danh mục:', newCategory);
      const response = await retryRequest(() =>
        axios.post(`${API_BASE_URL}/api/categories/`, newCategory, {
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        })
      );
      console.log('Kết quả thêm danh mục:', response.data);
      setCategories([...categories, response.data]);
      Alert.alert('Thành công', 'Đã thêm danh mục mới.');
    } catch (error) {
      console.error('Lỗi thêm danh mục:', error.message);
      let errorMessage = 'Không thể thêm danh mục. Vui lòng kiểm tra kết nối mạng và thử lại.';
      if (error.response) {
        errorMessage = error.response.data?.error || error.response.data?.detail || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert('Lỗi', errorMessage);
    }

    setNewCategoryName('');
    setNewCategoryIcon('category');
    setModalVisible(false);
  };

  const editCategoryHandler = async () => {
    if (!editCategory || !newCategoryName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên danh mục.');
      return;
    }

    const updatedCategory = {
      name: newCategoryName.trim(),
      type: newCategoryType,
      icon: newCategoryIcon,
    };

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Token không hợp lệ. Vui lòng đăng nhập lại.');
      }
      console.log('Cập nhật danh mục:', updatedCategory);
      const response = await retryRequest(() =>
        axios.put(`${API_BASE_URL}/api/categories/${editCategory.id}/`, updatedCategory, {
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        })
      );
      console.log('Kết quả cập nhật danh mục:', response.data);
      setCategories(categories.map((cat) => (cat.id === editCategory.id ? response.data : cat)));
      Alert.alert('Thành công', 'Đã cập nhật danh mục.');
      await fetchCategories();
    } catch (error) {
      console.error('Lỗi cập nhật danh mục:', error.message);
      let errorMessage = 'Không thể cập nhật danh mục. Vui lòng kiểm tra kết nối mạng và thử lại.';
      if (error.response) {
        errorMessage = error.response.data?.error || error.response.data?.detail || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert('Lỗi', errorMessage);
    }

    setNewCategoryName('');
    setNewCategoryIcon('category');
    setEditCategory(null);
    setEditModalVisible(false);
  };

  const openEditModal = (category) => {
    setEditCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryType(category.type);
    setNewCategoryIcon(category.icon || 'category');
    setEditModalVisible(true);
  };

  const deleteCategory = useCallback(async (categoryId) => {
  if (!categoryId) {
    Alert.alert('Lỗi', 'ID danh mục không hợp lệ.');
    return;
  }

  const category = categories.find((cat) => cat.id === categoryId);
  if (!category) {
    Alert.alert('Lỗi', 'Danh mục không tồn tại trong danh sách.');
    await fetchCategories();
    return;
  }

  if (category.is_default) {
    Alert.alert('Lỗi', 'Không thể xóa danh mục mặc định.');
    return;
  }

  if (deletedCategoryIds.includes(categoryId)) {
    Alert.alert('Thông báo', 'Danh mục này đã được xóa.');
    return;
  }

  if (isDeleting) {
    Alert.alert('Thông báo', 'Đang xử lý xóa danh mục, vui lòng chờ.');
    return;
  }

  // Thêm xác nhận trước khi xóa
  Alert.alert(
    'Xác nhận xóa',
    `Bạn có chắc chắn muốn xóa danh mục "${category.name}" không?`,
    [
      {
        text: 'Hủy',
        style: 'cancel',
      },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          let syncSuccess = false;

          try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
              throw new Error('Token không hợp lệ. Vui lòng đăng nhập lại.');
            }
            console.log('Danh sách danh mục trước khi xóa:', categories.map(cat => cat.id));
            console.log('Xóa danh mục với ID:', categoryId);
            console.log('API URL:', `${API_BASE_URL}/api/categories/${categoryId}/`);
            const response = await axios.delete(`${API_BASE_URL}/api/categories/${categoryId}/`, {
              headers: {
                Authorization: `Token ${token}`,
                'Content-Type': 'application/json',
              },
              timeout: 50000, // Tăng timeout lên 30 giây để giảm lỗi Network Error
              validateStatus: (status) => (status >= 200 && status < 300) || status === 204,
            });
            console.log('Kết quả xóa:', response.status);
            if (response.status === 204) {
              setDeletedCategoryIds([...deletedCategoryIds, categoryId]);
              setCategories(categories.filter((cat) => cat.id !== categoryId));
              console.log('Danh sách danh mục sau khi xóa:', categories.map(cat => cat.id));
              Alert.alert('Thành công', 'Đã xóa danh mục.');
            }
          } catch (error) {
            console.error('Lỗi xóa danh mục:', error.message);
            console.error('Chi tiết lỗi:', error);
            let errorMessage = 'Không thể xóa danh mục. Vui lòng kiểm tra kết nối mạng và thử lại.';
            let shouldSync = true;

            if (error.response) {
              if (error.response.status === 404) {
                setDeletedCategoryIds([...deletedCategoryIds, categoryId]);
                setCategories(categories.filter((cat) => cat.id !== categoryId));
                errorMessage = 'Danh mục không tồn tại hoặc đã được xóa trước đó. Dữ liệu sẽ được đồng bộ ngay.';
              } else {
                errorMessage = error.response.data?.error || error.response.data?.detail || errorMessage;
                shouldSync = false;
              }
            } else if (error.message === 'Network Error') {
              // Giả định xóa thành công trên server, cập nhật giao diện
              setDeletedCategoryIds([...deletedCategoryIds, categoryId]);
              setCategories(categories.filter((cat) => cat.id !== categoryId));
              errorMessage = 'Đã xóa danh mục trên ứng dụng, nhưng không thể xác nhận với server do lỗi mạng. Dữ liệu sẽ được đồng bộ lại.';
            } else if (error.message) {
              errorMessage = error.message;
              shouldSync = false;
            }

            Alert.alert('Thông báo', errorMessage);
            if (shouldSync) {
              await fetchCategories();
            }
          } finally {
            try {
              await fetchCategories(); // Đồng bộ lại một lần duy nhất
              syncSuccess = true;
            } catch (syncError) {
              console.error('Lỗi đồng bộ dữ liệu:', syncError.message);
              Alert.alert(
                'Lỗi đồng bộ',
                'Không thể đồng bộ dữ liệu do lỗi kết nối mạng. Vui lòng kiểm tra mạng và thử lại.',
                [
                  { text: 'Hủy', style: 'cancel' },
                  {
                    text: 'Thử lại',
                    onPress: async () => {
                      try {
                        await fetchCategories();
                        Alert.alert('Thành công', 'Đã đồng bộ dữ liệu.');
                      } catch (retryError) {
                        console.error('Lỗi thử lại đồng bộ:', retryError.message);
                        Alert.alert('Lỗi', 'Không thể đồng bộ dữ liệu. Vui lòng thử lại sau.');
                      }
                    },
                  },
                ]
              );
            }
            if (syncSuccess) {
              setIsDeleting(false);
              console.log('Đồng bộ thành công, kích hoạt lại nút xóa.');
            } else {
              Alert.alert('Thông báo', 'Vui lòng nhấn nút Làm mới để cập nhật danh sách.');
            }
          }
        },
      },
    ]
  );
}, [categories, isDeleting, deletedCategoryIds]);

  const incomeCategories = categories.filter((cat) => cat.type === 'income');
  const expenseCategories = categories.filter((cat) => cat.type === 'expense');
  const displayedIncomeCategories = showAllIncome ? incomeCategories : incomeCategories.slice(0, 3);
  const displayedExpenseCategories = showAllExpense ? expenseCategories : expenseCategories.slice(0, 3);

  const renderCategoryItem = ({ item }) => (
    <View style={styles.categoryCard}>
      <View style={styles.categoryLeft}>
        <View style={styles.categoryIconContainer}>
          <Icon name={item.icon || 'category'} size={20} color={COLORS.text} />
        </View>
        <Text style={styles.categoryName}>{item.name}</Text>
      </View>
      <View style={styles.categoryActions}>
        {!item.is_default && (
          <>
            <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionButton}>
              <Icon name="edit" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => deleteCategory(item.id)}
              style={styles.actionButton}
              disabled={isDeleting || deletedCategoryIds.includes(item.id)}
            >
              <Icon name="delete" size={20} color={(isDeleting || deletedCategoryIds.includes(item.id)) ? COLORS.gray : COLORS.error} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  const renderIconOption = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.iconOption,
        newCategoryIcon === item.name && styles.iconOptionSelected,
      ]}
      onPress={() => setNewCategoryIcon(item.name)}
    >
      <Icon name={item.name} size={24} color={newCategoryIcon === item.name ? COLORS.primary : COLORS.text} />
      <Text style={styles.iconLabel}>{item.label}</Text>
    </TouchableOpacity>
  );

  const renderSection = ({ item: section }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: section?.color || COLORS.white }]}>{section?.title || 'N/A'}</Text>
      {section?.data?.length > 0 ? (
        <FlatList
          data={section.data}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.categoryList}
        />
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{section?.emptyText || 'Không có dữ liệu.'}</Text>
        </View>
      )}
      {section?.total > 3 && (
        <TouchableOpacity
          style={styles.showMoreButton}
          onPress={() => section.onToggle()}
        >
          <Text style={styles.showMoreText}>
            {section.showAll ? 'Thu gọn' : 'Xem thêm'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const sections = [
    {
      title: 'Thu nhập',
      data: displayedIncomeCategories,
      color: '#34D399',
      total: incomeCategories.length,
      showAll: showAllIncome,
      onToggle: () => setShowAllIncome(!showAllIncome),
      emptyText: 'Không có danh mục thu nhập.',
    },
    {
      title: 'Chi tiêu',
      data: displayedExpenseCategories,
      color: '#F87171',
      total: expenseCategories.length,
      showAll: showAllExpense,
      onToggle: () => setShowAllExpense(!showAllExpense),
      emptyText: 'Không có danh mục chi tiêu.',
    },
  ];

  useEffect(() => {
    console.log('Sections:', sections);
    console.log('Categories:', categories);
  }, [sections, categories]);

  return (
    <LinearGradient colors={[COLORS.secondary, COLORS.primary]} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Danh Mục</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchCategories}>
          <Icon name="refresh" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Đang tải...</Text>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCategories}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sections}
          renderItem={renderSection}
          keyExtractor={(item, index) => index.toString()}
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}

      {/* Modal thêm danh mục */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thêm Danh Mục Mới</Text>
            <TextInput
              style={styles.input}
              placeholder="Tên danh mục"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />
            <Text style={styles.label}>Loại danh mục:</Text>
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newCategoryType === 'income' ? styles.typeButtonSelected : null,
                ]}
                onPress={() => setNewCategoryType('income')}
              >
                <Text style={styles.typeText}>Thu nhập</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newCategoryType === 'expense' ? styles.typeButtonSelected : null,
                ]}
                onPress={() => setNewCategoryType('expense')}
              >
                <Text style={styles.typeText}>Chi tiêu</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Chọn biểu tượng:</Text>
            <FlatList
              data={ICONS}
              renderItem={renderIconOption}
              keyExtractor={(item) => item.name}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.iconList}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonAdd]} onPress={addCategory}>
                <Text style={[styles.modalButtonText, { color: COLORS.white }]}>Thêm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal sửa danh mục */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sửa Danh Mục</Text>
            <TextInput
              style={styles.input}
              placeholder="Tên danh mục"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />
            <Text style={styles.label}>Loại danh mục:</Text>
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newCategoryType === 'income' ? styles.typeButtonSelected : null,
                ]}
                onPress={() => setNewCategoryType('income')}
              >
                <Text style={styles.typeText}>Thu nhập</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newCategoryType === 'expense' ? styles.typeButtonSelected : null,
                ]}
                onPress={() => setNewCategoryType('expense')}
              >
                <Text style={styles.typeText}>Chi tiêu</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Chọn biểu tượng:</Text>
            <FlatList
              data={ICONS}
              renderItem={renderIconOption}
              keyExtractor={(item) => item.name}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.iconList}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonAdd]} onPress={editCategoryHandler}>
                <Text style={[styles.modalButtonText, { color: COLORS.white }]}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Icon name="add" size={30} color={COLORS.white} />
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    fontFamily: 'Roboto-Bold',
  },
  refreshButton: {
    padding: 10,
  },
  content: {
    flex: 1,
    marginHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 10,
    fontFamily: 'Roboto-Medium',
  },
  categoryList: {
    marginBottom: 10,
  },
  categoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.text + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  categoryName: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: 'Roboto-Medium',
  },
  categoryActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 10,
  },
  showMoreButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginTop: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  showMoreText: {
    fontSize: 14,
    color: COLORS.white,
    fontFamily: 'Roboto-Medium',
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: COLORS.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: COLORS.text,
    fontFamily: 'Roboto-Medium',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    fontSize: 16,
    color: COLORS.text,
    fontFamily: 'Roboto-Regular',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.text,
    fontFamily: 'Roboto-Medium',
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  typeButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeText: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: 'Roboto-Regular',
  },
  iconList: {
    marginBottom: 20,
    maxHeight: 100,
  },
  iconOption: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  iconOptionSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 10,
    padding: 5,
  },
  iconLabel: {
    fontSize: 12,
    color: COLORS.text,
    marginTop: 5,
    fontFamily: 'Roboto-Regular',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  modalButtonAdd: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modalButtonText: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: 'Roboto-Medium',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.white,
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Roboto-Regular',
  },
  errorContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Roboto-Regular',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    fontSize: 16,
    color: COLORS.white,
    fontFamily: 'Roboto-Medium',
  },
  emptyCard: {
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
  emptyText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    fontFamily: 'Roboto-Regular',
  },
});

export default CategoryScreen;