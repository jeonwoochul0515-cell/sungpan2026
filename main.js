// === Imports ===
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  increment,
  serverTimestamp,
  Timestamp,
} from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js';
import {
  getAuth,
  signInAnonymously,
} from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js';

// === Firebase Config & Init ===
const firebaseConfig = {
  apiKey: 'AIzaSyC2VcR1AeF_vJ8qlBzjt3M_AdkPkn8nFw4',
  authDomain: 'sungpan2026.firebaseapp.com',
  projectId: 'sungpan2026',
  storageBucket: 'sungpan2026.firebasestorage.app',
  messagingSenderId: '797293227638',
  appId: '1:797293227638:web:8db50f9f9caa386a9a3957',
  measurementId: 'G-3XXY10Q230',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// === Constants ===
const PAGE_SIZE = 20;
const COMMENT_PAGE_SIZE = 20;
const MAX_IMAGE_DIMENSION = 1920;
const IMAGE_QUALITY = 0.8;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// === DOM Refs ===
const pageLanding = document.getElementById('page-landing');
const pageList = document.getElementById('page-list');
const pageCreate = document.getElementById('page-create');
const pageDetail = document.getElementById('page-detail');

// PASS Modal DOM refs
const passModal = document.getElementById('pass-modal');
const passModalClose = document.getElementById('pass-modal-close');
const btnVerifyCta = document.getElementById('btn-verify-cta');
const passProcessing = document.getElementById('pass-processing');
const passResult = document.getElementById('pass-result');
const passResultText = document.getElementById('pass-result-text');
const passFailResult = document.getElementById('pass-fail-result');
const passFailText = document.getElementById('pass-fail-text');
const btnPassEnter = document.getElementById('btn-pass-enter');
const btnPassRetry = document.getElementById('btn-pass-retry');
const threadListEl = document.getElementById('thread-list');
const btnWrite = document.getElementById('btn-write');
const btnBackCreate = document.getElementById('btn-back-create');
const btnBackDetail = document.getElementById('btn-back-detail');
const btnSubmitPost = document.getElementById('btn-submit-post');
const inputTitle = document.getElementById('input-title');
const inputContent = document.getElementById('input-content');
const detailTitle = document.getElementById('detail-title');
const detailContent = document.getElementById('detail-content');
const detailTime = document.getElementById('detail-time');
const detailMediaSlot = document.getElementById('detail-media-slot');
const detailCommentCount = document.getElementById('detail-comment-count');
const commentListEl = document.getElementById('comment-list');
const inputComment = document.getElementById('input-comment');
const btnSendComment = document.getElementById('btn-send-comment');

// Media DOM refs
const btnAttachPost = document.getElementById('btn-attach-post');
const fileInputPost = document.getElementById('file-input-post');
const postMediaPreview = document.getElementById('post-media-preview');
const postMediaThumb = document.getElementById('post-media-thumb');
const destructType = document.getElementById('destruct-type');
const destructTimeValue = document.getElementById('destruct-time-value');
const destructViewsValue = document.getElementById('destruct-views-value');
const btnRemovePostMedia = document.getElementById('btn-remove-post-media');

const btnAttachComment = document.getElementById('btn-attach-comment');
const fileInputComment = document.getElementById('file-input-comment');
const commentMediaPreview = document.getElementById('comment-media-preview');
const commentMediaThumb = document.getElementById('comment-media-thumb');
const commentDestructType = document.getElementById('comment-destruct-type');
const commentDestructTimeValue = document.getElementById('comment-destruct-time-value');
const commentDestructViewsValue = document.getElementById('comment-destruct-views-value');
const btnRemoveCommentMedia = document.getElementById('btn-remove-comment-media');

// Viewer DOM refs
const viewerModal = document.getElementById('viewer-modal');
const viewerInfo = document.getElementById('viewer-info');
const viewerClose = document.getElementById('viewer-close');
const viewerBody = document.getElementById('viewer-body');
const viewerMedia = document.getElementById('viewer-media');

// Search DOM refs
const searchInput = document.getElementById('search-input');
const btnSearchClear = document.getElementById('btn-search-clear');

// Delete DOM refs
const detailActions = document.getElementById('detail-actions');
const btnDeletePost = document.getElementById('btn-delete-post');

// Reply DOM refs
const replyIndicator = document.getElementById('reply-indicator');
const replyIndicatorText = document.getElementById('reply-indicator-text');
const replyIndicatorClose = document.getElementById('reply-indicator-close');

// === State ===
let currentPostId = null;
let postMediaFile = null;
let commentMediaFile = null;
let viewerOpen = false;
let viewerTimerInterval = null;

// Pagination state
let lastVisibleThread = null;
let isLoadingMore = false;
let hasMoreThreads = true;
let threadsData = []; // cached thread data for search

// Real-time state
let commentsUnsubscribe = null;

// Search state
let searchQuery = '';

// Comment pagination state
let showAllCommentsFlag = false;

// Reply state
let replyToId = null;
let replyToPreview = '';

// PortOne
const IMP = window.IMP;
if (IMP) {
  IMP.init('YOUR_PORTONE_MERCHANT_ID'); // TODO: 포트원 가맹점 식별코드 입력
}

// === Helpers ===
function timeAgo(timestamp) {
  if (!timestamp) return '';
  const now = new Date();
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return diffSec + '초';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return diffMin + '분';
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return diffHr + '시간';
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return diffDay + '일';
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return diffMonth + '개월';
  return Math.floor(diffMonth / 12) + '년';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getCurrentUid() {
  return auth.currentUser?.uid || null;
}

function showPage(page) {
  // Cleanup real-time subscriptions when leaving pages
  if (commentsUnsubscribe) {
    commentsUnsubscribe();
    commentsUnsubscribe = null;
  }

  pageLanding.classList.add('hidden');
  pageList.classList.add('hidden');
  pageCreate.classList.add('hidden');
  pageDetail.classList.add('hidden');
  if (!checkAdultGate() && page !== pageLanding) {
    pageLanding.classList.remove('hidden');
    window.scrollTo(0, 0);
    return;
  }
  page.classList.remove('hidden');
  window.scrollTo(0, 0);
}

// === Image Compression ===
function compressImage(file) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Skip if already small enough
      if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION && file.size <= 2 * 1024 * 1024) {
        resolve(file);
        return;
      }

      // Scale down
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        IMAGE_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

// === Adult Gate ===
function checkAdultGate() {
  return localStorage.getItem('freethread_adult') === 'true';
}

function setAdultVerified() {
  localStorage.setItem('freethread_adult', 'true');
}

// === PASS (PortOne) Functions ===
function closePassModal() {
  passModal.classList.add('hidden');
}

function resetPassModal() {
  passProcessing.classList.remove('hidden');
  passResult.classList.add('hidden');
  passFailResult.classList.add('hidden');
}

function showPassResult(success, message) {
  passProcessing.classList.add('hidden');
  if (success) {
    passResult.classList.remove('hidden');
    passResultText.textContent = message || '성인인증이 완료되었습니다';
  } else {
    passFailResult.classList.remove('hidden');
    passFailText.textContent = message || '인증에 실패했습니다';
  }
}

async function startCertification() {
  if (!IMP) {
    alert('인증 모듈을 불러올 수 없습니다. 페이지를 새로고침 해주세요.');
    return;
  }

  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  } catch (e) {
    // Retry once
    try {
      await signInAnonymously(auth);
    } catch (e2) {
      alert('인증 준비에 실패했습니다. 네트워크 연결을 확인 후 다시 시도해주세요.');
      return;
    }
  }

  IMP.certification({
    merchant_uid: 'cert_' + Date.now(),
    popup: true,
  }, async (response) => {
    resetPassModal();
    passModal.classList.remove('hidden');

    if (!response.success) {
      showPassResult(false, response.error_msg || '본인인증이 취소되었습니다');
      return;
    }

    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + idToken,
        },
        body: JSON.stringify({ imp_uid: response.imp_uid }),
      });
      const data = await res.json();

      if (data.verified) {
        setAdultVerified();
        showPassResult(true, '성인인증이 완료되었습니다');
      } else {
        showPassResult(false, data.message || '인증에 실패했습니다');
      }
    } catch (e) {
      showPassResult(false, '서버 오류가 발생했습니다. 다시 시도해주세요.');
    }
  });
}

