import { useEffect } from 'react';
import OAuthPage from './OAuthPage';

function setQueryParamIfMissing(key: string, value: string) {
  const url = new URL(window.location.href);
  if (url.searchParams.has(key)) {
    return;
  }
  url.searchParams.set(key, value);
  window.history.replaceState({}, '', url.toString());
}

function AugratinOAuthWithHsAuthPage() {
  useEffect(() => {
    // Marker only (for future scope-control changes). No behavior change today.
    setQueryParamIfMissing('hsAuth', 'with');
  }, []);

  return <OAuthPage />;
}

export default AugratinOAuthWithHsAuthPage;

