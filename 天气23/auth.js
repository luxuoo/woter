// 用户认证相关功能
const API_BASE_URL = 'http://localhost:3000/api'; // 后端API地址
let currentUser = null;

// DOM元素
const authButtons = document.getElementById('auth-buttons');
const userProfile = document.getElementById('user-profile');
const usernameElement = document.getElementById('username');
const userAvatarElement = document.getElementById('user-avatar');
const profileAvatarElement = document.getElementById('profile-avatar');
const profileUsernameElement = document.getElementById('profile-username');
const profileEmailElement = document.getElementById('profile-email');
const logoutBtn = document.getElementById('logout-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const verificationForm = document.getElementById('verification-form');
const forgotPasswordForm = document.getElementById('forgot-password-form');
const profileForm = document.getElementById('profile-form');
const avatarUpload = document.getElementById('avatar-upload');

// Bootstrap模态框实例
let loginModal, registerModal, verificationModal, forgotPasswordModal, profileModal, adminSettingsModal;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化Bootstrap模态框
    loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
    verificationModal = new bootstrap.Modal(document.getElementById('verificationModal'));
    forgotPasswordModal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
    profileModal = new bootstrap.Modal(document.getElementById('profileModal'));
    adminSettingsModal = new bootstrap.Modal(document.getElementById('adminSettingsModal'));
    
    // 检查用户是否已登录
    checkAuthStatus();
    
    // 事件监听器
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    verificationForm.addEventListener('submit', handleVerification);
    forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    profileForm.addEventListener('submit', handleProfileUpdate);
    logoutBtn.addEventListener('click', handleLogout);
    avatarUpload.addEventListener('change', handleAvatarUpload);
    
    // 管理员相关表单
    const emailSettingsForm = document.getElementById('email-settings-form');
    const apiSettingsForm = document.getElementById('api-settings-form');
    if (emailSettingsForm) emailSettingsForm.addEventListener('submit', handleEmailSettings);
    if (apiSettingsForm) apiSettingsForm.addEventListener('submit', handleApiSettings);
    
    // 导航链接事件
    setupNavigation();
});

// 设置导航
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.content-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // 移除所有活动状态
            navLinks.forEach(l => l.classList.remove('active'));
            contentSections.forEach(s => s.classList.add('d-none'));
            
            // 添加当前活动状态
            link.classList.add('active');
            
            // 显示对应内容
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.remove('d-none');
                
                // 如果是新闻部分，加载新闻
                if (targetId === 'news') {
                    loadNews();
                }
            }
        });
    });
}

// 检查用户认证状态
async function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (!token) {
        showAuthButtons();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            currentUser = userData;
            updateUserInterface(userData);
            
            // 如果是管理员，添加管理员菜单
            if (userData.isAdmin) {
                addAdminMenu();
                loadAdminData();
            }
        } else {
            // Token无效或过期
            localStorage.removeItem('token');
            showAuthButtons();
        }
    } catch (error) {
        console.error('检查认证状态失败:', error);
        showAuthButtons();
    }
}

// 处理登录
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateUserInterface(data.user);
            loginModal.hide();
            
            // 如果是管理员，添加管理员菜单
            if (data.user.isAdmin) {
                addAdminMenu();
                loadAdminData();
            }
            
            showAlert('登录成功', 'success');
        } else {
            const errorData = await response.json();
            showAlert(errorData.message || '登录失败，请检查邮箱和密码', 'danger');
        }
    } catch (error) {
        console.error('登录失败:', error);
        showAlert('登录失败，请稍后再试', 'danger');
    }
}

// 处理注册
async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    if (password !== confirmPassword) {
        showAlert('两次输入的密码不一致', 'danger');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        if (response.ok) {
            registerModal.hide();
            verificationModal.show();
            
            // 存储临时数据用于验证
            sessionStorage.setItem('pendingVerification', email);
            
            showAlert('注册成功，请查收验证邮件', 'success');
        } else {
            const errorData = await response.json();
            showAlert(errorData.message || '注册失败', 'danger');
        }
    } catch (error) {
        console.error('注册失败:', error);
        showAlert('注册失败，请稍后再试', 'danger');
    }
}

