/* 차세대 메타인지 테스트 — 오프라인 지원
   첫 접속 때 아래 파일을 모두 기기에 저장해 두고, 이후 인터넷이 없어도 저장본으로 열려요.
   사이트 파일을 고칠 때마다 CACHE 이름의 숫자를 하나 올려야 기기에 새 버전이 반영돼요. */
const CACHE = 'meta-test-v1';
const ASSETS = [
  './',
  'index.html',
  'vendor/html2canvas.min.js',
  'vendor/jspdf.umd.min.js',
  'fonts/noto-sans-kr.woff2',
  'fonts/black-han-sans.woff2',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((r) => { clearTimeout(t); resolve(r); }, (e) => { clearTimeout(t); reject(e); });
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 페이지: 인터넷이 되면 최신본, 안 되면(또는 4초 넘게 걸리면) 저장본
  if (req.mode === 'navigate') {
    event.respondWith(
      withTimeout(fetch(req), 4000)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('index.html', copy));
          return res;
        })
        .catch(() => caches.match('index.html', { ignoreSearch: true }))
    );
    return;
  }

  // 글꼴·PDF 도구·아이콘: 저장본 우선
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
