// === PortOne 본인인증 검증 + CI 차단 우회 방지 (Pages Function) ===

const FIREBASE_PROJECT_ID = 'sungpan2026';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// SHA-256 해시
async function hashCI(ci) {
  const data = new TextEncoder().encode(ci);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Firebase Auth 토큰 검증
function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

async function verifyFirebaseToken(idToken) {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');

  const header = JSON.parse(base64urlDecode(parts[0]));
  const payload = JSON.parse(base64urlDecode(parts[1]));

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) throw new Error('Token expired');
  if (payload.aud !== FIREBASE_PROJECT_ID) throw new Error('Invalid audience');
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) throw new Error('Invalid issuer');
  if (!payload.sub) throw new Error('No subject');

  const jwkRes = await fetch(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
  );
  const jwkData = await jwkRes.json();
  const jwk = jwkData.keys.find(k => k.kid === header.kid);
  if (!jwk) throw new Error('Key not found');

  const key = await crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['verify']
  );

  const signatureStr = base64urlDecode(parts[2]);
  const signature = new Uint8Array(signatureStr.length);
  for (let i = 0; i < signatureStr.length; i++) signature[i] = signatureStr.charCodeAt(i);

  const data = new TextEncoder().encode(parts[0] + '.' + parts[1]);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data);
  if (!valid) throw new Error('Invalid signature');

  return payload.sub;
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Firebase Auth 토큰 검증 → UID 획득
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  let uid;
  try {
    uid = await verifyFirebaseToken(authHeader.slice(7));
  } catch (e) {
    return jsonResponse({ error: 'Invalid token' }, 401);
  }

  // 2. imp_uid 확인
  const { imp_uid } = await request.json();
  if (!imp_uid) return jsonResponse({ error: 'Missing imp_uid' }, 400);

  try {
    // 3. PortOne 액세스 토큰 획득
    const tokenRes = await fetch('https://api.iamport.kr/users/getToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imp_key: env.PORTONE_API_KEY,
        imp_secret: env.PORTONE_API_SECRET,
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.code !== 0) {
      return jsonResponse({ error: 'Token error' }, 500);
    }
    const accessToken = tokenData.response.access_token;

    // 4. 인증 결과 조회
    const certRes = await fetch(`https://api.iamport.kr/certifications/${imp_uid}`, {
      headers: { 'Authorization': accessToken },
    });
    const certData = await certRes.json();
    if (certData.code !== 0) {
      return jsonResponse({ verified: false, message: '인증 정보를 확인할 수 없습니다.' });
    }

    const cert = certData.response;

    // 5. 만 19세 확인
    const birthday = new Date(cert.birthday);
    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    const monthDiff = today.getMonth() - birthday.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
      age--;
    }

    if (age < 19) {
      // 개인정보 즉시 폐기
      await fetch(`https://api.iamport.kr/certifications/${imp_uid}`, {
        method: 'DELETE',
        headers: { 'Authorization': accessToken },
      });
      return jsonResponse({ verified: false, message: '만 19세 미만은 이용할 수 없습니다.' });
    }

    // 6. CI 해시 생성 및 차단 여부 확인
    const ciHash = await hashCI(cert.unique_key); // unique_key = CI

    const ciBan = await env.SANCTIONS.get(`ci_ban:${ciHash}`, 'json');
    if (ciBan) {
      // 개인정보 즉시 폐기
      await fetch(`https://api.iamport.kr/certifications/${imp_uid}`, {
        method: 'DELETE',
        headers: { 'Authorization': accessToken },
      });
      return jsonResponse({ verified: false, message: '영구차단된 사용자입니다. 이용이 제한됩니다.' });
    }

    // 7. UID ↔ CI 해시 매핑 저장
    await env.SANCTIONS.put(`uid_ci:${uid}`, ciHash);

    // 8. 개인정보 즉시 폐기 (CI 해시만 보관, 원본 CI/이름/전화번호 등 삭제)
    await fetch(`https://api.iamport.kr/certifications/${imp_uid}`, {
      method: 'DELETE',
      headers: { 'Authorization': accessToken },
    });

    return jsonResponse({ verified: true });

  } catch (e) {
    return jsonResponse({ error: 'Server error' }, 500);
  }
}
