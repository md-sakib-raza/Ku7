/**
 * THE 90I NEWS - Core Frontend & Cloud Sync Engine
 */
const CONFIG = {
  DATA_PATH: 'data/90i-data.json',
  DEFAULT_REPO: 'Kxj',
  DEFAULT_OWNER: 'md-sakib-raza',
  DEFAULT_BRANCH: 'main'
};

// Global Store
let APP_STATE = {
  news: [],
  gallery: [],
  videos: [],
  contacts: [],
  categories: [],
  settings: {}
};

// Helper: Fetch Cloud Data
async function loadData() {
  try {
    const res = await fetch(`${CONFIG.DATA_PATH}?v=${new Date().getTime()}`);
    if (!res.ok) throw new Error("Data fetch failed");
    const data = await res.json();
    APP_STATE.news = data['90i_news'] || [];
    APP_STATE.gallery = data['90i_gallery'] || [];
    APP_STATE.videos = data['90i_videos'] || [];
    APP_STATE.contacts = data['90i_contacts'] || [];
    APP_STATE.categories = data['90i_categories'] || [];
    APP_STATE.settings = data['90i_settings'] || {};
    return APP_STATE;
  } catch (err) {
    console.warn("Using offline / fallback storage if available", err);
    const cached = localStorage.getItem('90i_offline_cache');
    if (cached) {
      APP_STATE = JSON.parse(cached);
      return APP_STATE;
    }
    return null;
  }
}

// GitHub Contents API: Publish / Update Data
async function syncToGitHub(updatedData, token) {
  const owner = localStorage.getItem('90i_gh_owner') || CONFIG.DEFAULT_OWNER;
  const repo = localStorage.getItem('90i_gh_repo') || CONFIG.DEFAULT_REPO;
  const branch = localStorage.getItem('90i_gh_branch') || CONFIG.DEFAULT_BRANCH;
  const path = 'data/90i-data.json';

  // 1. Fetch current file SHA
  const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const getRes = await fetch(getUrl, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  let sha = null;
  if (getRes.ok) {
    const fileInfo = await getRes.json();
    sha = fileInfo.sha;
  }

  // 2. Prepare payload
  const contentEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(updatedData, null, 2))));
  const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  
  const body = {
    message: `CMS Update [${new Date().toISOString()}]`,
    content: contentEncoded,
    branch: branch
  };
  if (sha) body.sha = sha;

  // 3. Commit update
  const putRes = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!putRes.ok) {
    const errObj = await putRes.json();
    throw new Error(errObj.message || "Failed to commit to GitHub repository");
  }
  return true;
}

// Utility: Generate Clean SEO Slug
function generateSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `news-${Date.now()}`;
}

// Utility: Safe HTML Sanitizer
function sanitizeHtml(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const allowedTags = ['B', 'STRONG', 'I', 'EM', 'U', 'P', 'DIV', 'BR', 'SPAN'];
  
  function clean(node) {
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      const child = node.childNodes[i];
      if (child.nodeType === 1) {
        if (!allowedTags.includes(child.nodeName)) {
          node.removeChild(child);
        } else {
          clean(child);
        }
      }
    }
  }
  clean(temp);
  return temp.innerHTML;
}

// Global Date Formatter (Hindi)
function formatDateHindi(dateStr) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('hi-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}

// Theme Handling
function initTheme() {
  const current = localStorage.getItem('90i_theme') || 'light';
  document.documentElement.setAttribute('data-theme', current);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', current);
  localStorage.setItem('90i_theme', current);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
});
    
