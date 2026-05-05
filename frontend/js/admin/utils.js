
export function formatVND(amount) {
  if (!amount) return "0 đ";
  // Xóa các ký tự không phải số trước khi format 
  const value = String(amount).replace(/\D/g, "");
  return Number(value).toLocaleString('vi-VN') + " đ";
}

// Hàm xử lý link ảnh dùng chung cho toàn bộ dự án
export function getImageUrl(path) {
    if (!path) return 'https://via.placeholder.com/400x500?text=No+Image';

    // Nếu link đã là link tuyệt đối
    if (path.startsWith('http')) {
        return path;
    }
    return path; 
}