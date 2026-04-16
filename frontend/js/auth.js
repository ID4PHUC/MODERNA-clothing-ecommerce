// --- HÀM HỖ TRỢ HIỂN THỊ THÔNG BÁO TỰ MẤT (TOAST) ---
const toastContainer = document.createElement('div');
toastContainer.id = 'toast-container';
document.body.appendChild(toastContainer);

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// --- LOGIC GỬI JSON ---
async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

// --- 1. XỬ LÝ ĐĂNG NHẬP ---
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const data = await postJSON('/api/auth/login', { email, password });

    if (data.token) {
      showToast('Đăng nhập thành công!', 'success');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setTimeout(() => {
        try {
          if (data.user && data.user.isAdmin) {
            window.location.href = 'admin.html';
            return;
          }
        } catch (err) { /* ignore */ }
        window.location.href = 'index.html';
      }, 1000);
    } else {
      showToast(data.error || 'Đăng nhập thất bại', 'error');
    }
  });
}

// --- 2. XỬ LÝ CAPTCHA PHÉP TÍNH ---
function generateCaptcha() {
  const qElement = document.getElementById('math-question');
  if (!qElement) return; // Nếu không ở trang đăng ký thì bỏ qua

  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  qElement.innerText = `Xác nhận: ${a} + ${b} = ?`;
  window.currentAnswer = a + b;
}

// --- 3. XỬ LÝ ĐĂNG KÝ (TÍCH HỢP BẢO MẬT) ---
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Lấy giá trị CAPTCHA và Honeypot
    const mathInput = document.getElementById('math-answer');
    const userAnswer = mathInput ? parseInt(mathInput.value) : 0;
    const honeyPotField = document.getElementById('address_field');
    const honeyPotValue = honeyPotField ? honeyPotField.value : "";

    // Kiểm tra nhanh CAPTCHA ở Frontend
    if (userAnswer !== window.currentAnswer) {
      showToast("Phép tính không đúng, vui lòng thử lại!", "error");
      generateCaptcha();
      return;
    }

    // Gửi lên server kèm tất cả các trường bảo mật
    const data = await postJSON('/api/auth/register', {
      name,
      email,
      password,
      captchaAnswer: userAnswer,
      captchaCheck: window.currentAnswer,
      address_confirm: honeyPotValue
    });

    if (data.token) {
      showToast("Đăng ký thành công!", "success");
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
    } else {
      showToast(data.error || 'Đăng ký thất bại', "error");
      generateCaptcha();
    }
  });
}

// --- 4. CÁC TIỆN ÍCH UI (HIỆN MẬT KHẨU, LOAD CAPTCHA) ---
document.addEventListener('DOMContentLoaded', () => {
  // Load phép tính khi vào trang
  generateCaptcha();

  // Logic hiện/ẩn mật khẩu
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      const openEye = btn.querySelector('.eye-open');
      const closedEye = btn.querySelector('.eye-closed');

      if (!input) return;

      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';

      if (openEye && closedEye) {
        openEye.style.display = isHidden ? 'none' : 'block';
        closedEye.style.display = isHidden ? 'block' : 'none';
      }
    });
  });
});


// --- 5. quen mk ---
const forgotForm = document.getElementById('forgotForm');
if (forgotForm) {
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    showToast("Đang xử lý gửi mail...", "success");
    const data = await postJSON('/api/auth/forgot-password', { email });
    if (data.message) showToast(data.message, "success");
    else showToast(data.error, "error");
  });
}

// Cho trang reset-password.html
const resetForm = document.getElementById('resetForm');
if (resetForm) {
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Kiểm tra khớp mật khẩu
    if (newPassword !== confirmPassword) {
        showToast("Mật khẩu xác nhận không khớp!", "error");
        return;
    }

    // Lấy token từ thanh địa chỉ (URL)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showToast("Mã xác thực không hợp lệ!", "error");
        return;
    }

    const data = await postJSON('/api/auth/reset-password', { token, newPassword });

    if (data.message) {
      showToast(data.message, "success");
      // Sau 2 giây chuyển về trang đăng nhập
      setTimeout(() => window.location.href = 'login.html', 2000);
    } else {
      showToast(data.error || "Có lỗi xảy ra", "error");
    }
  });
}

