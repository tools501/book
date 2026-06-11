let data = [];
let currentData = [];
let authToken = '';
let visibleCount = 30;
let STATUS_LABELS = {};
let FIELD_LABELS = {};
let FIELD_ORDER = [];
let RANKS = {};
let RANK_ALIAS = {};
let MARKS = [];

function updateDashboard(items) {
  const shps = items.filter(i => i.status === 'A1').length;
  const rozp = items.filter(i => i.status === 'B2').length;

  const total = shps + rozp;

  const shpsPercent = total ? (shps / total) * 100 : 0;

  const chart = document.getElementById('chart');

  chart.style.background = `
    conic-gradient(
      green 0% ${shpsPercent}%,
      orange ${shpsPercent}% 100%
    )
  `;

  document.getElementById('total-count').innerText = total;
  document.getElementById('shps-count').innerText = shps;
  document.getElementById('rozp-count').innerText = rozp;
}

function groupBirthdays(items) {
  const map = {};

  items.forEach(i => {
    if (!map[i.date]) {
      map[i.date] = [];
    }
    map[i.date].push(i);
  });

  return map;
}

function handleCredentialResponse(response) {
  if (!response?.credential) {
    console.error('No token');
    return;
  }

  document.getElementById('loader').style.display = 'flex';

  authToken = response.credential;
  loadData(authToken);
}

function showError(title, text='') {
  stopLoaderDots();

  document.getElementById('loader').style.display = 'none';
  document.getElementById('loginPage').style.display = 'none';

  document.getElementById('errorTitle').innerText = title;
  document.getElementById('errorText').innerText = text;

  document.getElementById('error').style.display = 'block';
}

function getCardLabel(item) {
  const raw =
    item?.all?.['f11'] ||
    item?.all?.['статус'];

  if (!raw) return '';

  const str = String(raw).trim();

  const maxLen = 10;

  const text = str.length > maxLen
    ? str.slice(0, maxLen) + '...'
    : str;

  return {
    text,
    isSZCH: str.toLowerCase().includes('сзч')
  };
}

function updateMarksChart(items) {
  const target = MARKS.map(m => m.key);

  const counts = Object.fromEntries(
    target.map(t => [t, 0])
  );

  items.forEach(item => {
    const raw = item.all?.['f11'];
    const val = typeof raw === 'string' ? raw.toLowerCase() : '';

    target.forEach(t => {
      if (val.includes(t)) {
        counts[t]++;
      }
    });
  });

  renderMarksChart(counts);
}

