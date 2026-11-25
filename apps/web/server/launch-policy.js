// Deferred modules remain implemented and stored; this release does not expose them.
export const LAUNCH_MODULES = Object.freeze({analysis:false,signals:false,community:false});
export function isLaunchPathEnabled(pathname) {
  const path=pathname.split(/[?#]/,1)[0];
  if(!LAUNCH_MODULES.analysis&&/^\/(?:app\/mapping(?:\/|$)|admin\/mapping(?:\/|$)|api\/(?:content|admin)\/analysis(?:\/|$))/.test(path))return false;
  if(!LAUNCH_MODULES.signals&&/^\/(?:app\/signals(?:\/|$)|admin\/signals(?:\/|$)|api\/(?:content|admin)\/signals(?:\/|$))/.test(path))return false;
  if(!LAUNCH_MODULES.community&&/^\/(?:app\/community(?:\/|$)|api\/community(?:\/|$))/.test(path))return false;
  return true;
}
