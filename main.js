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
  deleteField,
  query,
  orderBy,
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

// === DOM Refs ===
const pageLanding = document.getElementById('page-landing');
const pageList = document.getElementById('page-list');
const pageCreate = document.getElementById('page-create');
const pageDetail = document.getElementById('page-detail');

// PASS Modal DOM refs
const passModal = document.getElementById('pass-modal');
const passModalClose = document.getElementById('pass-modal-close');
const btnVerifyCta = document.getElementById('btn-verify-cta');
const passStep1 = document.getElementById('pass-step-1');
const passStep2 = document.getElementById('pass-step-2');
const passStep3 = document.getElementById('pass-step-3');
const passStep4 = document.getElementById('pass-step-4');
const passName = document.getElementById('pass-name');
const passPhone = document.getElementById('pass-phone');
const passBirth = document.getElementById('pass-birth');
const passAgreeCheck = document.getElementById('pass-agree-check');
const btnPassRequest = document.getElementById('btn-pass-request');
const passOtp = document.getElementById('pass-otp');
const passTimerValue = document.getElementById('pass-timer-value');
const btnPassVerify = document.getElementById('btn-pass-verify');
const btnPassResend = document.getElementById('btn-pass-resend');
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

// === State ===
let currentPostId = null;
let postMediaFile = null;
let commentMediaFile = null;
let viewerOpen = false;
let viewerTimerInterval = null;

// PASS state
let selectedCarrier = null;
let passTimerInterval = null;

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
  return div.innerHTML;
}