function renderMarksChart(counts) {
  const container = document.getElementById('marksChart');

  const max = Math.max(...Object.values(counts), 1);

  const MARKS_MAP = Object.fromEntries(
    MARKS.map(m => [m.key, m.label])
  );

  container.innerHTML = Object.entries(counts)
    .map(([key, val]) => {
      const percent = (val / max) * 100;

      const label = MARKS_MAP[key] || key;

      return `
        <div style="margin-bottom:6px;">
          <div style="font-size:12px;">${label} (${val})</div>
          <div style="
            height:8px;
            background:#eee;
            border-radius:4px;
            overflow:hidden;
          ">
            <div style="
              width:${percent}%;
              height:100%;
              background:#3498db;
            "></div>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderBirthdays(items) {
  const container = document.getElementById('birthdaysBlock');

  if (!items || !items.length) {
    container.innerHTML = '';
    return;
  }

  const today = items.filter(i => i.isToday);
  const other = items.filter(i => !i.isToday);

  const todayHTML = today.length ? `
  <div class="today-block ui-today">

    <div class="today-title-row">
      <div class="today-title">
        🥳 Сьогодні (${today.length})
      </div>
    
      <div class="today-date">
        ${window.todayDateShort}
      </div>
    </div>

    <div class="today-list ui-list">
      ${today.map((p, i) => `
        <div class="today-item ${i >= 3 ? 'today-hidden' : ''}"
             style="${i >= 3 ? 'display:none;' : ''}">
          <span class="today-dot"></span>
          <span>
            ${p.pib}
            ${p.age ? `<span class="age-badge">(${p.age})</span>` : ""}
          </span>
        </div>
      `).join('')}
    </div>
    
    ${today.length > 3 ? `
      <div class="today-more" onclick="expandToday(this)">
        + ще ${today.length - 3}
      </div>
    ` : ''}

  </div>
` : `
  <div class="today-block ui-today">

    <div class="today-title-row">
      <div class="today-title">
        Сьогодні немає 🎉
      </div>

      <div class="today-date">
        ${window.todayDateShort}
      </div>
    </div>
  </div>
`;

  const grouped = groupBirthdays(other);

  const dates = Object.keys(grouped)
  .sort((a, b) => {
    const [d1, m1] = a.split('.').map(Number);
    const [d2, m2] = b.split('.').map(Number);
    return m1 !== m2 ? m1 - m2 : d1 - d2;
  });
  
  const rangeTitle = dates.length
    ? `${dates[0]} – ${dates[dates.length - 1]}`
    : '';
  
  const otherHTML = `
    <div style="
      background:transparent;
      padding:8px 2px 4px;
    ">
  
      <div onclick="toggleDay(this)" class="bd-header">
        <div class="bd-left">
          📅 ${rangeTitle}
        </div>
  
        <div class="bd-right">
          <span class="bd-count">${other.length}</span>
          <span class="bd-arrow">▼</span>
        </div>
      </div>
  
      <div class="bd-content ui-scroll">
  
        ${dates.map(date => {
          const list = grouped[date];
          return `
            <div style="margin-bottom:6px;">
              <div class="bd-date">
                ${date}
              </div>
              ${list.map(p => `
                <div class="bd-name ui-item">
                  ${p.pib}
                  ${p.age ? `<span class="age-badge">(${p.age})</span>` : ""}
                </div>
              `).join('')}
            </div>
          `;
        }).join('')}
  
      </div>
  
    </div>
  `;

  container.innerHTML = `
    <div class="dash-card">
      ${todayHTML}
      ${otherHTML}
    </div>
  `;
}

function expandToday(el) {
  const block = el.closest('.today-block');
  const list = block.querySelector('.today-list');

  const hidden = block.querySelectorAll('.today-hidden');
  hidden.forEach(item => item.style.display = 'flex');

  list.classList.add('open');

  el.remove();
}

function toggleDay(el) {

  const content =
    el.nextElementSibling;

  const arrow =
    el.querySelector('.bd-arrow');

  const isOpen =
    content.classList.contains('open');

  if (isOpen) {

    content.style.maxHeight = '0px';
    content.style.overflowY = 'hidden';

    content.classList.remove('open');

    arrow.style.transform = 'rotate(0deg)';

  } else {

    content.classList.add('open');

    content.style.maxHeight = '200px';
    content.style.overflowY = 'auto';

    arrow.style.transform = 'rotate(180deg)';
  }
}

function initAutoHideScroll() {
  if (window.innerWidth < 769) return;

  const blocks = document.querySelectorAll('.today-list.open, .bd-content');

  blocks.forEach(block => {
    let timer;

    block.addEventListener('scroll', () => {
      block.classList.add('show-scroll');

      clearTimeout(timer);

      timer = setTimeout(() => {
        block.classList.remove('show-scroll');
      }, 1800);
    });
  });
}

function highlightSZCH(text) {
  if (!text) return text;

  return String(text).replace(/(^|[^а-яіїєґa-z])(сзч)(?=[^а-яіїєґa-z]|$)/gi, (match, p1, p2) => {
    return `${p1}<span style="color:red; font-weight:bold;">${p2}</span>`;
  });
}

function copyText(text) {
  navigator.clipboard.writeText(text);
  showToast('Скопійовано');
}

function showToast(message) {
  const el = document.createElement('div');
  el.innerText = message;

  el.style = `
    position:fixed;
    bottom:20px;
    left:50%;
    transform:translateX(-50%);
    background:#333;
    color:#fff;
    padding:10px 16px;
    border-radius:8px;
    font-size:14px;
    opacity:0;
    transition:opacity 0.3s;
    z-index:9999;
  `;

  document.body.appendChild(el);

  setTimeout(() => el.style.opacity = '1', 10);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 1500);
}

function getRankImage(item) {
  const rank = String(item?.all?.f8 || '')
    .trim()
    .toLowerCase();

  if (!rank) return '';

  if (RANKS[rank]) {
    return RANKS[rank];
  }

  // alias
  const alias = RANK_ALIAS[rank];
  if (alias && RANKS[alias]) {
    return RANKS[alias];
  }

  return '';
}

function render(items, append = false) {
  const list = document.getElementById('list');
  

  if (!append) {
    list.innerHTML = '';
  }

  items.forEach((item) => {
    if (item.ordersLoaded === undefined) {
      item.ordersLoaded = false;
      item.ordersLoading = false;
      item.orders = [];
      item.view = 'details';
    }
    const div = document.createElement('div');
    div.className = 'card';
    div.dataset.index = currentData.indexOf(item);
    const labelData = getCardLabel(item);
    const showRank =
      item.status === 'A1' &&
      String(item?.all?.f11 || '').toLowerCase() !== 'сзч';
    
    const rankImage = showRank
      ? getRankImage(item)
      : '';

    div.innerHTML = `
      ${rankImage ? `
        <img
          class="card-rank"
          src="${rankImage}"
          alt="">
      ` : ''}
    
      <div class="card-header">
        <div class="name">${item.pib}</div>
        ${labelData ? `
          <div class="card-label ${labelData.isSZCH ? 'szch' : ''}">
            ${labelData.text}
          </div>
        ` : ''}
      </div>
    
      <div>${FIELD_LABELS['f12']}: ${item.f12}</div>
      <div>${FIELD_LABELS['f13']}: ${item.f13}</div>
      <div class="status" data-status="${item.status}">
        ${STATUS_LABELS[item.status] || item.status}
      </div>
    
      <div class="button-group">
        <button class="action-btn" onclick="toggle(this, 'details')">
          Детальніше
        </button>
      
        <button class="action-btn orders-btn" onclick="toggle(this, 'orders')">
          📄 Стройові${item.ordersLoaded ? ` (${item.orders.length})` : ''}
        </button>

        <button class="action-btn social-btn" onclick="toggle(this, 'social')">
          🗂️ Соц. дані
        </button>
      
        <button
          class="copy-all-btn"
          style="display:none;"
          title="Копіювати все"
        >
          <span class="copy-icon">📋</span>
        </button>
      </div>
    
      <div class="details"></div>
    `;
    list.appendChild(div);
  });
}

function buildDetailsHTML(item) {
  const data = item.all || {};

  const firstFields = FIELD_ORDER;

  const allKeys = Object.keys(data);

  const ordered = firstFields.filter(k => allKeys.includes(k));
  const rest = allKeys.filter(k => !firstFields.includes(k));

  const finalKeys = [...ordered, ...rest];

  return finalKeys.map(k => {
    const rawValue = data[k];
    let v = highlightSZCH(rawValue);
    
    if (v === null || v === undefined || v === '') return '';
    
    v = String(v).replace(/\r?\n/g, '<br>');

    const displayKey = (FIELD_LABELS[k] || k).replace(/\r?\n/g, ' ');

    const keyHTML = k === 'ТВО'
      ? `<span class="detail-key" style="color:#2ecc71; font-weight:bold;">${displayKey}</span>`
      : `<span class="detail-key">${displayKey}</span>`;

    return `
      <div class="detail-row">
        ${keyHTML}
        <div class="detail-value">
          <span class="copy-text">${v}</span>
          <button class="copy-btn" data-text="${encodeURIComponent(rawValue)}">
            📋
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function getSearchCount() {
  return document.getElementById('searchCount');
}

function renderOrdersHTML(orders) {
  if (!orders || !orders.length) {
    return `
      <div class="orders-empty">
        📭 Дані відсутні
      </div>
    `;
  }

  return `
    <div class="orders-list">
      ${orders.map(order => `
        <div class="order-card">
          <div class="order-head">

            ${
              order.file?.url
                ? `
                  <a
                    href="${order.file.url}"
                    target="_blank"
                    class="order-link"
                    title="Відкрити файл наказу"
                  >
                    📄 Наказ №${order.orderNumber}
                    <span class="order-link-icon">↗</span>
                  </a>
                `
                : `
                  <span>📄 Наказ №${order.orderNumber}</span>
                `
            }

            <div class="order-right">
              <span>${order.date}</span>

              <button
                class="copy-btn order-copy-btn"
                data-order="${encodeURIComponent(
                  `Наказ №${order.orderNumber} від ${order.date}\n\n${order.title}\n\n${order.text}`
                )}"
              >
                📋
              </button>
            </div>

          </div>

          <div class="order-title">
            ${order.title}
          </div>

          <div class="order-text">
            ${order.text}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSocialHTML(social) {

  if (!social?.found) {
    return `
      <div class="orders-empty">
        🗂️ Соціальні дані відсутні
      </div>
    `;
  }

  const data = social.data || {};

  const photoLink = data['Лінк на фото'] || '';

  let photoUrl = '';

  const match = photoLink.match(/\/d\/([^/]+)/);

  if (match?.[1]) {
    photoUrl =
      `https://lh3.googleusercontent.com/d/${match[1]}=w400`;
  }

  const filteredEntries =
    Object.entries(data)
      .filter(([key]) => key !== 'Лінк на фото');

  return `
    <div class="social-block">

      ${
        photoUrl
          ? `
            <img
              src="${photoUrl}"
              class="social-photo"
              alt="Фото">
          `
          : `
            <div class="social-photo-placeholder"></div>
          `
      }

      <div class="social-list">
        ${filteredEntries.map(([key, value]) => {

          const safeValue = String(value)
            .replace(/\r?\n/g, '<br>');

          return `
            <div class="detail-row">
              <span class="detail-key">${key}</span>

              <div class="detail-value">
                <span class="copy-text">
                  ${safeValue}
                </span>

                <button
                  class="copy-btn"
                  data-text="${encodeURIComponent(value)}"
                >
                  📋
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>

    </div>
  `;
}

function handleExpiredSession() {
  showSessionModal();
}

async function fetchOrders(pib) {
  const res = await fetch(
    'https://script.google.com/macros/s/AKfycbxaGJM3J0JmOBoKe5GwwnKNt4vtuQi5TUn_EVky0KUHlZhq6DoWcIyrc6fQ19JIeElV3w/exec',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'orders',
        token: authToken,
        pib
      })
    }
  );

  const result = await res.json();

  if (result.error) {
    if (
      result.error.includes('Token verification')
    ) {
      handleExpiredSession();
      return null;
    }

    throw new Error(result.error);
  }

  return result.orders || [];
}

async function fetchSocial(pib) {
  const res = await fetch(
    'https://script.google.com/macros/s/AKfycbxaGJM3J0JmOBoKe5GwwnKNt4vtuQi5TUn_EVky0KUHlZhq6DoWcIyrc6fQ19JIeElV3w/exec',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'social',
        token: authToken,
        pib
      })
    }
  );

  const result = await res.json();

  if (result.error) {

    if (
      result.error.includes('Token verification')
    ) {
      handleExpiredSession();

      return null;
    }

    throw new Error(result.error);
  }

  return result.social || {
    found: false,
    data: {}
  };
}

async function switchDetailsContent(details, html) {
  details.style.opacity = '0';
  details.style.transform = 'translateY(6px)';

  await new Promise(r => setTimeout(r, 120));

  details.innerHTML = html;

  requestAnimationFrame(() => {
    details.style.maxHeight = details.scrollHeight + 'px';
    details.style.opacity = '1';
    details.style.transform = 'translateY(0)';
  });
}

function toggle(btn, mode = 'details') {

  const card = btn.closest('.card');
  const details = card.querySelector('.details');
  const copyBtn = card.querySelector('.copy-all-btn');

  const index = card.dataset.index;
  const item = currentData[index];

  const buttons = card.querySelectorAll('.action-btn');

  const isSameTab =
    details.classList.contains('open') &&
    details.dataset.mode === mode;

  // закриття
  if (isSameTab) {

    details.classList.remove('open');

    details.style.maxHeight = '0px';
    details.style.opacity = '0';
    details.style.transform = 'translateY(-6px)';

    buttons.forEach(b => b.classList.remove('active'));

    copyBtn.style.display = 'none';

    return;
  }

  // активна кнопка
  buttons.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  item.view = mode;

  details.classList.add('open');

  if (mode === 'details') {

    copyBtn.style.display = 'inline-block';

    switchDetailsContent(
      details,
      buildDetailsHTML(item)
    );

    details.dataset.mode = 'details';

    return;
  }

  if (mode === 'orders') {

    copyBtn.style.display = 'none';

    if (item.ordersLoaded) {

      switchDetailsContent(
        details,
        renderOrdersHTML(item.orders)
      );

      details.dataset.mode = 'orders';

      return;
    }

    if (item.ordersLoading) return;

    item.ordersLoading = true;

    switchDetailsContent(details, `
      <div class="inline-loader">
        <div class="inline-loader-wrap">
          <div class="inline-loader-dot"></div>
        </div>
        <span>Завантаження історії...</span>
      </div>
    `);

    details.dataset.mode = 'orders';

    fetchOrders(item.pib)
      .then((orders) => {

        item.orders = orders || [];
        item.ordersLoaded = true;
        item.ordersLoading = false;

        const ordersBtn =
          card.querySelector('.orders-btn');

        ordersBtn.innerHTML =
          `📄 Стройові (${item.orders.length})`;

        if (item.orders.length > 0) {
          ordersBtn.classList.add('has-data');
        }

        switchDetailsContent(
          details,
          renderOrdersHTML(item.orders)
        );
      })
      .catch((err) => {

        console.error(err);

        item.ordersLoading = false;

        switchDetailsContent(details, `
          <div style="
            padding:16px 0;
            color:#ff6b6b;
          ">
            ⚠️ Помилка завантаження
          </div>
        `);
      });

    return;
  }

  if (mode === 'social') {

    if (item.socialLoaded && !item.social?.found) {
      copyBtn.style.display = 'none';
    } else {
      copyBtn.style.display = 'inline-block';
    }

    if (item.socialLoaded) {

      switchDetailsContent(
        details,
        renderSocialHTML(item.social)
      );

      details.dataset.mode = 'social';

      return;
    }

    if (item.socialLoading) return;

    item.socialLoading = true;

    switchDetailsContent(details, `
      <div class="inline-loader">
        <div class="inline-loader-wrap">
          <div class="inline-loader-dot"></div>
        </div>
        <span>Завантаження даних...</span>
      </div>
    `);

    details.dataset.mode = 'social';

    fetchSocial(item.pib)
      .then((social) => {

        item.social = social;
        item.socialLoaded = true;
        item.socialLoading = false;

        if (social?.found) {
          copyBtn.style.display = 'inline-block';
        } else {
          copyBtn.style.display = 'none';
        }

        const socialBtn =
          card.querySelector('.social-btn');

        if (social?.found) {
          socialBtn.classList.add('has-data');
        }

        switchDetailsContent(
          details,
          renderSocialHTML(social)
        );
      })
      .catch((err) => {

        console.error(err);

        item.socialLoading = false;

        switchDetailsContent(details, `
          <div style="
            padding:16px 0;
            color:#ff6b6b;
          ">
            ⚠️ Помилка завантаження
          </div>
        `);
      });

    return;
  }
}

function loadMore() {
  const next = currentData.slice(visibleCount, visibleCount + 30);
  if (next.length === 0) return;

  render(next, true);
  visibleCount += 30;
}

window.addEventListener('scroll', () => {
  if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100) {
    loadMore();
  }
});

const searchInput = document.getElementById('search');
const clearBtn = document.getElementById('clearSearch');

searchInput.addEventListener('input', e => {
  const val = e.target.value;

  clearBtn.style.display = val ? 'block' : 'none';

  const lower = val.toLowerCase();

  currentData = data.filter(item =>
    (item.pib + item.f12 + item.f13 + item.status)
      .toLowerCase()
      .includes(lower)
  );

  if (val) {
    const el = getSearchCount();

    if (el) {
      el.style.display = 'block';
      el.innerHTML = `🔍 <b>Знайдено:</b> ${currentData.length}`;
    }
  } else {
    const el = getSearchCount();
    if (el) el.style.display = 'none';
  }

  visibleCount = 30;
  render(currentData.slice(0, visibleCount));
});

clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  clearBtn.style.display = 'none';

  getSearchCount().style.display = 'none';

  currentData = data;
  visibleCount = 30;
  render(currentData.slice(0, visibleCount));
});

let dotsTimer = null;

function startLoaderDots() {
  const el = document.getElementById('loaderText');
  let dots = 0;

  dotsTimer = setInterval(() => {
    dots = (dots % 3) + 1;
  
    el.querySelector('.dots').textContent = '.'.repeat(dots);
  }, 450);
}

function stopLoaderDots() {
  clearInterval(dotsTimer);
  dotsTimer = null;
}

async function loadData(token) {
  const loaderText = document.getElementById('loaderText');

  loaderText.dataset.base = 'Завантаження даних';

  loaderText.innerHTML = `
    <div class="loader-main">
      <span>Завантаження даних</span><span class="dots"></span>
    </div>
  `;
  startLoaderDots();

  const msgTimer1 = setTimeout(() => {
    loaderText.innerHTML = `
      <div class="loader-main">
        <span>Завантаження даних</span><span class="dots"></span>
      </div>
      <small style="opacity:.7">Це може зайняти трохи часу</small>
    `;
    stopLoaderDots();
    startLoaderDots();
  }, 8000);

  const msgTimer2 = setTimeout(() => {
    loaderText.innerHTML = `
      <div class="loader-main">
        <span>Завантаження даних</span><span class="dots"></span>
      </div>
      <small style="opacity:.7">
        Повільне з'єднання або великий обсяг даних.<br>
        Будь ласка, зачекайте...
      </small>
    `;
    stopLoaderDots();
    startLoaderDots();
  }, 20000);

  try {
    const res = await fetch(
      `https://script.google.com/macros/s/AKfycbxaGJM3J0JmOBoKe5GwwnKNt4vtuQi5TUn_EVky0KUHlZhq6DoWcIyrc6fQ19JIeElV3w/exec?token=${token}`
    );

    const result = await res.json();

    if (result.error) {
      clearTimeout(msgTimer1);
      clearTimeout(msgTimer2);
    
      const err = result.error.toLowerCase();
    
      if (err.includes('диск')) {
        showError(
          '☁️ Тимчасова помилка Google Drive',
          'Спробуйте оновити сторінку через 10–30 секунд'
        );
    
      } else if (
        err.includes('token verification') ||
        err.includes('oauth2.googleapis.com') ||
        err.includes('квоту')
      ) {
        showError(
          '🔐 Тимчасова помилка авторизації',
          'Google тимчасово обмежив перевірку входу. Спробуйте через 1–2 хвилини'
        );
    
      } else if (err.includes('access denied')) {
        showError(
          '☠️ Немає доступу'
        );
    
      } else {
        showError(
          '⚠️ Службова помилка',
          result.error
        );
      }
    
      return;
    }

    clearTimeout(msgTimer1);
    clearTimeout(msgTimer2);

    STATUS_LABELS = result.meta?.labels || {};
    FIELD_LABELS = result.meta?.fields || {};
    FIELD_ORDER = result.meta?.order || [];
    MARKS = result.meta?.marks || [];
    RANKS = result.assets?.ranks || {};
    RANK_ALIAS = result.assets?.rankAlias || {};

    const CHEVRON = result.assets?.chevron || '';

    if (CHEVRON) {
      const img = new Image();
      img.src = CHEVRON;
    
      document.getElementById('favicon').href = CHEVRON;
    
      document.body.style.setProperty(
        '--chevron-bg',
        `url(${CHEVRON})`
      );
    }

    Object.values(RANKS).forEach(src => {
      const img = new Image();
      img.src = src;
    });

    document.getElementById('label-A1').innerText =
      STATUS_LABELS['A1'] || 'A1';

    document.getElementById('label-B2').innerText =
      STATUS_LABELS['B2'] || 'B2';

    stopLoaderDots();

    document.getElementById('loader').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('loginPage').style.display = 'none';

    document.querySelector('.dashboard-title').innerHTML =
      `Станом на <strong>${result.date}</strong>`;

    data = result.data;
    currentData = data;

    render(currentData.slice(0, visibleCount));
    updateDashboard(data);
    updateMarksChart(data);
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    window.todayDateShort = `${dd}.${mm}`;
    renderBirthdays(result.birthdays);
    initAutoHideScroll();

  } catch (e) {
    clearTimeout(msgTimer1);
    clearTimeout(msgTimer2);

    console.error(e);

    showError(
      '🌐 Помилка зʼєднання',
      'Не вдалося отримати дані'
    );
  }
}
  
