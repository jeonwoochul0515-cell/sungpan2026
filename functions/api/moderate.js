// === Moderation System Prompt ===
const SYSTEM_PROMPT = `당신은 익명 게시판의 콘텐츠 검열 시스템입니다.
사용자가 작성한 텍스트를 분석하여 다음 6가지 위반 유형을 감지하세요.

## 위반 유형
1. **지인 언급** (acquaintance): 실명, 별명, 이니셜+맥락 등으로 특정인을 식별할 수 있는 언급. 단, 공인/연예인/정치인 등 공적 인물은 제외.
2. **욕설** (profanity): 한국어 비속어, 초성 욕설(ㅅㅂ, ㅈㄹ 등), 숫자/특수문자 치환(시1발, ㅆ1 등), 외국어 욕설의 한국어 음차.
3. **불법 콘텐츠** (illegal): 약물 거래/구매 정보, 불법 도박 사이트 홍보, 해킹/크래킹 도구 공유, 불법 무기 거래.
4. **도촬/몰카** (voyeurism): 몰래촬영물 공유/요청/제작 방법, 불법촬영 관련 모든 언급.
5. **타인사진 공유** (unauthorized_photo): 동의 없는 타인 사진 공유, 요청, 유포. "~사진 있음", "~사진 올려줘" 등.
6. **넷카마** (catfish): 성별을 사칭하는 행위. "나 여자인데", "오빠~" 등 맥락상 성별 사칭이 명확한 경우.

## 판단 기준
- 문맥을 고려하여 판단하세요. 단순 단어 매칭이 아닌 의미 기반 분석을 수행하세요.
- 위반이 아닌 경우: 일반적인 대화, 질문, 정보 공유, 공인 언급, 가벼운 감탄사.
- 위반인 경우: 특정인 식별 가능한 정보, 명백한 욕설/비하, 불법 행위 조장, 사생활 침해.
- 애매한 경우에는 위반이 아닌 것으로 판단하세요 (사용자 자유 우선).

## 응답 형식
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트를 포함하지 마세요.
{"violation": false}
또는
{"violation": true, "type": "위반유형", "reason": "한국어로 간단한 사유"}`;

const FIREBASE_PROJECT_ID = 'sungpan2026';

// === Sanction Tiers ===
const SANCTION_TIERS = [
  { action: 'warning', message: '경고: 커뮤니티 규칙 위반이 감지되었습니다.' },
  { action: 'warning', message: '2차 경고: 추가 위반 시 임시차단됩니다.' },
  { action: 'temp_ban', duration: 24 * 60 * 60 * 1000, message: '3회 위반으로 24시간 임시차단되었습니다.' },
  { action: 'temp_ban', duration: 7 * 24 * 60 * 60 * 1000, message: '4회 위반으로 7일 임시차단되었습니다.' },
  { action: 'permanent_ban', message: '5회 이상 위반으로 영구차단되었습니다.' },
];

function getSanctionTier(count) {
  return SANCTION_TIERS[Math.min(count - 1, SANCTION_TIERS.length - 1)];
}

// === Firebase Auth Token Verification ===
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

// === Helpers ===
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// === Pages Function Handlers ===
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

  // 1. Verify Firebase Auth token
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

  // 2. Validate input
  const { text, type } = await request.json();
  if (!text || typeof text !== 'string') return jsonResponse({ error: 'Invalid text' }, 400);
  if (!['post', 'comment'].includes(type)) return jsonResponse({ error: 'Invalid type' }, 400);

  // 3. Check ban status (Cloudflare KV)
  try {
    const sanctionKey = `sanctions:${uid}`;
    const stored = await env.SANCTIONS.get(sanctionKey, 'json');

    if (stored) {
      if (stored.permanently_banned) {
        return jsonResponse({
          allowed: false, blocked: true,
          message: '영구차단된 사용자입니다. 게시판 이용이 제한됩니다.',
        });
      }
      if (stored.banned_until && Date.now() < new Date(stored.banned_until).getTime()) {
        const remaining = new Date(stored.banned_until).getTime() - Date.now();
        const hours = Math.ceil(remaining / (1000 * 60 * 60));
        const displayTime = hours >= 24 ? Math.ceil(hours / 24) + '일' : hours + '시간';
        return jsonResponse({
          allowed: false, blocked: true,
          message: `임시차단 중입니다. 약 ${displayTime} 후에 이용 가능합니다.`,
        });
      }
    }

    // 4. Call Claude API for moderation
    let moderationResult;
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 200,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: text.substring(0, 2000) }],
        }),
      });
      const data = await res.json();
      moderationResult = JSON.parse(data.content[0].text.trim());
    } catch (e) {
      return jsonResponse({ allowed: true });
    }

    // 5. No violation → allow
    if (!moderationResult.violation) {
      return jsonResponse({ allowed: true });
    }

    // 6. Violation → apply sanctions
    const currentCount = stored?.violation_count || 0;
    const newCount = currentCount + 1;
    const tier = getSanctionTier(newCount);

    const violations = stored?.violations || [];
    violations.push({
      type: moderationResult.type,
      reason: moderationResult.reason,
      content_type: type,
      text_snippet: text.substring(0, 100),
      timestamp: new Date().toISOString(),
    });

    const sanctionData = {
      violation_count: newCount,
      last_violation: new Date().toISOString(),
      permanently_banned: tier.action === 'permanent_ban',
      banned_until: tier.action === 'temp_ban'
        ? new Date(Date.now() + tier.duration).toISOString()
        : null,
      violations,
    };

    await env.SANCTIONS.put(sanctionKey, JSON.stringify(sanctionData));

    return jsonResponse({
      allowed: false,
      blocked: tier.action !== 'warning',
      warning: tier.action === 'warning',
      message: tier.message + '\n사유: ' + moderationResult.reason,
    });

  } catch (e) {
    return jsonResponse({ allowed: true });
  }
}
