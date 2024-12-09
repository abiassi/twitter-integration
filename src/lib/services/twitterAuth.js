const TWITTER_AUTH_STATE = {
  CODE_VERIFIER: 'twitter_code_verifier',
  STATE: 'twitter_state',
  PENDING: 'twitter_auth_pending',
  USER_DATA: 'twitter_user_data'
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://4802-2001-8a0-6a58-800-e532-a227-f37f-8192.ngrok-free.app';

export async function initiateTwitterAuth() {
  try {
    console.log('Initiating Twitter auth...');
    clearTwitterAuthState();
    
    const response = await fetch(`${BACKEND_URL}/api/twitter/connect/twitter`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Auth data received:', {
      hasUrl: Boolean(data.url),
      hasCodeVerifier: Boolean(data.codeVerifier),
      hasState: Boolean(data.state)
    });

    if (!data.url || !data.codeVerifier || !data.state) {
      throw new Error('Missing required OAuth parameters');
    }
    
    // Store auth state
    sessionStorage.setItem(TWITTER_AUTH_STATE.CODE_VERIFIER, data.codeVerifier);
    sessionStorage.setItem(TWITTER_AUTH_STATE.STATE, data.state);
    sessionStorage.setItem(TWITTER_AUTH_STATE.PENDING, 'true');
    
    // Redirect to Twitter
    window.location.href = data.url;
  } catch (error) {
    console.error('Twitter auth initiation failed:', error);
    clearTwitterAuthState();
    throw error;
  }
}

export async function handleTwitterCallback(params) {
  console.log('Handling Twitter callback with params:', {
    hasCode: params.has('code'),
    hasState: params.has('state'),
    hasError: params.has('error'),
    storedCodeVerifier: Boolean(sessionStorage.getItem(TWITTER_AUTH_STATE.CODE_VERIFIER)),
    storedState: Boolean(sessionStorage.getItem(TWITTER_AUTH_STATE.STATE)),
    isPending: Boolean(sessionStorage.getItem(TWITTER_AUTH_STATE.PENDING))
  });

  // Check for errors first
  if (params.has('error')) {
    const error = params.get('error');
    console.error('Auth error from Twitter:', error);
    clearTwitterAuthState();
    throw new Error(`Twitter authentication error: ${error}`);
  }

  // Handle successful auth
  if (params.has('code')) {
    const code = params.get('code');
    const state = params.get('state');
    const codeVerifier = sessionStorage.getItem(TWITTER_AUTH_STATE.CODE_VERIFIER);
    const storedState = sessionStorage.getItem(TWITTER_AUTH_STATE.STATE);
    const isPending = sessionStorage.getItem(TWITTER_AUTH_STATE.PENDING);

    console.log('Validating OAuth parameters:', {
      codeLength: code?.length,
      verifierLength: codeVerifier?.length,
      stateMatch: state === storedState,
      isPending
    });

    if (!code || !state || !codeVerifier || !storedState || !isPending) {
      clearTwitterAuthState();
      throw new Error('Missing required OAuth parameters');
    }

    if (state !== storedState) {
      clearTwitterAuthState();
      throw new Error('Invalid state parameter');
    }

    try {
      const callbackUrl = new URL(`${BACKEND_URL}/api/twitter/callback/twitter`);
      callbackUrl.searchParams.append('code', code);
      // Ensure we're using the correct parameter name
      callbackUrl.searchParams.append('code_verifier', codeVerifier);
      callbackUrl.searchParams.append('state', state);

      console.log('Making callback request with params:', {
        code: code,
        codeVerifierLength: codeVerifier?.length,
        state: state,
        fullUrl: callbackUrl.toString()
      });

      const response = await fetch(callbackUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Callback request failed:', {
          status: response.status,
          statusText: response.statusText,
          responseText: errorText
        });
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const userData = await response.json();
      console.log('Received user data:', {
        hasAccessToken: Boolean(userData.access_token),
        hasRefreshToken: Boolean(userData.refresh_token),
        hasUserId: Boolean(userData.user_id),
        username: userData.username
      });

      // Store user data
      if (userData.access_token && userData.user_id) {
        localStorage.setItem(TWITTER_AUTH_STATE.USER_DATA, JSON.stringify({
          accessToken: userData.access_token,
          refreshToken: userData.refresh_token,
          userId: userData.user_id,
          username: userData.username
        }));
      }

      return userData;
    } catch (error) {
      console.error('Callback request failed:', error);
      throw error;
    }
  }

  // Handle access token in URL (direct response)
  if (params.has('access_token')) {
    const userData = {
      access_token: params.get('access_token'),
      refresh_token: params.get('refresh_token'),
      user_id: params.get('user_id'),
      username: params.get('username')
    };

    if (userData.access_token && userData.user_id) {
      localStorage.setItem(TWITTER_AUTH_STATE.USER_DATA, JSON.stringify({
        accessToken: userData.access_token,
        refreshToken: userData.refresh_token,
        userId: userData.user_id,
        username: userData.username
      }));
    }

    return userData;
  }

  return null;
}

export function getStoredUserData() {
  const data = localStorage.getItem(TWITTER_AUTH_STATE.USER_DATA);
  return data ? JSON.parse(data) : null;
}

export function clearTwitterAuthState() {
  sessionStorage.removeItem(TWITTER_AUTH_STATE.CODE_VERIFIER);
  sessionStorage.removeItem(TWITTER_AUTH_STATE.STATE);
  sessionStorage.removeItem(TWITTER_AUTH_STATE.PENDING);
}