document.addEventListener('click', function(e) {

  if (e.target.classList.contains('order-copy-btn')) {
    const text = decodeURIComponent(
      e.target.dataset.order
    );
  
    copyText(text);
    return;
  }

  // копіювання одного поля
  if (e.target.classList.contains('copy-btn')) {
    const text = decodeURIComponent(e.target.dataset.text);
    copyText(text);
  }

  // копіювання ВСЬОГО блоку
  const copyAllBtn = e.target.closest('.copy-all-btn');

  if (copyAllBtn) {
    const wrapper = copyAllBtn.parentElement;
    const details = wrapper.nextElementSibling;

    const rows = details.querySelectorAll('.detail-row');

    let text = '';

    rows.forEach(row => {
      const key = row.querySelector('.detail-key')?.innerText || '';
      const value = row.querySelector('.copy-text')?.innerText || '';

      if (value) {
        text += `${key}: ${value}\n`;
      }
    });

    copyText(text.trim());
  }

});

const scrollBtn = document.getElementById('scrollTopBtn');

// показ / ховання кнопки
window.addEventListener('scroll', () => {
  if (window.scrollY > 300) {
    scrollBtn.style.display = 'flex';
  } else {
    scrollBtn.style.display = 'none';
  }
});

scrollBtn.addEventListener('click', () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});

function initTheme(){
  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  const root = document.documentElement;
  const saved = localStorage.getItem('theme') || 'light';

  root.classList.toggle(
    'dark',
    saved === 'dark'
  );

  btn.textContent =
    saved === 'dark' ? '☀️' : '🌙';

  btn.onclick = () => {
    const dark =
      root.classList.toggle('dark');

    localStorage.setItem(
      'theme',
      dark ? 'dark' : 'light'
    );

    btn.textContent =
      dark ? '☀️' : '🌙';
  };
}

function showSessionModal() {

  const modal =
    document.getElementById('sessionModal');

  modal.classList.add('show');

  const confirmBtn =
    modal.querySelector('.confirm');

  const cancelBtn =
    modal.querySelector('.cancel');

  confirmBtn.onclick = () => {
    location.reload();
  };

  cancelBtn.onclick = () => {
    modal.classList.remove('show');
  };
}
  
initTheme();
