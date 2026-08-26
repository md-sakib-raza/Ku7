/**
 * THE 90I NEWS - Main Reader & Sync Engine
 */

async function getLiveNewsData() {
  try {
    const res = await fetch('data/90i-data.json?_t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      return data['90i_news'] || [];
    }
  } catch (err) {}
  
  const localBackup = localStorage.getItem('90i_local_news_data');
  if (localBackup) {
    try {
      const parsed = JSON.parse(localBackup);
      return parsed['90i_news'] || [];
    } catch(e) {}
  }
  return [];
}

async function renderHomePageArticles() {
  const newsList = await getLiveNewsData();
  const tickerEl = document.getElementById('breakingTickerContent');
  const leadStoryEl = document.getElementById('leadStoryContainer');
  const newsGridEl = document.getElementById('recentNewsGrid');

  if (tickerEl && newsList.length > 0) {
    const breaking = newsList.filter(n => n.breaking);
    if (breaking.length > 0) {
      tickerEl.innerHTML = breaking.map(n => `<span style="margin-right:25px;">🔴 <b>${n.title}</b></span>`).join('');
    }
  }

  if (leadStoryEl && newsList.length > 0) {
    const lead = newsList[0];
    leadStoryEl.innerHTML = `
      <div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; background:#fff;">
        ${lead.image ? `<img src="${lead.image}" style="width:100%; max-height:400px; object-fit:cover;">` : ''}
        <div style="padding:20px;">
          <span style="background:#dc2626; color:#fff; padding:4px 8px; font-size:12px; font-weight:bold; border-radius:3px;">${lead.category}</span>
          <h2 style="margin-top:10px; font-size:22px;"><a href="${lead.permalink || '#'}" style="text-decoration:none; color:#111;">${lead.title}</a></h2>
          <p style="color:#666; margin-top:8px;">${lead.excerpt || ''}</p>
        </div>
      </div>
    `;
  }

  if (newsGridEl && newsList.length > 1) {
    newsGridEl.innerHTML = newsList.slice(1).map(n => `
      <div style="border:1px solid #e2e8f0; border-radius:6px; padding:15px; background:#fff; margin-bottom:15px;">
        <span style="color:#dc2626; font-size:12px; font-weight:bold;">${n.category}</span>
        <h4 style="margin:6px 0;"><a href="${n.permalink || '#'}" style="text-decoration:none; color:#111;">${n.title}</a></h4>
        <p style="font-size:13px; color:#555;">${n.excerpt || ''}</p>
      </div>
    `).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderHomePageArticles();
});
