/**
 * THE 90I NEWS - Core Engine & Authentication Script
 */

const AUTH_CONFIG = {
  email: "mdsakibraza.066@gmail.com",
  pass: "changeme1238"
};

// --- Authentication Engine ---
function handleAuthSubmit(event) {
  if (event) event.preventDefault();
  
  const emailField = document.getElementById('loginEmail') || document.getElementById('uEmail') || document.getElementById('adminUser');
  const passField = document.getElementById('loginPassword') || document.getElementById('uPass') || document.getElementById('adminPass');

  const emailVal = emailField ? emailField.value.trim().toLowerCase() : '';
  const passVal = passField ? passField.value.trim() : '';

  if (emailVal === AUTH_CONFIG.email.toLowerCase() && passVal === AUTH_CONFIG.pass) {
    localStorage.setItem('90i_auth_session', 'AUTHENTICATED_SECURE');
    
    // Check if dashboard div is on same page or redirect
    const dashEl = document.getElementById('dashboardView') || document.getElementById('adminScreen');
    const loginEl = document.getElementById('loginScreen') || document.getElementById('loginView');

    if (dashEl && loginEl) {
      loginEl.style.display = 'none';
      dashEl.style.display = 'grid';
      loadAdminNewsList();
      loadInboxList();
    } else {
      window.location.href = "dashboard.html";
    }
  } else {
    alert("❌ गलत ईमेल या पासवर्ड! कृपया दोबारा जांचें।");
  }
}

function doLogout() {
  localStorage.removeItem('90i_auth_session');
  window.location.href = "admin.html";
}

// --- Data Fetching Engine ---
async function loadData() {
  try {
    const res = await fetch('data/90i-data.json?_nocache=' + Date.now());
    if (!res.ok) return { news: [], contacts: [] };
    const data = await res.json();
    return {
      news: data['90i_news'] || [],
      contacts: data['90i_contacts'] || []
    };
  } catch (e) {
    return { news: [], contacts: [] };
  }
}

function utf8ToBase64(str) {
  return window.btoa(unescape(encodeURIComponent(str)));
}