function showPage(page) {
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

// === Adult Gate ===
function checkAdultGate() {
  return localStorage.getItem('freethread_adult') === 'true';
}

function setAdultVerified() {
  localStorage.setItem('freethread_adult', 'true');
}

// === PASS Modal Functions ===
function openPassModal() {
  resetPassForm();
  passModal.classList.remove('hidden');
}

function closePassModal() {
  passModal.classList.add('hidden');
  clearPassTimer();
}

function showPassStep(stepNum) {
  [passStep1, passStep2, passStep3, passStep4].forEach(s => s.classList.add('hidden'));
  const target = [passStep1, passStep2, passStep3, passStep4][stepNum - 1];
  if (target) target.classList.remove('hidden');
}

function resetPassForm() {
  passName.value = '';
  passPhone.value = '';
  passBirth.value = '';
  passAgreeCheck.checked = false;
  passOtp.value = '';
  selectedCarrier = null;
  clearPassTimer();
  // Reset carrier selection
  document.querySelectorAll('.carrier-btn').forEach(b => b.classList.remove('selected'));
  // Show step 1
  showPassStep(1);
  // Reset step 4
  passProcessing.classList.remove('hidden');
  passResult.classList.add('hidden');
  passFailResult.classList.add('hidden');
  btnPassRequest.disabled = false;
}

function clearPassTimer() {
  if (passTimerInterval) {
    clearInterval(passTimerInterval);
    passTimerInterval = null;
  }
}

function startPassTimer() {
  clearPassTimer();
  let remaining = 180; // 3 minutes
  passTimerValue.textContent = '3:00';
  passTimerInterval = setInterval(() => {
    remaining--;
    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    passTimerValue.textContent = min + ':' + String(sec).padStart(2, '0');
    if (remaining <= 0) {
      clearPassTimer();
      passTimerValue.textContent = '시간 만료';
    }
  }, 1000);
}

function selectCarrier(carrier, btnEl) {
  selectedCarrier = carrier;
  document.querySelectorAll('.carrier-btn').forEach(b => b.classList.remove('selected'));
  btnEl.classList.add('selected');
  setTimeout(() => showPassStep(2), 200);
}

function requestOtp() {
  const name = passName.value.trim();
  const phone = passPhone.value.trim();
  const birth = passBirth.value.trim();

  if (!name) { alert('이름을 입력해주세요.'); return; }
  if (!/^\d{10,11}$/.test(phone)) { alert('올바른 전화번호를 입력해주세요.'); return; }
  if (!/^\d{6}$/.test(birth)) { alert('생년월일 6자리를 입력해주세요.'); return; }
  if (!passAgreeCheck.checked) { alert('약관에 동의해주세요.'); return; }

  // INTEGRATION POINT: 실제 PASS API (NICE/KG이니시스) 연동 시 여기에 OTP 요청 API 호출
  btnPassRequest.disabled = true;
  showPassStep(3);
  startPassTimer();
}

function simulateAgeCheck(birthdate6) {
  // Parse YYMMDD
  let year = parseInt(birthdate6.substring(0, 2));
  const month = parseInt(birthdate6.substring(2, 4));
  const day = parseInt(birthdate6.substring(4, 6));
  // 00~25 → 2000s, 26~99 → 1900s
  year = year <= 25 ? 2000 + year : 1900 + year;

  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 19;
}

async function verifyOtp() {
  const otp = passOtp.value.trim();
  if (!/^\d{6}$/.test(otp)) { alert('인증번호 6자리를 입력해주세요.'); return; }

  clearPassTimer();

  // Show processing
  showPassStep(4);
  passProcessing.classList.remove('hidden');
  passResult.classList.add('hidden');
  passFailResult.classList.add('hidden');

  // INTEGRATION POINT: 실제 PASS API 연동 시 여기에 OTP 검증 API 호출
  // 시뮬레이션: 1.5초 후 결과 표시
  const birthVal = passBirth.value.trim();

  setTimeout(async () => {
    const isAdult = simulateAgeCheck(birthVal);

    // 폼 데이터 완전 폐기 (서버 전송 없음)
    passName.value = '';
    passPhone.value = '';
    passBirth.value = '';
    passOtp.value = '';
    passAgreeCheck.checked = false;

    passProcessing.classList.add('hidden');

    if (isAdult) {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        // Anonymous auth 실패해도 게이트는 통과 허용
      }
      setAdultVerified();
      passResult.classList.remove('hidden');
      passResultText.textContent = '성인인증이 완료되었습니다';
    } else {
      passFailResult.classList.remove('hidden');
      passFailText.textContent = '만 19세 미만은 이용할 수 없습니다';
    }
  }, 1500);
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

// === Media Upload ===
async function uploadMedia(file) {
  const path = 'media/' + Date.now() + '_' + Math.random().toString(36).slice(2);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
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

  // Update info
  updateViewerInfo(media);

  // Start countdown timer for time-based
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
  // Check expiry
  const expired = await checkAndDestroyIfExpired(media, docPath);
  if (expired) {
    alert('이미 파괴된 미디어입니다.');
    if (currentPostId) loadDetail(currentPostId);
    return;
  }

  // Increment view count for view-based
  if (media.destructType === 'views') {
    const docRef = typeof docPath === 'string' ? doc(db, docPath) : docPath;
    await updateDoc(docRef, { 'media.viewCount': increment(1) });
    media.viewCount = (media.viewCount || 0) + 1;

    // Check if this view exhausts the limit
    if (media.viewCount >= media.maxViews) {
      // Show one last time, then destroy
      openViewer(media.url, media.type, media, docPath);
      return;
    }
  }

  openViewer(media.url, media.type, media, docPath);
}

// === Thread List ===
async function loadThreads() {
  threadListEl.innerHTML = '<div class="loading-msg">불러오는 중...</div>';
  try {
    const q = query(collection(db, 'posts'), orderBy('lastActivityAt', 'desc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      threadListEl.innerHTML = '<div class="empty-msg">아직 스레드가 없습니다. 첫 번째 스레드를 작성해보세요!</div>';
      return;
    }

    threadListEl.innerHTML = snapshot.docs.map(docSnap => {
      const post = docSnap.data();
      const hasMedia = post.media && !isMediaExpired(post.media);
      return `
        <div class="thread-item" data-id="${docSnap.id}">
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

    // Auto-cleanup expired media
    snapshot.docs.forEach(docSnap => {
      const post = docSnap.data();
      if (post.media) checkAndDestroyIfExpired(post.media, 'posts/' + docSnap.id);
    });
  } catch (err) {
    threadListEl.innerHTML = '<div class="empty-msg">데이터를 불러올 수 없습니다.</div>';
  }
}

// === Thread Detail ===
let detailMediaData = null;
let detailMediaDocPath = null;

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

  try {
    const postRef = doc(db, 'posts', postId);
    const commentsQuery = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc')
    );

    const [postSnap, commentsSnap] = await Promise.all([
      getDoc(postRef),
      getDocs(commentsQuery),
    ]);

    if (!postSnap.exists()) {
      detailTitle.textContent = '삭제된 게시글';
      detailContent.textContent = '존재하지 않는 게시글입니다.';
      return;
    }

    const post = postSnap.data();
    detailTitle.textContent = post.title;
    detailContent.textContent = post.content;
    detailTime.textContent = timeAgo(post.createdAt) + ' 전';
    detailCommentCount.textContent = post.commentCount || commentsSnap.size;

    // Show media card if present
    if (post.media) {
      detailMediaData = post.media;
      detailMediaDocPath = 'posts/' + postId;
      detailMediaSlot.innerHTML = mediaCardHtml(post.media, 'post');
      // Auto-cleanup if expired
      checkAndDestroyIfExpired(post.media, detailMediaDocPath);
    }

    const commentsData = commentsSnap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));
    renderComments(commentsData, postId);
  } catch (err) {
    detailTitle.textContent = '오류 발생';
    detailContent.textContent = '게시글을 불러올 수 없습니다.';
  }
}

// Store comment media data for click handling
let commentMediaMap = {};
let allComments = [];
let allCommentsPostId = null;

function renderCommentItems(comments, postId) {
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
    return `
      <div class="comment-item">
        <div class="comment-content">${escapeHtml(c.content)}</div>
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

  if (comments.length > 10) {
    const last10 = comments.slice(-10);
    const hiddenCount = comments.length - 10;
    commentListEl.innerHTML =
      `<button class="btn-show-all-comments" id="btn-show-all">정주행 (${hiddenCount}개 더 보기)</button>` +
      renderCommentItems(last10, postId);
  } else {
    commentListEl.innerHTML = renderCommentItems(comments, postId);
  }
}

function showAllComments() {
  if (!allComments.length) return;
  commentMediaMap = {};
  commentListEl.innerHTML = renderCommentItems(allComments, allCommentsPostId);
  commentListEl.firstElementChild?.scrollIntoView({ behavior: 'smooth' });
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
  btnSubmitPost.textContent = postMediaFile ? '업로드 중...' : '등록 중...';

  try {
    const postData = {
      title,
      content,
      commentCount: 0,
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
    alert('작성에 실패했습니다. 다시 시도해주세요.');
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

  // 댓글 100개 제한
  const currentCount = parseInt(detailCommentCount.textContent) || 0;
  if (currentCount >= 100) {
    alert('댓글은 최대 100개까지 작성할 수 있습니다.');
    return;
  }

  btnSendComment.disabled = true;

  try {
    const commentData = {
      content: content || '',
      createdAt: serverTimestamp(),
    };

    // Upload media if attached
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

    // Reload comments
    const commentsSnap = await getDocs(
      query(
        collection(db, 'posts', currentPostId, 'comments'),
        orderBy('createdAt', 'asc')
      )
    );
    const comments = commentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    detailCommentCount.textContent = commentsSnap.size;
    renderComments(comments, currentPostId);

    commentListEl.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    alert('댓글 작성에 실패했습니다.');
  } finally {
    btnSendComment.disabled = false;
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

// === Anti-Screenshot Protections ===
function setupProtections() {
  // Prevent context menu when viewer is open
  document.addEventListener('contextmenu', e => {
    if (viewerOpen) e.preventDefault();
  });

  // Block keyboard shortcuts
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

  // Blur on visibility change (tab switch, screenshot tools)
  document.addEventListener('visibilitychange', () => {
    if (viewerOpen && document.hidden) {
      viewerBody.classList.add('viewer-blurred');
    }
  });

  // Blur on window blur
  window.addEventListener('blur', () => {
    if (viewerOpen) {
      viewerBody.classList.add('viewer-blurred');
    }
  });

  // Unblur on focus return
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
  commentMediaFile = file;
  showThumbPreview(file, commentMediaThumb);
  commentMediaPreview.classList.remove('hidden');
});
btnRemoveCommentMedia.addEventListener('click', clearCommentMedia);

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
btnVerifyCta.addEventListener('click', openPassModal);
passModalClose.addEventListener('click', closePassModal);

// Carrier selection
document.querySelectorAll('.carrier-btn').forEach(btn => {
  btn.addEventListener('click', () => selectCarrier(btn.dataset.carrier, btn));
});

btnPassRequest.addEventListener('click', requestOtp);
btnPassVerify.addEventListener('click', verifyOtp);
btnPassResend.addEventListener('click', () => {
  showPassStep(2);
  btnPassRequest.disabled = false;
});
btnPassEnter.addEventListener('click', enterBoard);
btnPassRetry.addEventListener('click', () => {
  resetPassForm();
});

// Close modal on backdrop click
passModal.addEventListener('click', (e) => {
  if (e.target === passModal) closePassModal();
});

// === Init ===
setupProtections();
if (checkAdultGate()) {
  showPage(pageList);
  loadThreads();
} else {
  showPage(pageLanding);
}