// 处理邮箱验证
async function handleVerification(e) {
    e.preventDefault();
    
    const code = document.getElementById('verification-code').value;
    const email = sessionStorage.getItem('pendingVerification');
    
    if (!email) {
        showAlert('验证会话已过期，请重新注册', 'danger');
        verificationModal.hide();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, code })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateUserInterface(data.user);
            verificationModal.hide();
            sessionStorage.removeItem('pendingVerification');
            
            showAlert('邮箱验证成功', 'success');
        } else {
            const errorData = await response.json();
            showAlert(errorData.message || '验证码无效', 'danger');
        }
    } catch (error) {
        console.error('验证失败:', error);
        showAlert('验证失败，请稍后再试', 'danger');
    }
}

// 处理忘记密码
async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('forgot-email').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        if (response.ok) {
            forgotPasswordModal.hide();
            showAlert('密码重置链接已发送到您的邮箱', 'success');
        } else {
            const errorData = await response.json();
            showAlert(errorData.message || '发送重置链接失败', 'danger');
        }
    } catch (error) {
        console.error('忘记密码请求失败:', error);
        showAlert('发送重置链接失败，请稍后再试', 'danger');
    }
}

// 处理个人资料更新
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    if (!currentUser) return;
    
    const username = document.getElementById('profile-username').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ username })
        });
        
        if (response.ok) {
            const updatedUser = await response.json();
            currentUser = updatedUser;
            updateUserInterface(updatedUser);
            profileModal.hide();
            
            showAlert('个人资料更新成功', 'success');
        } else {
            const errorData = await response.json();
            showAlert(errorData.message || '更新个人资料失败', 'danger');
        }
    } catch (error) {
        console.error('更新个人资料失败:', error);
        showAlert('更新个人资料失败，请稍后再试', 'danger');
    }
}

// 处理头像上传
async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // 检查文件类型
    if (!file.type.match('image.*')) {
        showAlert('请选择图片文件', 'danger');
        return;
    }
    
    // 检查文件大小 (最大2MB)
    if (file.size > 2 * 1024 * 1024) {
        showAlert('图片大小不能超过2MB', 'danger');
        return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/avatar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // 更新头像
            userAvatarElement.src = data.avatarUrl;
            profileAvatarElement.src = data.avatarUrl;
            
            showAlert('头像更新成功', 'success');
        } else {
            const errorData = await response.json();
            showAlert(errorData.message || '上传头像失败', 'danger');
        }
    } catch (error) {
        console.error('上传头像失败:', error);
        showAlert('上传头像失败，请稍后再试', 'danger');
    }
}

// 处理退出登录
function handleLogout() {
    localStorage.removeItem('token');
    currentUser = null;
    showAuthButtons();
    
    // 移除管理员菜单
    removeAdminMenu();
    
    showAlert('已退出登录', 'info');
}

// 更新用户界面
function updateUserInterface(user) {
    if (user) {
        // 隐藏登录/注册按钮，显示用户信息
        authButtons.classList.add('d-none');
        userProfile.classList.remove('d-none');
        
        // 更新用户名和头像
        usernameElement.textContent = user.username;
        if (user.avatarUrl) {
            userAvatarElement.src = user.avatarUrl;
            profileAvatarElement.src = user.avatarUrl;
        }
        
        // 更新个人资料表单
        profileUsernameElement.value = user.username;
        profileEmailElement.value = user.email;
    }
}

// 显示登录/注册按钮
function showAuthButtons() {
    authButtons.classList.remove('d-none');
    userProfile.classList.add('d-none');
}

// 添加管理员菜单
function addAdminMenu() {
    // 检查是否已存在管理员菜单项
    if (document.querySelector('.admin-menu-item')) return;
    
    const dropdownMenu = document.querySelector('#userDropdown + .dropdown-menu');
    if (dropdownMenu) {
        // 在退出登录前添加管理员设置选项
        const adminMenuItem = document.createElement('li');
        adminMenuItem.className = 'admin-menu-item';
        adminMenuItem.innerHTML = `<a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#adminSettingsModal">管理员设置</a>`;
        
        const logoutItem = document.querySelector('#logout-btn').parentNode;
        dropdownMenu.insertBefore(adminMenuItem, logoutItem);
    }
}