// --- GitHub Sync Engine ---
async function syncToGitHub(updatedData, token) {
  const owner = (localStorage.getItem('90i_gh_owner') || 'md-sakib-raza').trim();
  const repo = (localStorage.getItem('90i_gh_repo') || 'Ku7').trim();
  const path = 'data/90i-data.json';
  const cleanToken = (token || localStorage.getItem('90i_gh_token') || '').trim();

  if (!cleanToken) throw new Error("GitHub Token Missing!");

  const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=main&_nocache=${Date.now()}`;
  const getRes = await fetch(getUrl, {
    headers: { 'Authorization': `token ${cleanToken}`, 'Accept': 'application/vnd.github.v3+json' }
  });
  
  let sha = null;
  if (getRes.ok) {
    const fileInfo = await getRes.json();
    sha = fileInfo.sha;
  }

  const jsonString = JSON.stringify(updatedData, null, 2);
  const contentEncoded = utf8ToBase64(jsonString);
  const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  
  const body = {
    message: `CMS Update [${new Date().toISOString()}]`,
    content: contentEncoded,
    branch: 'main'
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${cleanToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json'
    },
    body: JSON.stringify(body)
  });

  if (!putRes.ok) {
    const errObj = await putRes.json();
    throw new Error(errObj.message || "Commit failed");
  }
  return true;
}

// --- Tab Switching ---
function showTab(tabName) {
  const tabs = ['addNews', 'manageNews', 'inboxMessages', 'cloudSettings'];
  tabs.forEach(t => {
    const el = document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (el) el.style.display = (t === tabName) ? 'block' : 'none';
  });
}

// --- Slug & Helper Tools ---
function autoGenerateSlug() {
  if (document.getElementById('editArticleId') && document.getElementById('editArticleId').value) return; 
  const title = document.getElementById('newsTitle').value;
  const clean = title.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '-');
  const slugInput = document.getElementById('newsSlug');
  if (slugInput) {
    slugInput.value = clean ? clean + '-' + Date.now().toString().slice(-4) : 'news-' + Date.now().toString().slice(-6);
  }
}

function formatDoc(cmd) {
  document.execCommand(cmd, false, null);
}

function previewSelectedImage(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById('newsImgPreview');
      if (preview) {
        preview.src = e.target.result;
        preview.style.display = 'block';
      }
      const dataInput = document.getElementById('newsImageData');
      if (dataInput) dataInput.value = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

// --- News Publisher Engine ---
async function handlePublishOrUpdateNews(e) {
  if (e) e.preventDefault();
  const token = (localStorage.getItem('90i_gh_token') || '').trim();
  if (!token) {
    alert("पहले 'GitHub क्लाउड सेटिंग्स' में अपना टोकन दर्ज करें!");
    showTab('cloudSettings');
    return;
  }

  const titleEl = document.getElementById('newsTitle');
  const title = titleEl ? titleEl.value.trim() : '';
  if (!title) {
    alert("कृपया समाचार का शीर्षक दर्ज करें!");
    return;
  }

  const imageFile = document.getElementById('newsImageData') ? document.getElementById('newsImageData').value : '';
  if (!imageFile) {
    alert("कृपया मुख्य फ़ोटो अपलोड करें!");
    return;
  }

  const editId = document.getElementById('editArticleId').value;
  const slug = document.getElementById('newsSlug').value;
  const category = document.getElementById('newsCategory').value;
  const author = document.getElementById('newsAuthor').value;
  const tags = document.getElementById('newsTags').value.split(',').map(t => t.trim()).filter(Boolean);
  const excerpt = document.getElementById('newsExcerpt').value;
  const imageCaption = document.getElementById('newsImageCaption').value;
  const content = document.getElementById('richEditor').innerHTML;
  const breaking = document.getElementById('newsBreaking').checked;
  const featured = document.getElementById('newsFeatured').checked;
  const seoTitle = document.getElementById('newsSeoTitle').value || title;
  const seoDescription = document.getElementById('newsSeoDesc').value || excerpt;
  const seoKeywords = document.getElementById('newsSeoKeywords').value;

  let currentData = await loadData();
  currentData['90i_news'] = currentData.news || [];

  if (editId) {
    const index = currentData['90i_news'].findIndex(n => String(n.id) === String(editId));
    if (index !== -1) {
      currentData['90i_news'][index] = {
        ...currentData['90i_news'][index],
        title, slug, category, author, tags, excerpt,
        image: imageFile, imageCaption, content,
        breaking, featured, seoTitle, seoDescription, seoKeywords,
        permalink: 'article.html?slug=' + slug
      };
    }
  } else {
    const newArticle = {
      id: Date.now(),
      title, slug, category, author, tags, excerpt,
      image: imageFile, imageCaption, content,
      breaking, featured, seoTitle, seoDescription, seoKeywords,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      permalink: 'article.html?slug=' + slug
    };
    currentData['90i_news'].unshift(newArticle);
  }

  try {
    await syncToGitHub(currentData, token);
    alert(editId ? "संशोधन (Correction) सुरक्षित हो गया!" : "समाचार सफलतापूर्वक प्रकाशित हो गया!");
    cancelEditMode();
    loadAdminNewsList();
    showTab('manageNews');
  } catch (err) {
    alert("क्लाउड सिंक विफल: " + err.message);
  }
}

// --- Admin Panel Lists ---
async function loadAdminNewsList() {
  const data = await loadData();
  const tbody = document.getElementById('newsTableBody');
  if (!tbody || !data || !data.news) return;
  tbody.innerHTML = data.news.map(n => `
    <tr>
      <td><strong>${n.title}</strong></td>
      <td>${n.category}</td>
      <td>${n.date}</td>
      <td style="white-space:nowrap;">
        <button type="button" class="btn-edit" onclick="startEditNews(${n.id})">✏️ संपादित करें</button>
        <button type="button" class="btn-del" onclick="deleteNews(${n.id})">🗑️ हटाएं</button>
      </td>
    </tr>
  `).join('');
}

async function startEditNews(id) {
  const data = await loadData();
  const article = (data.news || []).find(n => n.id === id);
  if (!article) return;

  document.getElementById('editArticleId').value = article.id;
  document.getElementById('newsTitle').value = article.title;
  document.getElementById('newsSlug').value = article.slug;
  document.getElementById('newsCategory').value = article.category;
  document.getElementById('newsAuthor').value = article.author || '90I डिजिटल डेस्क';
  document.getElementById('newsTags').value = (article.tags || []).join(', ');
  document.getElementById('newsExcerpt').value = article.excerpt;
  document.getElementById('newsImageCaption').value = article.imageCaption || '';
  document.getElementById('newsSeoTitle').value = article.seoTitle || '';
  document.getElementById('newsSeoDesc').value = article.seoDescription || '';
  document.getElementById('newsSeoKeywords').value = article.seoKeywords || '';
  document.getElementById('richEditor').innerHTML = article.content || '';
  document.getElementById('newsBreaking').checked = !!article.breaking;
  document.getElementById('newsFeatured').checked = !!article.featured;

  if (article.image) {
    document.getElementById('newsImageData').value = article.image;
    const preview = document.getElementById('newsImgPreview');
    if (preview) {
      preview.src = article.image;
      preview.style.display = 'block';
    }
  }

  document.getElementById('formHeading').innerText = "समाचार में संशोधन करें (Correction / Edit)";
  document.getElementById('submitBtn').innerText = "💾 अपडेट सुरक्षित करें (Save Correction)";
  document.getElementById('cancelEditBtn').style.display = "inline-block";

  showTab('addNews');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEditMode() {
  document.getElementById('editArticleId').value = '';
  document.getElementById('newsTitle').value = '';
  document.getElementById('newsSlug').value = '';
  document.getElementById('newsExcerpt').value = '';
  document.getElementById('richEditor').innerHTML = '';
  const preview = document.getElementById('newsImgPreview');
  if (preview) preview.style.display = 'none';
  document.getElementById('newsImageData').value = '';
  document.getElementById('formHeading').innerText = "नया समाचार प्रकाशित करें";
  document.getElementById('submitBtn').innerText = "🚀 क्लाउड पर प्रकाशित करें (Publish)";
  document.getElementById('cancelEditBtn').style.display = "none";
}

async function deleteNews(id) {
  if (!confirm("क्या आप वाकई इस लेख को हटाना चाहते हैं?")) return;
  const token = localStorage.getItem('90i_gh_token');
  const data = await loadData();
  data['90i_news'] = (data.news || []).filter(n => n.id !== id);
  await syncToGitHub(data, token);
  alert("समाचार हटा दिया गया!");
  loadAdminNewsList();
}

async function loadInboxList() {
  const data = await loadData();
  const tbody = document.getElementById('inboxTableBody');
  if (!tbody || !data || !data.contacts || data.contacts.length === 0) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="4">कोई नया संदेश नहीं है।</td></tr>';
    return;
  }
  tbody.innerHTML = data.contacts.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.contact || ''}</td>
      <td>${c.message}</td>
      <td>${c.date || ''}</td>
    </tr>
  `).join('');
}

function saveCloudSettings() {
  localStorage.setItem('90i_gh_token', document.getElementById('ghToken').value.trim());
  localStorage.setItem('90i_gh_owner', document.getElementById('ghOwner').value.trim());
  localStorage.setItem('90i_gh_repo', document.getElementById('ghRepo').value.trim());
  alert("क्लाउड सेटिंग्स सुरक्षित हो गईं!");
}

function formatDateHindi(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}
