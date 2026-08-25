/**
 * THE 90I NEWS - Core Engine & Cloud Sync
 */
const CONFIG = {
  DATA_PATH: 'data/90i-data.json',
  DEFAULT_REPO: 'Ku7',
  DEFAULT_OWNER: 'md-sakib-raza',
  DEFAULT_BRANCH: 'main'
};

let APP_STATE = {
  news: [],
  gallery: [],
  videos: [],
  contacts: [],
  categories: [],
  settings: {}
};

async function loadData() {
  try {
    const res = await fetch(`${CONFIG.DATA_PATH}?v=${new Date().getTime()}`);
    if (!res.ok) throw new Error("Fetch failed");
    const data = await res.json();
    APP_STATE.news = data['90i_news'] || [];
    APP_STATE.gallery = data['90i_gallery'] || [];
    APP_STATE.videos = data['90i_videos'] || [];
    APP_STATE.contacts = data['90i_contacts'] || [];
    APP_STATE.categories = data['90i_categories'] || [];
    APP_STATE.settings = data['90i_settings'] || {};
    return APP_STATE;
  } catch (err) {
    const cached = localStorage.getItem('90i_offline_cache');
    if (cached) return JSON.parse(cached);
    return null;
  }
}

function utf8ToBase64(str) {
  return window.btoa(unescape(encodeURIComponent(str)));
}

async function syncToGitHub(updatedData, token) {
  const owner = localStorage.getItem('90i_gh_owner') || CONFIG.DEFAULT_OWNER;
  const repo = localStorage.getItem('90i_gh_repo') || CONFIG.DEFAULT_REPO;
  const branch = localStorage.getItem('90i_gh_branch') || CONFIG.DEFAULT_BRANCH;
  const path = 'data/90i-data.json';

  const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const getRes = await fetch(getUrl, {
    headers: { 
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  
  let sha = null;
  if (getRes.ok) {
    const fileInfo = await getRes.json();
    sha = fileInfo.sha;
  } else {
    const errInfo = await getRes.json();
    throw new Error(errInfo.message || 'Repo connectivity error');
  }

  const jsonString = JSON.stringify(updatedData, null, 2);
  const contentEncoded = utf8ToBase64(jsonString);
  const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  
  const body = {
    message: `CMS Update [${new Date().toISOString()}]`,
    content: contentEncoded,
    branch: branch
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json'
    },
    body: JSON.stringify(body)
  });

  if (!putRes.ok) {
    const errObj = await putRes.json();
    throw new Error(errObj.message || "Failed to commit");
  }
  return true;
}

function generateSlug(text) {
  if (!text) return `news-${Date.now()}`;
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\u0900-\u097F\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `news-${Date.now()}`;
}

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