function enterBoard() {
  closePassModal();
  showPage(pageList);
  loadThreads();
}

function formatDestructInfo(media) {
  if (!media) return '';
  if (media.destructType === 'time') {
    const expiresAt = media.expiresAt.toDate ? media.expiresAt.toDate() : new Date(media.expiresAt);
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return '파괴됨';
    const sec = Math.floor(remaining / 1000);
    if (sec < 60) return sec + '초 후 파괴';
    const min = Math.floor(sec / 60);
    if (min < 60) return min + '분 후 파괴';
    const hr = Math.floor(min / 60);
    return hr + '시간 후 파괴';
  }
  return (media.viewCount || 0) + '/' + media.maxViews + '회 조회됨';
}

function isMediaExpired(media) {
  if (!media) return true;
  if (media.destructType === 'time') {
    const expiresAt = media.expiresAt.toDate ? media.expiresAt.toDate() : new Date(media.expiresAt);
    return Date.now() >= expiresAt;
  }
  return (media.viewCount || 0) >= media.maxViews;
}

// === SVG Icons ===
const commentIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
</svg>`;

const lockIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
</svg>`;

const destroyedIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
</svg>`;

const deleteIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
</svg>`;

const replyIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/>
</svg>`;

const replySmallIcon = `<svg class="comment-reply-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/>
</svg>`;

// === Media Upload ===
async function uploadMedia(file) {
  // Compress images before upload
  const processedFile = await compressImage(file);

  // Check file size
  if (processedFile.size > MAX_FILE_SIZE) {
    throw new Error('파일 크기가 10MB를 초과합니다.');
  }

  const path = 'media/' + Date.now() + '_' + Math.random().toString(36).slice(2);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, processedFile);
  const url = await getDownloadURL(storageRef);
  return { url, storagePath: path };
}

function buildMediaField(file, uploaded, destructTypeVal, destructVal) {
  const mediaType = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image';
  const field = {
    url: uploaded.url,
    storagePath: uploaded.storagePath,
    type: mediaType,
    destructType: destructTypeVal,
    viewCount: 0,
  };
  if (destructTypeVal === 'time') {
    const ms = parseInt(destructVal) * 1000;
    field.expiresAt = Timestamp.fromDate(new Date(Date.now() + ms));
  } else {
    field.maxViews = parseInt(destructVal);
  }
  return field;
}

function showThumbPreview(file, thumbEl) {
  // Revoke previous object URLs to prevent memory leak
  const prevImg = thumbEl.querySelector('img');
  const prevVideo = thumbEl.querySelector('video');
  if (prevImg && prevImg.src.startsWith('blob:')) URL.revokeObjectURL(prevImg.src);
  if (prevVideo && prevVideo.src.startsWith('blob:')) URL.revokeObjectURL(prevVideo.src);

  thumbEl.innerHTML = '';
  if (file.type.startsWith('image')) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    thumbEl.appendChild(img);
  } else if (file.type.startsWith('audio')) {
    thumbEl.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
  } else {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    thumbEl.appendChild(video);
  }
}

// === Self-Destruct Logic ===
async function destroyMedia(docPath, storagePath) {
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (e) { /* already deleted */ }
  try {
    const docRef = typeof docPath === 'string' ? doc(db, docPath) : docPath;
    await updateDoc(docRef, { media: deleteField() });
  } catch (e) { /* ignore */ }
}

async function checkAndDestroyIfExpired(media, docPath) {
  if (!media) return true;
  if (isMediaExpired(media)) {
    await destroyMedia(docPath, media.storagePath);
    return true;
  }
  return false;
}

// === Media Link HTML ===
function mediaCardHtml(media, onClick) {
  if (!media) return '';
  const info = isMediaExpired(media) ? '만료됨' : formatDestructInfo(media);
  const typeLabel = media.type === 'video' ? '영상' : media.type === 'audio' ? '음성' : '이미지';
  return `<a class="media-link" href="#" data-media-action="${onClick}">${lockIcon} 자동파괴 ${typeLabel} (${info})</a>`;
}

// === Protected Viewer ===
function openViewer(mediaUrl, mediaType, media, docPath) {
  viewerOpen = true;
  viewerModal.classList.remove('hidden');
  viewerBody.classList.remove('viewer-blurred');
  document.body.style.overflow = 'hidden';

  viewerMedia.innerHTML = '';
  if (mediaType === 'video') {
    const video = document.createElement('video');
    video.src = mediaUrl;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.controlsList = 'nodownload';
    video.disablePictureInPicture = true;
    video.oncontextmenu = () => false;
    viewerMedia.appendChild(video);
  } else if (mediaType === 'audio') {
    const audio = document.createElement('audio');
    audio.src = mediaUrl;
    audio.controls = true;
    audio.autoplay = true;
    audio.controlsList = 'nodownload';
    audio.oncontextmenu = () => false;
    viewerMedia.appendChild(audio);
  } else {
    const img = document.createElement('img');
    img.src = mediaUrl;
    img.draggable = false;
    img.oncontextmenu = () => false;
    viewerMedia.appendChild(img);
  }

  updateViewerInfo(media);

  if (media.destructType === 'time') {
    viewerTimerInterval = setInterval(() => {
      if (isMediaExpired(media)) {
        closeViewer();
        destroyMedia(docPath, media.storagePath);
        if (currentPostId) loadDetail(currentPostId);
      } else {
        updateViewerInfo(media);
      }
    }, 1000);
  }
}

function updateViewerInfo(media) {
  viewerInfo.textContent = formatDestructInfo(media);
}

function closeViewer() {
  viewerOpen = false;
  viewerModal.classList.add('hidden');
  document.body.style.overflow = '';
  viewerMedia.innerHTML = '';
  if (viewerTimerInterval) {
    clearInterval(viewerTimerInterval);
    viewerTimerInterval = null;
  }
}

async function handleMediaCardClick(media, docPath) {
  const expired = await checkAndDestroyIfExpired(media, docPath);
  if (expired) {
    alert('이미 파괴된 미디어입니다.');
    if (currentPostId) loadDetail(currentPostId);
    return;
  }

  if (media.destructType === 'views') {
    const docRef = typeof docPath === 'string' ? doc(db, docPath) : docPath;
    await updateDoc(docRef, { 'media.viewCount': increment(1) });
    media.viewCount = (media.viewCount || 0) + 1;

    if (media.viewCount >= media.maxViews) {
      openViewer(media.url, media.type, media, docPath);
      return;
    }
  }

  openViewer(media.url, media.type, media, docPath);
}

// === Thread List (Pagination) ===
function renderThreadItems(threads) {
  return threads.map(item => {
    const post = item.data;
    const hasMedia = post.media && !isMediaExpired(post.media);
    return `
      <div class="thread-item" data-id="${item.id}">
        <span class="thread-title">${hasMedia ? lockIcon : ''}${escapeHtml(post.title)}</span>
        <span class="thread-meta">
          <span class="thread-comments">
            ${commentIcon}
            <span>${post.commentCount || 0}</span>
          </span>
          <span class="thread-time">${timeAgo(post.createdAt)}</span>
        </span>
      </div>
    `;
  }).join('');
}

async function loadThreads() {
  // Reset pagination state
  lastVisibleThread = null;
  hasMoreThreads = true;
  threadsData = [];
  isLoadingMore = false;

  threadListEl.innerHTML = '<div class="loading-msg">불러오는 중...</div>';

  try {
    const q = query(
      collection(db, 'posts'),
      orderBy('lastActivityAt', 'desc'),
      limit(PAGE_SIZE)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      threadListEl.innerHTML = '<div class="empty-msg">아직 스레드가 없습니다. 첫 번째 스레드를 작성해보세요!</div>';
      hasMoreThreads = false;
      return;
    }

    threadsData = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      data: docSnap.data(),
      docSnap,
    }));

    lastVisibleThread = snapshot.docs[snapshot.docs.length - 1];
    hasMoreThreads = snapshot.docs.length >= PAGE_SIZE;

    threadListEl.innerHTML = renderThreadItems(threadsData);

    if (hasMoreThreads) {
      threadListEl.insertAdjacentHTML('beforeend', '<div class="load-more-indicator" id="load-more-indicator">더 불러오는 중...</div>');
    }

    // Auto-cleanup expired media
    snapshot.docs.forEach(docSnap => {
      const post = docSnap.data();
      if (post.media) checkAndDestroyIfExpired(post.media, 'posts/' + docSnap.id);
    });
  } catch (err) {
    threadListEl.innerHTML = '<div class="empty-msg">데이터를 불러올 수 없습니다.</div>';
  }
}

async function loadMoreThreads() {
  if (isLoadingMore || !hasMoreThreads || !lastVisibleThread) return;

  isLoadingMore = true;

  try {
    const q = query(
      collection(db, 'posts'),
      orderBy('lastActivityAt', 'desc'),
      startAfter(lastVisibleThread),
      limit(PAGE_SIZE)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      hasMoreThreads = false;
      const indicator = document.getElementById('load-more-indicator');
      if (indicator) indicator.remove();
      isLoadingMore = false;
      return;
    }

    const newThreads = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      data: docSnap.data(),
      docSnap,
    }));

    threadsData = [...threadsData, ...newThreads];
    lastVisibleThread = snapshot.docs[snapshot.docs.length - 1];
    hasMoreThreads = snapshot.docs.length >= PAGE_SIZE;

    // Remove existing indicator
    const indicator = document.getElementById('load-more-indicator');
    if (indicator) indicator.remove();

    // Append new threads
    threadListEl.insertAdjacentHTML('beforeend', renderThreadItems(newThreads));

    // Re-add indicator if more available
    if (hasMoreThreads) {
      threadListEl.insertAdjacentHTML('beforeend', '<div class="load-more-indicator" id="load-more-indicator">더 불러오는 중...</div>');
    }

    // Auto-cleanup expired media
    snapshot.docs.forEach(docSnap => {
      const post = docSnap.data();
      if (post.media) checkAndDestroyIfExpired(post.media, 'posts/' + docSnap.id);
    });
  } catch (err) {
    // Silently fail for load more
  }

  isLoadingMore = false;
}

// === Search ===
function filterThreads(queryStr) {
  searchQuery = queryStr.trim().toLowerCase();

  if (!searchQuery) {
    // Show all loaded threads
    threadListEl.innerHTML = renderThreadItems(threadsData);
    if (hasMoreThreads) {
      threadListEl.insertAdjacentHTML('beforeend', '<div class="load-more-indicator" id="load-more-indicator">더 불러오는 중...</div>');
    }
    btnSearchClear.classList.add('hidden');
    return;
  }

  btnSearchClear.classList.remove('hidden');

  const filtered = threadsData.filter(item =>
    item.data.title.toLowerCase().includes(searchQuery) ||
    (item.data.content && item.data.content.toLowerCase().includes(searchQuery))
  );

  if (filtered.length === 0) {
    threadListEl.innerHTML = `<div class="empty-msg">'${escapeHtml(queryStr)}'에 대한 검색 결과가 없습니다.</div>`;
  } else {
    threadListEl.innerHTML = renderThreadItems(filtered);
  }
}

// === Thread Detail (Real-time Comments) ===
let detailMediaData = null;
let detailMediaDocPath = null;
let detailPostAuthorUid = null;

async function loadDetail(postId) {
  currentPostId = postId;
  showPage(pageDetail);

  detailTitle.textContent = '불러오는 중...';
  detailContent.textContent = '';
  detailTime.textContent = '';
  detailMediaSlot.innerHTML = '';
  detailCommentCount.textContent = '0';
  commentListEl.innerHTML = '';
  detailMediaData = null;
  detailMediaDocPath = null;
  detailPostAuthorUid = null;
  showAllCommentsFlag = false;
  clearReply();

  // Hide delete button by default
  if (btnDeletePost) btnDeletePost.classList.add('hidden');

  try {
    // Load post data
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      detailTitle.textContent = '삭제된 게시글';
      detailContent.textContent = '존재하지 않는 게시글입니다.';
      return;
    }

    const post = postSnap.data();
    detailTitle.textContent = post.title;
    detailContent.textContent = post.content;
    detailTime.textContent = timeAgo(post.createdAt) + ' 전';
    detailPostAuthorUid = post.authorUid || null;

    // Show delete button if current user is the author
    if (btnDeletePost && detailPostAuthorUid && detailPostAuthorUid === getCurrentUid()) {
      btnDeletePost.classList.remove('hidden');
    }

    // Show media card if present
    if (post.media) {
      detailMediaData = post.media;
      detailMediaDocPath = 'posts/' + postId;
      detailMediaSlot.innerHTML = mediaCardHtml(post.media, 'post');
      checkAndDestroyIfExpired(post.media, detailMediaDocPath);
    }

    // Real-time comments with onSnapshot
    const commentsQuery = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc')
    );

    commentsUnsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const comments = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      }));
      detailCommentCount.textContent = comments.length;
      renderComments(comments, postId);
    }, (error) => {
      // Fallback: load once if onSnapshot fails
      loadCommentsOnce(postId);
    });

  } catch (err) {
    detailTitle.textContent = '오류 발생';
    detailContent.textContent = '게시글을 불러올 수 없습니다.';
  }
}

async function loadCommentsOnce(postId) {
  try {
    const commentsSnap = await getDocs(
      query(
        collection(db, 'posts', postId, 'comments'),
        orderBy('createdAt', 'asc')
      )
    );
    const comments = commentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    detailCommentCount.textContent = comments.length;
    renderComments(comments, postId);
  } catch (err) {
    // ignore
  }
}

// Store comment media data for click handling
let commentMediaMap = {};
let allComments = [];
let allCommentsPostId = null;

function renderCommentItems(comments, postId) {
  const uid = getCurrentUid();
  // Build a map for reply preview lookup
  const commentMap = {};
  allComments.forEach(c => { commentMap[c.id] = c; });

  return comments.map(c => {
    let mediaHtml = '';
    if (c.media) {
      commentMediaMap[c.id] = {
        media: c.media,
        docPath: 'posts/' + postId + '/comments/' + c.id,
      };
      mediaHtml = mediaCardHtml(c.media, 'comment-' + c.id);
      checkAndDestroyIfExpired(c.media, 'posts/' + postId + '/comments/' + c.id);
    }

    // Reply preview
    let replyHtml = '';
    if (c.replyTo) {
      const originalComment = commentMap[c.replyTo];
      const preview = c.replyPreview || (originalComment ? originalComment.content : '');
      const truncated = preview.length > 50 ? preview.slice(0, 50) + '...' : preview;
      replyHtml = `<div class="comment-reply-preview" data-reply-to="${c.replyTo}">${replySmallIcon}<span class="comment-reply-text">${escapeHtml(truncated)}</span></div>`;
    }

    const canDelete = uid && c.authorUid && c.authorUid === uid;
    const deleteBtn = canDelete
      ? `<button class="btn-delete-comment" data-comment-id="${c.id}" title="삭제">${deleteIcon}</button>`
      : '';
    const replyBtn = `<button class="btn-reply-comment" data-comment-id="${c.id}" data-comment-content="${escapeHtml(c.content)}" title="답글">${replyIcon}</button>`;

    return `
      <div class="comment-item" data-comment-id="${c.id}">
        ${replyHtml}
        <div class="comment-body">
          <div class="comment-content">${escapeHtml(c.content)}</div>
          ${replyBtn}
          ${deleteBtn}
        </div>
        ${mediaHtml}
        <div class="comment-time">${timeAgo(c.createdAt)} 전</div>
      </div>
    `;
  }).join('');
}

function renderComments(comments, postId) {
  commentMediaMap = {};
  allComments = comments;
  allCommentsPostId = postId;

  if (!comments.length) {
    commentListEl.innerHTML = '<div class="comment-empty">첫 번째 댓글을 남겨보세요</div>';
    return;
  }

  if (!showAllCommentsFlag && comments.length > COMMENT_PAGE_SIZE) {
    const visible = comments.slice(-COMMENT_PAGE_SIZE);
    const hiddenCount = comments.length - COMMENT_PAGE_SIZE;
    commentListEl.innerHTML =
      `<button class="btn-show-all-comments" id="btn-show-all">정주행 (${hiddenCount}개 더 보기)</button>` +
      renderCommentItems(visible, postId);
  } else {
    commentListEl.innerHTML = renderCommentItems(comments, postId);
  }
}

function showAllComments() {
  if (!allComments.length) return;
  showAllCommentsFlag = true;
  commentMediaMap = {};
  renderComments(allComments, allCommentsPostId);
  commentListEl.firstElementChild?.scrollIntoView({ behavior: 'smooth' });
}

// === Content Moderation ===
const MODERATION_URL = '/api/moderate';

async function checkModeration(text, type) {
  try {
    const user = auth.currentUser;
    if (!user) return { allowed: true };
    const idToken = await user.getIdToken();
    const res = await fetch(MODERATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + idToken,
      },
      body: JSON.stringify({ text, type }),
    });
    if (!res.ok) return { allowed: true };
    return await res.json();
  } catch (e) {
    return { allowed: true };
  }
}

function showModerationAlert(result) {
  if (result.blocked) {
    alert(result.message);
  } else if (result.warning) {
    alert(result.message);
  }
}

// === Create Post ===
async function submitPost() {
  const title = inputTitle.value.trim();
  const content = inputContent.value.trim();
  if (!title || !content) {
    alert('제목과 내용을 모두 입력해주세요.');
    return;
  }

  btnSubmitPost.disabled = true;
  btnSubmitPost.textContent = '검토 중...';

  try {
    const modResult = await checkModeration(title + '\n' + content, 'post');
    if (!modResult.allowed) {
      showModerationAlert(modResult);
      return;
    }

    btnSubmitPost.textContent = postMediaFile ? '업로드 중...' : '등록 중...';

    const postData = {
      title,
      content,
      commentCount: 0,
      authorUid: getCurrentUid() || null,
      createdAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    };

    // Upload media if attached
    if (postMediaFile) {
      const uploaded = await uploadMedia(postMediaFile);
      const dType = destructType.value;
      const dVal = dType === 'time' ? destructTimeValue.value : destructViewsValue.value;
      postData.media = buildMediaField(postMediaFile, uploaded, dType, dVal);
    }

    await addDoc(collection(db, 'posts'), postData);

    inputTitle.value = '';
    inputContent.value = '';
    clearPostMedia();
    showPage(pageList);
    loadThreads();
  } catch (err) {
    alert(err.message || '작성에 실패했습니다. 다시 시도해주세요.');
  } finally {
    btnSubmitPost.disabled = false;
    btnSubmitPost.textContent = '등록';
  }
}

// === Send Comment ===
async function sendComment() {
  const content = inputComment.value.trim();
  if (!content && !commentMediaFile) return;
  if (!currentPostId) return;

  const currentCount = parseInt(detailCommentCount.textContent) || 0;
  if (currentCount >= 100) {
    alert('댓글은 최대 100개까지 작성할 수 있습니다.');
    return;
  }

  btnSendComment.disabled = true;

  try {
    if (content) {
      const modResult = await checkModeration(content, 'comment');
      if (!modResult.allowed) {
        showModerationAlert(modResult);
        return;
      }
    }

    const commentData = {
      content: content || '',
      authorUid: getCurrentUid() || null,
      createdAt: serverTimestamp(),
    };

    // Attach reply reference
    if (replyToId) {
      commentData.replyTo = replyToId;
      commentData.replyPreview = replyToPreview.slice(0, 100);
    }

    if (commentMediaFile) {
      const uploaded = await uploadMedia(commentMediaFile);
      const dType = commentDestructType.value;
      const dVal = dType === 'time' ? commentDestructTimeValue.value : commentDestructViewsValue.value;
      commentData.media = buildMediaField(commentMediaFile, uploaded, dType, dVal);
    }

    await addDoc(collection(db, 'posts', currentPostId, 'comments'), commentData);

    await updateDoc(doc(db, 'posts', currentPostId), {
      commentCount: increment(1),
      lastActivityAt: serverTimestamp(),
    });

    inputComment.value = '';
    clearCommentMedia();
    clearReply();

    // Comments will update automatically via onSnapshot
    // Scroll to bottom after a short delay
    setTimeout(() => {
      commentListEl.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
    }, 500);
  } catch (err) {
    alert('댓글 작성에 실패했습니다.');
  } finally {
    btnSendComment.disabled = false;
  }
}

// === Delete Post ===
async function deletePost() {
  if (!currentPostId) return;

  if (!confirm('이 스레드를 삭제하시겠습니까? 모든 댓글도 함께 삭제됩니다.')) return;

  // Unsubscribe from real-time comments before deleting
  if (commentsUnsubscribe) {
    commentsUnsubscribe();
    commentsUnsubscribe = null;
  }

  try {
    // Delete all comments first
    const commentsSnap = await getDocs(collection(db, 'posts', currentPostId, 'comments'));
    const deletePromises = commentsSnap.docs.map(async (commentDoc) => {
      const commentData = commentDoc.data();
      // Delete comment media if exists
      if (commentData.media?.storagePath) {
        try { await deleteObject(ref(storage, commentData.media.storagePath)); } catch (e) { /* ignore */ }
      }
      return deleteDoc(commentDoc.ref);
    });
    await Promise.all(deletePromises);

    // Delete post media if exists
    const postSnap = await getDoc(doc(db, 'posts', currentPostId));
    if (postSnap.exists()) {
      const postData = postSnap.data();
      if (postData.media?.storagePath) {
        try { await deleteObject(ref(storage, postData.media.storagePath)); } catch (e) { /* ignore */ }
      }
    }

    // Delete the post
    await deleteDoc(doc(db, 'posts', currentPostId));

    showPage(pageList);
    loadThreads();
  } catch (err) {
    alert('삭제에 실패했습니다.');
  }
}

// === Delete Comment ===
async function deleteComment(commentId) {
  if (!currentPostId || !commentId) return;

  if (!confirm('이 댓글을 삭제하시겠습니까?')) return;

  try {
    const commentRef = doc(db, 'posts', currentPostId, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);

    if (commentSnap.exists()) {
      const commentData = commentSnap.data();
      // Delete media if exists
      if (commentData.media?.storagePath) {
        try { await deleteObject(ref(storage, commentData.media.storagePath)); } catch (e) { /* ignore */ }
      }
    }

    await deleteDoc(commentRef);

    await updateDoc(doc(db, 'posts', currentPostId), {
      commentCount: increment(-1),
    });

    // Comments will update automatically via onSnapshot
  } catch (err) {
    alert('댓글 삭제에 실패했습니다.');
  }
}

// === Media Attach Helpers ===
function clearPostMedia() {
  postMediaFile = null;
  postMediaPreview.classList.add('hidden');
  postMediaThumb.innerHTML = '';
  fileInputPost.value = '';
}

function clearCommentMedia() {
  commentMediaFile = null;
  commentMediaPreview.classList.add('hidden');
  commentMediaThumb.innerHTML = '';
  fileInputComment.value = '';
}

// === Reply Helpers ===
function setReply(commentId, content) {
  replyToId = commentId;
  replyToPreview = content;
  const truncated = content.length > 40 ? content.slice(0, 40) + '...' : content;
  replyIndicatorText.textContent = truncated;
  replyIndicator.classList.remove('hidden');
  updateInputStackPositions();
  inputComment.focus();
}

function clearReply() {
  replyToId = null;
  replyToPreview = '';
  replyIndicator.classList.add('hidden');
  updateInputStackPositions();
}

function updateInputStackPositions() {
  const hasReply = !replyIndicator.classList.contains('hidden');
  const hasMedia = !commentMediaPreview.classList.contains('hidden');
  const barHeight = 64;
  const replyHeight = 40;
  const mediaHeight = 60;
  let totalBottom = barHeight;

  if (hasReply) {
    replyIndicator.style.bottom = totalBottom + 'px';
    totalBottom += replyHeight;
  }
  if (hasMedia) {
    commentMediaPreview.style.bottom = (hasReply ? barHeight + replyHeight : barHeight) + 'px';
    totalBottom = barHeight + (hasReply ? replyHeight : 0) + mediaHeight;
  }

  // Adjust detail container padding to prevent content from hiding behind stacked UI
  const detailContainer = document.querySelector('.detail-container');
  if (detailContainer) {
    detailContainer.style.paddingBottom = (totalBottom + 8) + 'px';
  }
}

function scrollToComment(commentId) {
  const el = commentListEl.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('comment-highlight');
    void el.offsetWidth;
    el.classList.add('comment-highlight');
  }
}

// === Anti-Screenshot Protections ===
function setupProtections() {
  document.addEventListener('contextmenu', e => {
    if (viewerOpen) e.preventDefault();
  });

  document.addEventListener('keydown', e => {
    if (!viewerOpen) return;
    if (
      e.key === 'PrintScreen' ||
      (e.ctrlKey && ['s', 'p', 'c', 'a', 'u'].includes(e.key.toLowerCase())) ||
      (e.ctrlKey && e.shiftKey && ['s', 'i', 'j'].includes(e.key.toLowerCase())) ||
      e.key === 'F12'
    ) {
      e.preventDefault();
      viewerBody.classList.add('viewer-blurred');
      setTimeout(() => viewerBody.classList.remove('viewer-blurred'), 2000);
    }
    if (e.key === 'Escape') closeViewer();
  });

  document.addEventListener('visibilitychange', () => {
    if (viewerOpen && document.hidden) {
      viewerBody.classList.add('viewer-blurred');
    }
  });

  window.addEventListener('blur', () => {
    if (viewerOpen) {
      viewerBody.classList.add('viewer-blurred');
    }
  });

  window.addEventListener('focus', () => {
    if (viewerOpen) {
      setTimeout(() => viewerBody.classList.remove('viewer-blurred'), 300);
    }
  });
}

// === Event Listeners ===
btnWrite.addEventListener('click', () => {
  showPage(pageCreate);
  inputTitle.focus();
});

btnBackCreate.addEventListener('click', () => {
  clearPostMedia();
  showPage(pageList);
});

btnBackDetail.addEventListener('click', () => {
  clearCommentMedia();
  showPage(pageList);
  loadThreads();
});

btnSubmitPost.addEventListener('click', submitPost);
btnSendComment.addEventListener('click', sendComment);

inputComment.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendComment();
  }
});

threadListEl.addEventListener('click', (e) => {
  const item = e.target.closest('.thread-item');
  if (item) loadDetail(item.dataset.id);
});

// Post media attach
btnAttachPost.addEventListener('click', () => fileInputPost.click());
fileInputPost.addEventListener('change', () => {
  const file = fileInputPost.files[0];
  if (!file) return;

  if (file.size > MAX_FILE_SIZE) {
    alert('파일 크기가 10MB를 초과합니다.');
    fileInputPost.value = '';
    return;
  }

  postMediaFile = file;
  showThumbPreview(file, postMediaThumb);
  postMediaPreview.classList.remove('hidden');
});
btnRemovePostMedia.addEventListener('click', clearPostMedia);

// Destruct type toggle (post)
destructType.addEventListener('change', () => {
  if (destructType.value === 'time') {
    destructTimeValue.classList.remove('hidden');
    destructViewsValue.classList.add('hidden');
  } else {
    destructTimeValue.classList.add('hidden');
    destructViewsValue.classList.remove('hidden');
  }
});

// Comment media attach
btnAttachComment.addEventListener('click', () => fileInputComment.click());
fileInputComment.addEventListener('change', () => {
  const file = fileInputComment.files[0];
  if (!file) return;

  if (file.size > MAX_FILE_SIZE) {
    alert('파일 크기가 10MB를 초과합니다.');
    fileInputComment.value = '';
    return;
  }

  commentMediaFile = file;
  showThumbPreview(file, commentMediaThumb);
  commentMediaPreview.classList.remove('hidden');
  updateInputStackPositions();
});
btnRemoveCommentMedia.addEventListener('click', () => {
  clearCommentMedia();
  updateInputStackPositions();
});

// Comment destruct type toggle
commentDestructType.addEventListener('change', () => {
  if (commentDestructType.value === 'time') {
    commentDestructTimeValue.classList.remove('hidden');
    commentDestructViewsValue.classList.add('hidden');
  } else {
    commentDestructTimeValue.classList.add('hidden');
    commentDestructViewsValue.classList.remove('hidden');
  }
});

// 정주행 button
commentListEl.addEventListener('click', (e) => {
  if (e.target.id === 'btn-show-all') showAllComments();
});

// Delete comment button delegation
commentListEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-delete-comment');
  if (btn) {
    e.stopPropagation();
    deleteComment(btn.dataset.commentId);
  }
});

// Reply button delegation
commentListEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-reply-comment');
  if (btn) {
    e.stopPropagation();
    setReply(btn.dataset.commentId, btn.dataset.commentContent);
  }
});

// Reply preview click → scroll to original comment
commentListEl.addEventListener('click', (e) => {
  const preview = e.target.closest('.comment-reply-preview');
  if (preview) {
    e.stopPropagation();
    const targetId = preview.dataset.replyTo;
    // If comment is hidden (정주행 not expanded), show all first
    const targetEl = commentListEl.querySelector(`.comment-item[data-comment-id="${targetId}"]`);
    if (!targetEl && !showAllCommentsFlag) {
      showAllComments();
    }
    setTimeout(() => scrollToComment(targetId), 100);
  }
});

// Reply indicator close
replyIndicatorClose.addEventListener('click', clearReply);

// Viewer close
viewerClose.addEventListener('click', closeViewer);

// Media card click delegation
document.addEventListener('click', (e) => {
  const card = e.target.closest('.media-link[data-media-action]');
  if (!card) return;
  e.preventDefault();
  const action = card.dataset.mediaAction;
  if (action === 'post' && detailMediaData) {
    handleMediaCardClick(detailMediaData, detailMediaDocPath);
  } else if (action.startsWith('comment-')) {
    const commentId = action.replace('comment-', '');
    const entry = commentMediaMap[commentId];
    if (entry) handleMediaCardClick(entry.media, entry.docPath);
  }
});

// === PASS Event Listeners ===
btnVerifyCta.addEventListener('click', startCertification);
passModalClose.addEventListener('click', closePassModal);
btnPassEnter.addEventListener('click', enterBoard);
btnPassRetry.addEventListener('click', () => {
  closePassModal();
  startCertification();
});
passModal.addEventListener('click', (e) => {
  if (e.target === passModal) closePassModal();
});

// === Delete Post Button ===
if (btnDeletePost) {
  btnDeletePost.addEventListener('click', deletePost);
}

// === Search Event Listeners ===
if (searchInput) {
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      filterThreads(searchInput.value);
    }, 300);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      filterThreads('');
      searchInput.blur();
    }
  });
}

if (btnSearchClear) {
  btnSearchClear.addEventListener('click', () => {
    searchInput.value = '';
    filterThreads('');
    searchInput.focus();
  });
}

// === Infinite Scroll ===
window.addEventListener('scroll', () => {
  if (!pageList.classList.contains('hidden') && !searchQuery) {
    const scrollBottom = window.innerHeight + window.scrollY;
    const docHeight = document.documentElement.scrollHeight;

    if (scrollBottom >= docHeight - 200) {
      loadMoreThreads();
    }
  }
});

// === Init ===
setupProtections();

// Ensure anonymous auth for UID tracking, then load page
signInAnonymously(auth).catch(() => {}).finally(() => {
  if (checkAdultGate()) {
    showPage(pageList);
    loadThreads();
  } else {
    showPage(pageLanding);
  }
});