// 移除管理员菜单
function removeAdminMenu() {
    const adminMenuItem = document.querySelector('.admin-menu-item');
    if (adminMenuItem) {
        adminMenuItem.remove();
    }
}

// 加载管理员数据
async function loadAdminData() {
    try {
        // 加载邮件设置
        const emailResponse = await fetch(`${API_BASE_URL}/admin/email-settings`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (emailResponse.ok) {
            const emailSettings = await emailResponse.json();
            document.getElementById('email-service').value = emailSettings.service || 'smtp';
            document.getElementById('email-host').value = emailSettings.host || '';
            document.getElementById('email-port').value = emailSettings.port || '';
            document.getElementById('email-user').value = emailSettings.user || '';
            // 不显示密码
        }
        
        // 加载API设置
        const apiResponse = await fetch(`${API_BASE_URL}/admin/api-settings`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (apiResponse.ok) {
            const apiSettings = await apiResponse.json();
            document.getElementById('weather-api-key').value = apiSettings.weatherApiKey || '';
            document.getElementById('news-api-key').value = apiSettings.newsApiKey || '';
        }
        
        // 加载用户列表
        loadUsersList();
    } catch (error) {
        console.error('加载管理员数据失败:', error);
    }
}

// 加载用户列表
async function loadUsersList() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const users = await response.json();
            const tableBody = document.getElementById('users-table-body');
            tableBody.innerHTML = '';
            
            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>${new Date(user.createdAt).toLocaleString()}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user._id}')">删除</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('加载用户列表失败:', error);
    }
}

// 删除用户
async function deleteUser(userId) {
    if (!confirm('确定要删除此用户吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showAlert('用户已删除', 'success');
            loadUsersList();
        } else {
            const errorData = await response.json();
            showAlert(errorData.message || '删除用户失败', 'danger');
        }
    } catch (error) {
        console.error('删除用户失败:', error);
        showAlert('删除用户失败，请稍后再试', 'danger');
    }
}

// 处理邮件设置更新
async function handleEmailSettings(e) {
    e.preventDefault();
    
    const service = document.getElementById('email-service').value;
    const host = document.getElementById('email-host').value;
    const port = document.getElementById('email-port').value;
    const user = document.getElementById('email-user').value;
    const pass = document.getElementById('email-pass').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/email-settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ service, host, port, user, pass })
        });
        
        if (response.ok) {
            showAlert('邮件设置已更新', 'success');
        } else {
            const errorData = await response.json();
            showAlert(errorData.message || '更新邮件设置失败', 'danger');
        }
    } catch (error) {
        console.error('更新邮件设置失败:', error);
        showAlert('更新邮件设置失败，请稍后再试', 'danger');
    }
}

// 处理API设置更新
async function handleApiSettings(e) {
    e.preventDefault();
    
    const weatherApiKey = document.getElementById('weather-api-key').value;
    const newsApiKey = document.getElementById('news-api-key').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/api-settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ weatherApiKey, newsApiKey })
        });
        
        if (response.ok) {
            showAlert('API设置已更新', 'success');
        } else {
            const errorData = await response.json();
            showAlert(errorData.message || '更新API设置失败', 'danger');
        }
    } catch (error) {
        console.error('更新API设置失败:', error);
        showAlert('更新API设置失败，请稍后再试', 'danger');
    }
}

// 显示提示信息
function showAlert(message, type) {
    // 检查是否已存在提示框
    let alertContainer = document.querySelector('.alert-container');
    
    if (!alertContainer) {
        // 创建提示框容器
        alertContainer = document.createElement('div');
        alertContainer.className = 'alert-container';
        document.body.appendChild(alertContainer);
    }
    
    // 创建提示框
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // 添加到容器
    alertContainer.appendChild(alert);
    
    // 自动关闭
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => {
            alert.remove();
        }, 150);
    }, 3000);
}

// 暴露给全局的函数
window.deleteUser = deleteUser;
