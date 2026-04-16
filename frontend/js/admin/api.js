// js/admin/api.js

export async function api(url, options = {}) {
  const token = localStorage.getItem('token');
  options.headers = options.headers || {};
  if (token) options.headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, options);
  const txt = await res.text();
  try { return JSON.parse(txt); } 
  catch (e) { return { status: res.status, text: txt }; }
}

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('image', file);
  const token = localStorage.getItem('token');
  const res = await fetch('/api/uploads', {
    method: 'POST',
    headers: token ? { 'Authorization': 'Bearer ' + token } : {},
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload thất bại');
  return data.url;
}