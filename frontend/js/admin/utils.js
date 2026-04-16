
export function formatVND(amount) {
  if (!amount) return "0 đ";
  // Xóa các ký tự không phải số trước khi format (để tránh lỗi nếu đầu vào là chuỗi đã có dấu chấm)
  const value = String(amount).replace(/\D/g, "");
  return Number(value).toLocaleString('vi-VN') + " đ";
}